import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminPaymentsFilterDto {
  @ApiPropertyOptional({
    example: 'PAID',
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({
    example: 'SSLCOMMERZ',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  // Backward compatibility for typo in older clients.
  @ApiPropertyOptional({
    example: 'SSLCOMMERZ',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  methos?: PaymentMethod;

  @ApiPropertyOptional({
    example: '2026-05-13',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
