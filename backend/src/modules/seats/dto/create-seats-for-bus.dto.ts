import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSeatsForBusDto {
  @ApiPropertyOptional({
    example: 4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  columnsPerRow?: number;

  @ApiPropertyOptional({
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  forceRegenerate = false;
}
