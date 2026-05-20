import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { OperatorStatus, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';

export type OperatorListScope = { operatorId?: string };

@Injectable()
export class TenantScopeService {
  constructor(private readonly prismaService: PrismaService) {}

  isPlatformAdmin(user: AuthenticatedUser): boolean {
    return user.role === UserRole.ADMIN;
  }

  resolveListScope(user: AuthenticatedUser): OperatorListScope {
    if (this.isPlatformAdmin(user)) {
      return {};
    }
    this.requireOperatorContext(user);
    return { operatorId: user.operatorId! };
  }

  resolveScopedOperatorId(user: AuthenticatedUser): string | undefined {
    if (this.isPlatformAdmin(user)) {
      return undefined;
    }
    this.requireOperatorContext(user);
    return user.operatorId!;
  }

  resolveCreateOperatorId(
    user: AuthenticatedUser,
    dtoOperatorId?: string,
  ): string {
    if (this.isPlatformAdmin(user)) {
      if (!dtoOperatorId?.trim()) {
        throw new BadRequestException('operatorId is required for this action');
      }
      return dtoOperatorId.trim();
    }

    if (dtoOperatorId && dtoOperatorId !== user.operatorId) {
      throw new ForbiddenException('Cannot assign resources to another operator');
    }

    this.requireOperatorContext(user);
    return user.operatorId!;
  }

  assertResourceOwnership(
    user: AuthenticatedUser,
    resourceOperatorId: string,
  ): void {
    if (this.isPlatformAdmin(user)) {
      return;
    }

    this.requireOperatorContext(user);

    if (resourceOperatorId !== user.operatorId) {
      throw new ForbiddenException(
        'You do not have access to this operator resource',
      );
    }
  }

  requireOperatorContext(user: AuthenticatedUser): void {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role !== UserRole.OPERATOR && user.role !== UserRole.STAFF) {
      throw new ForbiddenException('Invalid dashboard role');
    }

    if (!user.operatorId) {
      throw new ForbiddenException('Operator context is required');
    }
  }

  async assertOperatorActive(operatorId: string): Promise<void> {
    const operator = await this.prismaService.operator.findUnique({
      where: { id: operatorId },
      select: { status: true },
    });

    if (!operator) {
      throw new ForbiddenException('Operator not found');
    }

    if (operator.status === OperatorStatus.SUSPENDED) {
      throw new ForbiddenException('Operator account is suspended');
    }
  }
}
