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
  company: string; // Company name (sales agent flow)

  @Prop()
  businessType: string; // What the business does (sales agent discovery)

  @Prop()
  customers: string; // Who their customers are (sales agent discovery)

  @Prop()
  pricingTier: string; // Lower ticket or higher ticket (sales agent discovery)

  @Prop()
  biggestProblem: string; // Biggest problem they're trying to solve (sales agent discovery)

  @Prop()
  serviceNeed: string;

  @Prop()
  timing: string;

  @Prop()
  budget: string;

  @Prop()
  leadsPerDay: string; // Qualified question: How many leads do you get per day?

  @Prop()
  overnightLeads: string; // Qualified question: How many leads come in overnight?

  @Prop()
  returnCallTiming: string; // Qualified question: When do you typically return calls?

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

