import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOperatorDto {
  @ApiProperty({ example: 'Hanif Enterprise' })
  @IsString()
  @MinLength(2)
  companyName: string;

  @ApiProperty({ example: 'hanif-enterprise' })
  @IsString()
  @MinLength(2)
  slug: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ example: 'info@hanif.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+8801712345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Dhaka, Bangladesh' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Leading bus service provider' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'admin@hanif.com' })
  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @ApiPropertyOptional({ example: 'Admin Name' })
  @IsOptional()
  @IsString()
  adminName?: string;

  @ApiPropertyOptional({ example: 'StrongP@ss123' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  adminPassword?: string;
}
