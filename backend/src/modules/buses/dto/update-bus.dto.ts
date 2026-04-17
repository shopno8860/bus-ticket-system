import { BusStatus, BusType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBusDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  operatorName?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatCapacity?: number;

  @IsOptional()
  @IsEnum(BusType)
  busType?: BusType;

  @IsOptional()
  @IsEnum(BusStatus)
  status?: BusStatus;
}
