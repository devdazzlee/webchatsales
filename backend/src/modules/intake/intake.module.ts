import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Client, ClientSchema } from '../../schemas/client.schema';
import {
  IntakeSubmission,
  IntakeSubmissionSchema,
} from '../../schemas/intake-submission.schema';
import { TenantModule } from '../tenant/tenant.module';
import { EmailModule } from '../email/email.module';
import { IntakeController } from './intake.controller';
import { IntakeService } from './intake.service';

@Module({
  imports: [
    TenantModule,
    EmailModule,
    MongooseModule.forFeature([
      { name: Client.name, schema: ClientSchema },
      { name: IntakeSubmission.name, schema: IntakeSubmissionSchema },
    ]),
  ],
  controllers: [IntakeController],
  providers: [IntakeService],
})
export class IntakeModule {}
