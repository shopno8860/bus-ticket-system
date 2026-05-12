import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTripDto {
  @ApiPropertyOptional({
    example: '9d3c6e7a-2ef5-4f08-a0f2-1c2a3b4c5d6e',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  busId?: string;

  @ApiPropertyOptional({
    example: '1a2b3c4d-5e6f-4a3b-9c8d-7e6f5a4b3c2d',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  routeId?: string;

  @ApiPropertyOptional({
    example: '2026-05-13T09:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  departureTime?: string;

  @ApiPropertyOptional({
    example: '2026-05-13T15:45:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  arrivalTime?: string;

  @ApiPropertyOptional({
    example: 850.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;
}
