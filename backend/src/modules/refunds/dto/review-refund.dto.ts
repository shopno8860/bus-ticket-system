import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewRefundDto {
  @ApiPropertyOptional({
    example: 'Approved after verifying payment and cancellation policy.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  adminNote?: string;
}
