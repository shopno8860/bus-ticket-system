import { RefundStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminRefundsFilterDto {
  @ApiPropertyOptional({
    example: 'PENDING',
  })
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @ApiPropertyOptional({
    example: '2026-05-13',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Filter refunds by operator (platform admin)',
  })
  @IsOptional()
  @IsString()
  operatorId?: string;
}
