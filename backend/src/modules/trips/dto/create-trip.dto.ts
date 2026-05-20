import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTripDto {
  @ApiProperty({
    example: '9d3c6e7a-2ef5-4f08-a0f2-1c2a3b4c5d6e',
  })
  @IsString()
  @IsNotEmpty()
  busId: string;

  @ApiProperty({
    example: '1a2b3c4d-5e6f-4a3b-9c8d-7e6f5a4b3c2d',
  })
  @IsString()
  @IsNotEmpty()
  routeId: string;

  @ApiProperty({
    example: '2026-05-13T09:30:00.000Z',
  })
  @IsDateString()
  departureTime: string;

  @ApiProperty({
    example: '2026-05-13T15:45:00.000Z',
  })
  @IsDateString()
  arrivalTime: string;

  @ApiProperty({
    example: 850.0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Required when platform admin creates a trip',
  })
  @IsOptional()
  @IsString()
  operatorId?: string;
}
