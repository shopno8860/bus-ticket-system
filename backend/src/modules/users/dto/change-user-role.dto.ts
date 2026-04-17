import { UserRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ChangeUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
