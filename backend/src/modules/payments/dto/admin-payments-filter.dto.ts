import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class AdminPaymentsFilterDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  // Backward compatibility for typo in older clients.
  @IsOptional()
  @IsEnum(PaymentMethod)
  methos?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  date?: string;
}
