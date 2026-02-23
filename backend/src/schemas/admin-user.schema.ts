import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AdminUserDocument = AdminUser & Document;

/**
 * AdminUser Schema — Per-tenant admin accounts
 * 
 * Each client can have one or more admin users who access
 * the dashboard for their tenant only. Super admins can
 * access all tenants.
 */
@Schema({ timestamps: true })
export class AdminUser {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Client', index: true })
  clientId: MongooseSchema.Types.ObjectId; // null for super admins

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: 'client_admin' })
  role: string; // super_admin, client_admin

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLoginAt: Date;

  @Prop()
  displayName: string;
}

export const AdminUserSchema = SchemaFactory.createForClass(AdminUser);
AdminUserSchema.index({ clientId: 1, email: 1 });
AdminUserSchema.index({ email: 1 }, { unique: true });
AdminUserSchema.index({ username: 1 });
AdminUserSchema.index({ role: 1 });
