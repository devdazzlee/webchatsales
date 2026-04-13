import { Body, Controller, Post } from '@nestjs/common';
import { CreateIntakeDto } from './dto/create-intake.dto';
import { IntakeService } from './intake.service';

@Controller('api/intake')
export class IntakeController {
  constructor(private readonly intakeService: IntakeService) {}

  @Post('self-onboard')
  async submitIntake(@Body() body: CreateIntakeDto) {
    const result = await this.intakeService.submitIntake(body);
    return {
      success: true,
      ...result,
    };
  }
}
