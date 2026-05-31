import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateBoardingPointDto {
  @ApiProperty({ example: 'route-id-here' })
  @IsString()
  routeId: string;

  @ApiProperty({ example: 'Gabtoli' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'Gabtoli Bus Terminal, Dhaka' })
  @IsString()
  @MinLength(1)
  address: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

