import { IsDateString, IsOptional, IsString } from 'class-validator';

export class SearchTripsDto {
  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  busType?: string;

  @IsOptional()
  @IsString()
  busClass?: string;

  @IsOptional()
  @IsString()
  boardingPoint?: string;

  @IsOptional()
  @IsString()
  droppingPoint?: string;

  @IsOptional()
  @IsString()
  minPrice?: string;

  @IsOptional()
  @IsString()
  maxPrice?: string;
}
