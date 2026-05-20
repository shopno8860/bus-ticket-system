import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: UserRole;
  operatorId?: string | null;
}
