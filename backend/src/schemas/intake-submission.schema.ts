import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type IntakeSubmissionDocument = IntakeSubmission & Document;

@Schema({ timestamps: true })
export class IntakeSubmission {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Client', index: true })
  clientId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  ownerEmail: string;

  @Prop({ required: true, trim: true })
  businessName: string;

  @Prop({ required: true, trim: true })
  ownerName: string;

  @Prop({ trim: true })
  ownerPhone?: string;

  @Prop({ trim: true })
  companyWebsite?: string;

  @Prop({ trim: true })
  industry?: string;

  @Prop({ type: [String], default: [] })
  servicesOffered: string[];

  @Prop({ required: true, trim: true })
  businessHours: string;

  @Prop({ required: true, trim: true })
  timezone: string;

  @Prop({ trim: true })
  bookingLink?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  rawPayload: Record<string, any>;

  @Prop({ default: false })
  isNewClient: boolean;
}

export const IntakeSubmissionSchema = SchemaFactory.createForClass(IntakeSubmission);
IntakeSubmissionSchema.index({ clientId: 1, createdAt: -1 });
