import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRouteDto {
  @ApiPropertyOptional({
    example: 'Dhaka',
  })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({
    example: 'Chattogram',
  })
  @IsOptional()
  @IsString()
  destination?: string;
}
