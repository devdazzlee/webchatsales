import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LeadDocument = Lead & Document;

@Schema({ timestamps: true })
export class Lead {
  @Prop({ required: true })
  sessionId: string;

  @Prop()
  name: string;

  @Prop()
  email: string;

  @Prop()
  phone: string;

  @Prop()
  serviceNeed: string;

  @Prop()
  timing: string;

  @Prop()
  budget: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  summary: string;

  @Prop({ default: 'new' })
  status: string; // new, qualified, contacted, booked, lost

  @Prop({ default: Date.now })
  qualifiedAt: Date;

  @Prop()
  conversationId: string; // Reference to conversation
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
LeadSchema.index({ sessionId: 1 });
LeadSchema.index({ email: 1 });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ status: 1 });

