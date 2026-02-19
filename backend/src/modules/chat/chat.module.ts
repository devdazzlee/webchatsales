import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PromptBuilderService } from './prompt-builder.service';
import { SalesAgentPromptService } from './sales-agent-prompt.service';
import { Conversation, ConversationSchema } from '../../schemas/conversation.schema';
import { LeadModule } from '../lead/lead.module';
import { SupportModule } from '../support/support.module';
import { EmailModule } from '../email/email.module';
import { BookingModule } from '../booking/booking.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
    ]),
    LeadModule,
    SupportModule,
    EmailModule,
    BookingModule,
    NotificationModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, PromptBuilderService, SalesAgentPromptService],
  exports: [ChatService],
})
export class ChatModule {}

