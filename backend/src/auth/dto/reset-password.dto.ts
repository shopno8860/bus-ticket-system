import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.reset_token_payload.signature',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'NewStrongP@ssw0rd',
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
