import { IsOptional, IsString } from 'class-validator';

export class UpdateRouteDto {
  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  destination?: string;
}
