import { BusType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateBusDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  operatorName: string;

  @IsString()
  @IsNotEmpty()
  registrationNumber: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatCapacity: number;

  @IsEnum(BusType)
  busType: BusType;
}
