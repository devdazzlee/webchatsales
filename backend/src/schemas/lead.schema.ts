import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type LeadDocument = Lead & Document;

/**
 * Lead Schema - Updated Jan 2026
 * 
 * NEW 9-STEP QUALIFICATION FLOW:
 * 1. name - "Who am I speaking with?"
 * 2. businessType - "What type of business is this?"
 * 3. leadSource - "How do leads usually come in for you?"
 * 4. leadsPerWeek - "Roughly how many per week?"
 * 5. dealValue - "What's a typical deal or job worth?"
 * 6. afterHoursPain - "What happens when leads come in after hours?"
 * 7. [Tie-back message - not a question]
 * 8. email - collected during close or buying intent
 * 9. phone - collected during close or buying intent
 */
@Schema({ timestamps: true })
export class Lead {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Client', index: true })
  clientId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  sessionId: string;

  // Step 1: Name
  @Prop()
  name: string;

  // Step 2: Business type
  @Prop()
  businessType: string;

  // Step 3: How leads come in
  @Prop()
  leadSource: string;

  // Step 4: Leads per week
  @Prop()
  leadsPerWeek: string;

  // Step 5: Deal/job value
  @Prop()
  dealValue: string;

  // Step 6: After-hours pain point
  @Prop()
  afterHoursPain: string;

  // Collected during close
  @Prop()
  email: string;

  @Prop()
  phone: string;

  // Legacy fields (kept for backward compatibility)
  @Prop()
  company: string;

  @Prop()
  customers: string;

  @Prop()
  pricingTier: string;

  @Prop()
  biggestProblem: string;

  @Prop()
  serviceNeed: string;

  @Prop()
  timing: string;

  @Prop()
  budget: string;

  @Prop()
  leadsPerDay: string;

  @Prop()
  overnightLeads: string;

  @Prop()
  returnCallTiming: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  summary: string;

  @Prop({ default: 'new' })
  status: string; // new, qualified, contacted, booked, lost

  @Prop({ default: Date.now })
  qualifiedAt: Date;

  @Prop()
  conversationId: string;

  // New field: Track if buying intent was detected
  @Prop({ default: false })
  hasBuyingIntent: boolean;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
LeadSchema.index({ clientId: 1, sessionId: 1 });
LeadSchema.index({ clientId: 1, email: 1 });
LeadSchema.index({ clientId: 1, createdAt: -1 });
LeadSchema.index({ clientId: 1, status: 1 });
LeadSchema.index({ sessionId: 1 });

