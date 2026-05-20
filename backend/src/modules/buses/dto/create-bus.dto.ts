import { BusClass, BusType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBusDto {
  @ApiProperty({
    example: 'Green Line Coach',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'DHAKA-METRO-BA-1234',
  })
  @IsString()
  @IsNotEmpty()
  registrationNumber: string;

  @ApiProperty({
    example: 40,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatCapacity: number;

  @ApiProperty({
    example: 'AC',
  })
  @IsEnum(BusType)
  busType: BusType;

  @ApiProperty({
    example: 'BUSINESS',
  })
  @IsEnum(BusClass)
  busClass: BusClass;

  @ApiPropertyOptional({
    description: 'Required when platform admin creates a bus',
    example: 'operator-cuid',
  })
  @IsOptional()
  @IsString()
  operatorId?: string;
}
