import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ConversationDocument = Conversation & Document;

const MessageSchema = {
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, required: true },
};

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Client', index: true })
  clientId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, unique: true })
  sessionId: string;

  @Prop({ type: [MessageSchema], default: [] })
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  }>;

  @Prop({ default: Date.now })
  startedAt: Date;

  @Prop()
  lastMessageAt: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  userEmail: string;

  @Prop()
  userName: string;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ clientId: 1, sessionId: 1 });
ConversationSchema.index({ clientId: 1, createdAt: -1 });
ConversationSchema.index({ sessionId: 1 });

