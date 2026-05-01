import { IsDateString, IsOptional, IsString } from 'class-validator';

export class AdminTripsFilterDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsDateString()
  departureDate?: string;

  @IsOptional()
  @IsString()
  busOperator?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
