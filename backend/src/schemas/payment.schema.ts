import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true })
  squarePaymentId: string;

  @Prop({ required: true })
  squareOrderId: string;

  @Prop()
  sessionId: string;

  @Prop()
  userEmail: string;

  @Prop()
  userName: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop()
  planType: string; // e.g., 'founder_special', 'monthly', 'annual'

  @Prop({ default: 'pending' })
  status: string; // pending, completed, failed, refunded

  @Prop({ type: MongooseSchema.Types.Mixed })
  squareWebhookData: any; // Store full webhook payload

  @Prop({ default: Date.now })
  paidAt: Date;

  @Prop()
  confirmationEmailSent: boolean;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ squarePaymentId: 1 });
PaymentSchema.index({ squareOrderId: 1 });
PaymentSchema.index({ sessionId: 1 });
PaymentSchema.index({ userEmail: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ createdAt: -1 });

