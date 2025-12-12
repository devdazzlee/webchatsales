import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SupportTicketDocument = SupportTicket & Document;

@Schema({ timestamps: true })
export class SupportTicket {
  @Prop({ required: true, unique: true })
  ticketId: string;

  @Prop({ required: true })
  sessionId: string;

  @Prop({ default: 'open' })
  status: string; // open, in_progress, resolved, closed

  @Prop({ default: 'medium' })
  priority: string; // low, medium, high, urgent

  @Prop()
  sentiment: string; // positive, neutral, negative, very_negative

  @Prop({ type: String, required: true })
  transcript: string; // Full conversation transcript

  @Prop()
  summary: string;

  @Prop()
  userEmail: string;

  @Prop()
  userName: string;

  @Prop()
  userPhone: string;

  @Prop()
  conversationId: string; // Reference to conversation

  @Prop({ default: Date.now })
  openedAt: Date;

  @Prop()
  resolvedAt: Date;
}

export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);
SupportTicketSchema.index({ ticketId: 1 });
SupportTicketSchema.index({ sessionId: 1 });
SupportTicketSchema.index({ status: 1 });
SupportTicketSchema.index({ createdAt: -1 });
SupportTicketSchema.index({ priority: 1 });

