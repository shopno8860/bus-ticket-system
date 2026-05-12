import { UserRole } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeUserRoleDto {
  @ApiProperty({
    example: 'ADMIN',
  })
  @IsEnum(UserRole)
  role: UserRole;
}
