import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchTripsDto {
  @ApiPropertyOptional({
    example: 'Dhaka',
  })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({
    example: 'Chattogram',
  })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({
    example: '2026-05-13',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    example: 'AC',
  })
  @IsOptional()
  @IsString()
  busType?: string;

  @ApiPropertyOptional({
    example: 'BUSINESS',
  })
  @IsOptional()
  @IsString()
  busClass?: string;

  @ApiPropertyOptional({
    example: 'Gabtoli Bus Terminal',
  })
  @IsOptional()
  @IsString()
  boardingPoint?: string;

  @ApiPropertyOptional({
    example: 'Dampara Bus Stand',
  })
  @IsOptional()
  @IsString()
  droppingPoint?: string;

  @ApiPropertyOptional({
    example: '500',
  })
  @IsOptional()
  @IsString()
  minPrice?: string;

  @ApiPropertyOptional({
    example: '1500',
  })
  @IsOptional()
  @IsString()
  maxPrice?: string;
}
