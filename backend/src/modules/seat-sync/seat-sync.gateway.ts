import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { TripsService } from '../trips/trips.service';
import {
  buildSeatsUpdatedPayload,
  SEAT_SYNC_NAMESPACE,
  tripRoom,
} from './seat-sync.types';

type SeatSyncSocket = Socket & {
  user?: AuthenticatedUser | null;
};

@WebSocketGateway({
  namespace: SEAT_SYNC_NAMESPACE,
  cors: {
    origin: true,
    credentials: true,
  },
})
export class SeatSyncGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SeatSyncGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly tripsService: TripsService,
  ) {}

  async handleConnection(client: SeatSyncSocket) {
    const token = this.extractToken(client);
    if (!token) {
      client.user = null;
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(
        token,
        {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        },
      );
      client.user = await this.validateUser(payload);
    } catch {
      client.user = null;
      this.logger.debug(`WS auth failed for socket ${client.id}`);
    }
  }

  handleDisconnect(_client: SeatSyncSocket) {
    // rooms cleaned up automatically
  }

  @SubscribeMessage('joinTrip')
  async handleJoinTrip(
    @ConnectedSocket() client: SeatSyncSocket,
    @MessageBody() body: { tripId?: string },
  ) {
    const tripId = body?.tripId?.trim();
    if (!tripId) {
      return { ok: false, error: 'tripId required' };
    }

    const allowed = await this.canJoinTrip(client, tripId);
    if (!allowed) {
      return { ok: false, error: 'Not allowed to join this trip' };
    }

    await client.join(tripRoom(tripId));

    try {
      const bookingSeats =
        await this.tripsService.getActiveBookingSeatsForTrip(tripId);
      client.emit(
        'seats.updated',
        buildSeatsUpdatedPayload(tripId, bookingSeats),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send initial seat snapshot for trip ${tripId}: ${String(error)}`,
      );
    }

    return { ok: true, tripId };
  }

  @SubscribeMessage('leaveTrip')
  async handleLeaveTrip(
    @ConnectedSocket() client: SeatSyncSocket,
    @MessageBody() body: { tripId?: string },
  ) {
    const tripId = body?.tripId?.trim();
    if (!tripId) {
      return { ok: false };
    }
    await client.leave(tripRoom(tripId));
    return { ok: true };
  }

  private extractToken(client: SeatSyncSocket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }

    return null;
  }

  private async validateUser(
    payload: AuthenticatedUser,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, operatorId: true },
    });

    if (!user) {
      return null;
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      operatorId: user.operatorId,
    };
  }

  private async canJoinTrip(
    client: SeatSyncSocket,
    tripId: string,
  ): Promise<boolean> {
    const trip = await this.prismaService.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        operatorId: true,
        operator: { select: { status: true } },
      },
    });

    if (!trip) {
      return false;
    }

    if (trip.operator.status === 'SUSPENDED') {
      return false;
    }

    const user = client.user;
    if (!user) {
      return true;
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }

    if (user.role === UserRole.OPERATOR || user.role === UserRole.STAFF) {
      return user.operatorId === trip.operatorId;
    }

    return user.role === UserRole.USER;
  }
}
