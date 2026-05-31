import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDroppingPointDto {
  @ApiProperty({ example: 'route-id-here' })
  @IsString()
  routeId: string;

  @ApiProperty({ example: 'AK Khan' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'AK Khan Circle, Chattogram' })
  @IsString()
  @MinLength(1)
  address: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

