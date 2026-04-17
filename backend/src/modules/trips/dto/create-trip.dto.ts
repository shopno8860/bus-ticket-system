import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  busId: string;

  @IsString()
  @IsNotEmpty()
  routeId: string;

  @IsDateString()
  departureTime: string;

  @IsDateString()
  arrivalTime: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;
}
