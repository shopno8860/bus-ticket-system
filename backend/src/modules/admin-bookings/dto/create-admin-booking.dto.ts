import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdminBookingDto {
  @ApiProperty({ example: 'trip-id-here' })
  @IsString()
  tripId: string;

  @ApiProperty({ example: 'boarding-point-id' })
  @IsString()
  boardingPointId: string;

  @ApiProperty({ example: 'dropping-point-id' })
  @IsString()
  droppingPointId: string;

  @ApiProperty({ example: ['seat-id-1', 'seat-id-2'] })
  @IsArray()
  @IsString({ each: true })
  seatIds: string[];

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(1)
  passengerName: string;

  @ApiProperty({ example: '+8801711223344' })
  @IsString()
  @MinLength(1)
  passengerPhone: string;

  @ApiPropertyOptional({ example: 'FIXED', enum: ['FIXED', 'PERCENTAGE'] })
  @IsOptional()
  @IsString()
  @IsIn(['FIXED', 'PERCENTAGE'])
  discountType?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;
}
