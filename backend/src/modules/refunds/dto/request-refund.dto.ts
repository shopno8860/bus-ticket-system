import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestRefundDto {
  @ApiProperty({
    example: '7c2e9a3f-3d51-4d3c-92b6-4bbf9b8f1d2a',
  })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({
    example: 'Could not travel due to an emergency.',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
