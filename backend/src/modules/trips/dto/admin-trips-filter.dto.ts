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
    description: 'Filter by route id (preferred for dashboard dropdowns)',
    example: 'clxyz123routeid',
  })
  @IsOptional()
  @IsString()
  routeId?: string;

  @ApiPropertyOptional({
    example: 'Dhaka',
    description:
      'Free-text route search (origin/destination). Also accepts a route id for backward compatibility.',
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

  @ApiPropertyOptional({
    description: 'Filter trips by operator (platform admin)',
  })
  @IsOptional()
  @IsString()
  operatorId?: string;
}
