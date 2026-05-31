import { PartialType } from '@nestjs/swagger';
import { CreateDroppingPointDto } from './create-dropping-point.dto';

export class UpdateDroppingPointDto extends PartialType(CreateDroppingPointDto) {}

