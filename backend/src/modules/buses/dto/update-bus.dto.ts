import { BusClass, BusStatus, BusType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBusDto {
  @ApiPropertyOptional({
    example: 'Green Line Coach',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'DHAKA-METRO-BA-1234',
  })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional({
    example: 40,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatCapacity?: number;

  @ApiPropertyOptional({
    example: 'AC',
  })
  @IsOptional()
  @IsEnum(BusType)
  busType?: BusType;

  @ApiPropertyOptional({
    example: 'BUSINESS',
  })
  @IsOptional()
  @IsEnum(BusClass)
  busClass?: BusClass;

  @ApiPropertyOptional({
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum(BusStatus)
  status?: BusStatus;
}
