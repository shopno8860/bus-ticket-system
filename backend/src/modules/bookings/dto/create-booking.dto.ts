import { ArrayNotEmpty, ArrayUnique, IsArray, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  tripId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  seatIds: string[];
}
