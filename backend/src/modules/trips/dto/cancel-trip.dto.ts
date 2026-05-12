import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelTripDto {
  @ApiProperty({
    example: 'Trip cancelled due to unavoidable maintenance issues.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;
}
