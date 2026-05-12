import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'Rakesh Chandra',
  })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({
    example: 'rakesh@gmail.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'StrongP@ssw0rd',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    example: '+8801712345678',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
