import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmBookingDto {
  @ApiProperty({
    example: '3b7b2f5a-0a8d-4e1b-9c93-6d3a2d8f4b21',
  })
  @IsString()
  @IsNotEmpty()
  tripId: string;

  @ApiProperty({
    example: 'Rakesh Chandra',
  })
  @IsString()
  @IsNotEmpty()
  passengerName: string;

  @ApiProperty({
    example: '+8801712345678',
  })
  @IsString()
  @IsNotEmpty()
  passengerPhone: string;

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
