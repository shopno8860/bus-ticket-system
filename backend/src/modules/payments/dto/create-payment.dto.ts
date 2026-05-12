import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    example: '7c2e9a3f-3d51-4d3c-92b6-4bbf9b8f1d2a',
  })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({
    example: 'SSLCOMMERZ',
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}
