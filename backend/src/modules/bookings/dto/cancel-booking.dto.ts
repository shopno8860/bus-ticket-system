import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelBookingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;
}
