import { IsNotEmpty, IsString } from 'class-validator';

export class RequestRefundDto {
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
