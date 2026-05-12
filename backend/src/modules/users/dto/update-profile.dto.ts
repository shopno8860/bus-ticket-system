import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Gender } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'Rakesh Chandra',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName!: string;

  @ApiProperty({
    example: '+8801712345678',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phoneNumber!: string;

  @ApiPropertyOptional({
    example: 'MALE',
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    example: 'House 12, Road 5, Dhanmondi, Dhaka',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({
    example: '1998-05-12',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    example: '1998123456789',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nationalId?: string;

  @ApiPropertyOptional({
    example: 'BM0123456',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  passportNumber?: string;

  @ApiPropertyOptional({
    example: 'Tourist visa valid until 2027-12-31',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  visaInfo?: string;
}
