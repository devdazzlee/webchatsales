import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BookingDocument = Booking & Document;

@Schema({ timestamps: true })
export class Booking {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Client', index: true })
  clientId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  sessionId: string;

  @Prop()
  leadId: string; // Reference to lead

  @Prop({ required: true })
  timeSlot: Date;

  @Prop()
  schedulingLink: string;

  @Prop({ default: 'scheduled' })
  status: string; // scheduled, confirmed, cancelled, completed

  @Prop()
  userEmail: string;

  @Prop()
  userName: string;

  @Prop()
  userPhone: string;

  @Prop()
  notes: string;

  @Prop()
  conversationId: string; // Reference to conversation

  @Prop({ default: Date.now })
  bookedAt: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
BookingSchema.index({ clientId: 1, sessionId: 1 });
BookingSchema.index({ clientId: 1, leadId: 1 });
BookingSchema.index({ clientId: 1, timeSlot: 1 });
BookingSchema.index({ clientId: 1, status: 1 });
BookingSchema.index({ clientId: 1, createdAt: -1 });
BookingSchema.index({ sessionId: 1 });

