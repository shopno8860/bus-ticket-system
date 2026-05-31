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

  resolveEffectiveOperatorId(
    user: AuthenticatedUser,
    requestedOperatorId?: string,
  ): string | undefined {
    if (this.isPlatformAdmin(user)) {
      const trimmed = requestedOperatorId?.trim();
      return trimmed || undefined;
    }

    this.requireOperatorContext(user);
    const jwtOperatorId = user.operatorId!;

    if (
      requestedOperatorId?.trim() &&
      requestedOperatorId.trim() !== jwtOperatorId
    ) {
      throw new ForbiddenException('Cannot access another operator context');
    }

    return jwtOperatorId;
  }

  resolveRequiredOperatorId(
    user: AuthenticatedUser,
    requestedOperatorId?: string,
  ): string {
    const effective = this.resolveEffectiveOperatorId(
      user,
      requestedOperatorId,
    );

    if (this.isPlatformAdmin(user)) {
      if (!effective) {
        throw new BadRequestException('operatorId is required for this action');
      }
      return effective;
    }

    return effective!;
  }

  resolveListScope(
    user: AuthenticatedUser,
    requestedOperatorId?: string,
  ): OperatorListScope {
    const operatorId = this.resolveEffectiveOperatorId(
      user,
      requestedOperatorId,
    );
    if (operatorId) {
      return { operatorId };
    }
    return {};
  }

  resolveScopedOperatorId(
    user: AuthenticatedUser,
    requestedOperatorId?: string,
  ): string | undefined {
    return this.resolveEffectiveOperatorId(user, requestedOperatorId);
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
      throw new ForbiddenException(
        'Cannot assign resources to another operator',
      );
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
