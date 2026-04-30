import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateSeatsForBusDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  columnsPerRow?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  forceRegenerate = false;
}
