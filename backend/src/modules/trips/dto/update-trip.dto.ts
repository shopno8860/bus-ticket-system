import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateTripDto {
  @IsOptional()
  @IsDateString()
  departureTime?: string;

  @IsOptional()
  @IsDateString()
  arrivalTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;
}
