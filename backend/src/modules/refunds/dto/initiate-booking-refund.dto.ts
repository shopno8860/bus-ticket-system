import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class InitiateBookingRefundDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
