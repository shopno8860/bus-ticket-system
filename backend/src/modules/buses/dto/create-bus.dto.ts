import { BusClass, BusType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBusDto {
  @ApiProperty({
    example: 'Green Line Coach',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Green Line Paribahan',
  })
  @IsString()
  @IsNotEmpty()
  operatorName: string;

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
}
