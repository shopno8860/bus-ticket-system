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
}
