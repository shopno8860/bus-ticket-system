import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRouteDto {
  @ApiProperty({
    example: 'Dhaka',
  })
  @IsString()
  @IsNotEmpty()
  origin: string;

  @ApiProperty({
    example: 'Chattogram',
  })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiPropertyOptional({
    description: 'Required when platform admin creates a route',
  })
  @IsOptional()
  @IsString()
  operatorId?: string;
}
