import { PartialType } from '@nestjs/swagger';
import { CreateBoardingPointDto } from './create-boarding-point.dto';

export class UpdateBoardingPointDto extends PartialType(CreateBoardingPointDto) {}

