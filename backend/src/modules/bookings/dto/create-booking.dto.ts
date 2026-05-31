import { ArrayNotEmpty, ArrayUnique, IsArray, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({
    example: '3b7b2f5a-0a8d-4e1b-9c93-6d3a2d8f4b21',
  })
  @IsString()
  tripId: string;

  @ApiPropertyOptional({ example: 'boarding-point-id' })
  @IsOptional()
  @IsString()
  boardingPointId?: string;

  @ApiPropertyOptional({ example: 'dropping-point-id' })
  @IsOptional()
  @IsString()
  droppingPointId?: string;

  @ApiProperty({
    example: [
      'a1b2c3d4-e5f6-4a3b-9c8d-7e6f5a4b3c2d',
      'b2c3d4e5-f6a1-4b2c-8d9e-0f1a2b3c4d5e',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  seatIds: string[];
}
