import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OperatorsService } from './operators.service';

@ApiTags('Operators')
@Controller('operators')
export class OperatorPublicController {
  constructor(private readonly operatorsService: OperatorsService) {}

  @Get()
  @ApiOperation({ summary: 'Public list of operators' })
  listActive() {
    return this.operatorsService.findAll();
  }
}
