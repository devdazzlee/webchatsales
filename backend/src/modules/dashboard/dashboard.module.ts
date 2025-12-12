import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AuthModule } from '../auth/auth.module';
import { Conversation, ConversationSchema } from '../../schemas/conversation.schema';
import { Lead, LeadSchema } from '../../schemas/lead.schema';
import { SupportTicket, SupportTicketSchema } from '../../schemas/support-ticket.schema';
import { Payment, PaymentSchema } from '../../schemas/payment.schema';
import { Booking, BookingSchema } from '../../schemas/booking.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: SupportTicket.name, schema: SupportTicketSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

