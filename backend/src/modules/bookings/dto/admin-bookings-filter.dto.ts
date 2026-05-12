import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminBookingsFilterDto {
  @ApiPropertyOptional({
    example: '2026-05-13',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    example: 'Dhaka-Chattogram',
  })
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional({
    example: 'rakesh@gmail.com',
  })
  @IsOptional()
  @IsString()
  user?: string;
}
