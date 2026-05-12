import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminTripsFilterDto {
  @ApiPropertyOptional({
    example: '1',
  })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({
    example: '20',
  })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({
    example: 'Dhaka-Chattogram',
  })
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional({
    example: '2026-05-13',
  })
  @IsOptional()
  @IsDateString()
  departureDate?: string;

  @ApiPropertyOptional({
    example: 'Green Line Paribahan',
  })
  @IsOptional()
  @IsString()
  busOperator?: string;

  @ApiPropertyOptional({
    example: 'SCHEDULED',
  })
  @IsOptional()
  @IsString()
  status?: string;
}
