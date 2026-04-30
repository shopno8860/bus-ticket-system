import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogService implements OnModuleInit {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id TEXT PRIMARY KEY,
        actor_user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT,
        payload JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  }

  async logAction(params: {
    actorUserId: string;
    action: string;
    targetType: string;
    targetId?: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prismaService.$executeRaw(
        Prisma.sql`
          INSERT INTO admin_audit_logs (id, actor_user_id, action, target_type, target_id, payload)
          VALUES (${randomUUID()}, ${params.actorUserId}, ${params.action}, ${params.targetType}, ${params.targetId ?? null}, ${JSON.stringify(params.payload ?? {})}::jsonb)
        `,
      );
    } catch (error) {
      this.logger.error(`Failed to persist admin audit log: ${String(error)}`);
    }
  }
}
