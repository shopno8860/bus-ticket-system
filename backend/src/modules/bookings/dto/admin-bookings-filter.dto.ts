import { IsDateString, IsOptional, IsString } from 'class-validator';

export class AdminBookingsFilterDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsString()
  user?: string;
}
