import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelBookingDto {
  @ApiProperty({
    example: 'Cancelled due to change of travel plan.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;
}
