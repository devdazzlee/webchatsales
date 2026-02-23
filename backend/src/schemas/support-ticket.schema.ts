import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SupportTicketDocument = SupportTicket & Document;

@Schema({ timestamps: true })
export class SupportTicket {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Client', index: true })
  clientId: MongooseSchema.Types.ObjectId;

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
SupportTicketSchema.index({ clientId: 1, ticketId: 1 });
SupportTicketSchema.index({ clientId: 1, sessionId: 1 });
SupportTicketSchema.index({ clientId: 1, status: 1 });
SupportTicketSchema.index({ clientId: 1, createdAt: -1 });
SupportTicketSchema.index({ clientId: 1, priority: 1 });
SupportTicketSchema.index({ ticketId: 1 });

