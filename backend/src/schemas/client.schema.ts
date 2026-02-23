import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as crypto from 'crypto';

export type ClientDocument = Client & Document;

/**
 * Widget configuration embedded in Client
 * Controls how the chat widget looks and behaves on the client's website
 */
@Schema({ _id: false })
export class WidgetConfig {
  @Prop({ default: 'Abby' })
  agentName: string;

  @Prop({ default: 'Hi! How can I help you today?' })
  welcomeMessage: string;

  @Prop({ default: '#22c55e' })
  primaryColor: string;

  @Prop({ default: 'bottom-right' })
  position: string; // bottom-right, bottom-left

  @Prop({ default: true })
  showBranding: boolean;

  @Prop()
  avatarUrl: string;

  @Prop()
  logoUrl: string;
}

export const WidgetConfigSchema = SchemaFactory.createForClass(WidgetConfig);

/**
 * Client Schema — The tenant model
 * 
 * Each client represents one customer who has installed WebChatSales.
 * All data (conversations, leads, bookings, tickets, payments) is scoped to a client
 * via clientId. This is the foundational isolation model.
 * 
 * Identification strategy:
 * 1. Widget Key (primary) — Unique API key embedded in the chat widget script tag.
 *    Used by public-facing endpoints (chat, booking availability).
 * 2. Domain whitelist — Validates that the widget is being loaded from an authorized domain.
 * 3. JWT — Dashboard/admin endpoints authenticate via JWT which contains clientId.
 */
@Schema({ timestamps: true })
export class Client {
  @Prop({ required: true, unique: true })
  name: string; // Company / business name

  @Prop({ required: true, unique: true })
  slug: string; // URL-safe identifier, auto-generated from name

  @Prop({ required: true, unique: true, index: true })
  widgetKey: string; // Public API key embedded in widget script

  @Prop({ required: true, unique: true, index: true })
  secretKey: string; // Secret key for server-to-server API calls

  @Prop({ type: [String], default: [] })
  allowedDomains: string[]; // Domains where the widget is authorized

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 'trial' })
  plan: string; // trial, starter, pro, enterprise

  @Prop()
  planExpiresAt: Date;

  // Client-specific contact info
  @Prop({ required: true })
  ownerEmail: string;

  @Prop()
  ownerName: string;

  @Prop()
  ownerPhone: string;

  @Prop()
  companyWebsite: string;

  @Prop()
  industry: string;

  // Notification settings — per-tenant
  @Prop()
  notificationEmail: string; // Who receives lead/conversation alerts

  @Prop({ default: true })
  emailNotificationsEnabled: boolean;

  // OpenAI / AI settings — per-tenant overrides
  @Prop()
  openaiApiKey: string; // Client can bring their own key (optional)

  @Prop({ default: 'gpt-4o-mini' })
  openaiModel: string;

  // SMTP settings — per-tenant overrides (optional)
  @Prop()
  smtpHost: string;

  @Prop()
  smtpPort: string;

  @Prop()
  smtpEmail: string;

  @Prop()
  smtpPassword: string;

  // Square payment settings — per-tenant
  @Prop()
  squareAccessToken: string;

  @Prop()
  squareApplicationId: string;

  @Prop()
  squareLocationId: string;

  @Prop({ default: 'sandbox' })
  squareEnvironment: string;

  // Scheduling / booking config
  @Prop()
  schedulingLink: string;

  @Prop()
  businessHours: string; // e.g. "9:00-17:00"

  @Prop()
  timezone: string;

  // Widget configuration
  @Prop({ type: WidgetConfigSchema, default: () => ({}) })
  widgetConfig: WidgetConfig;

  // Demo mode flag
  @Prop({ default: false })
  isDemoMode: boolean;

  // Metadata
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: Record<string, any>;
}

export const ClientSchema = SchemaFactory.createForClass(Client);

// Indexes for fast lookup
ClientSchema.index({ widgetKey: 1 });
ClientSchema.index({ secretKey: 1 });
ClientSchema.index({ slug: 1 });
ClientSchema.index({ ownerEmail: 1 });
ClientSchema.index({ isActive: 1 });
ClientSchema.index({ createdAt: -1 });

/**
 * Pre-save hook: auto-generate widget key and secret key if not set
 */
ClientSchema.pre('save', function (next) {
  if (!this.widgetKey) {
    this.widgetKey = `wcs_${crypto.randomBytes(24).toString('hex')}`;
  }
  if (!this.secretKey) {
    this.secretKey = `wcs_sk_${crypto.randomBytes(32).toString('hex')}`;
  }
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});
