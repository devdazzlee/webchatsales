import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { Client, ClientDocument } from '../../schemas/client.schema';

/**
 * TenantService — Core multi-tenant operations
 * 
 * Responsible for:
 * - Client CRUD
 * - API key generation & rotation
 * - Tenant resolution (by widget key, domain, or ID)
 * - Client configuration management
 */
@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
  ) {}

  /**
   * Create a new client (tenant)
   */
  async createClient(data: {
    name: string;
    ownerEmail: string;
    ownerName?: string;
    ownerPhone?: string;
    companyWebsite?: string;
    industry?: string;
    allowedDomains?: string[];
    plan?: string;
    notificationEmail?: string;
    schedulingLink?: string;
    isDemoMode?: boolean;
  }): Promise<ClientDocument> {
    const normalizedAllowedDomains = this.normalizeAllowedDomains(data.allowedDomains);

    // Check for duplicate name or email
    const existingByName = await this.clientModel.findOne({ name: data.name }).exec();
    if (existingByName) {
      throw new ConflictException(`Client with name "${data.name}" already exists`);
    }

    const existingByEmail = await this.clientModel.findOne({ ownerEmail: data.ownerEmail }).exec();
    if (existingByEmail) {
      throw new ConflictException(`Client with email "${data.ownerEmail}" already exists`);
    }

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check slug uniqueness
    const existingBySlug = await this.clientModel.findOne({ slug }).exec();
    if (existingBySlug) {
      throw new ConflictException(`Client slug "${slug}" already exists. Choose a different name.`);
    }

    const client = new this.clientModel({
      ...data,
      allowedDomains: normalizedAllowedDomains,
      slug,
      widgetKey: this.generateWidgetKey(),
      secretKey: this.generateSecretKey(),
      notificationEmail: data.notificationEmail || data.ownerEmail,
    });

    const saved = await client.save();
    console.log(`[TenantService] ✅ Client created: ${saved.name} (${saved._id}), widgetKey: ${saved.widgetKey.substring(0, 12)}...`);
    return saved;
  }

  /**
   * Find a client by its MongoDB _id
   */
  async findById(clientId: string | Types.ObjectId): Promise<ClientDocument | null> {
    return this.clientModel.findById(clientId).exec();
  }

  /**
   * Find a client by widget key (used by public widget endpoints)
   */
  async findByWidgetKey(widgetKey: string): Promise<ClientDocument | null> {
    return this.clientModel.findOne({ widgetKey, isActive: true }).exec();
  }

  /**
   * Find a client by secret key (used by server-to-server calls)
   */
  async findBySecretKey(secretKey: string): Promise<ClientDocument | null> {
    return this.clientModel.findOne({ secretKey, isActive: true }).exec();
  }

  /**
   * Find a client by slug
   */
  async findBySlug(slug: string): Promise<ClientDocument | null> {
    return this.clientModel.findOne({ slug, isActive: true }).exec();
  }

  /**
   * Find a client by allowed domain
   */
  async findByDomain(domain: string): Promise<ClientDocument | null> {
    const normalized = this.normalizeDomain(domain);
    if (!normalized) {
      return null;
    }

    const clients = await this.clientModel.find({ isActive: true }).exec();
    for (const client of clients) {
      const allowed = (client.allowedDomains || [])
        .map((d) => this.normalizeDomain(d))
        .filter((d): d is string => !!d);

      if (allowed.includes(normalized)) {
        return client;
      }
    }

    return null;
  }

  /**
   * List all clients (admin only)
   */
  async listClients(options?: {
    limit?: number;
    skip?: number;
    isActive?: boolean;
  }): Promise<{ clients: ClientDocument[]; total: number }> {
    const query: any = {};
    if (options?.isActive !== undefined) {
      query.isActive = options.isActive;
    }

    const [clients, total] = await Promise.all([
      this.clientModel
        .find(query)
        .select('-secretKey -openaiApiKey -smtpPassword -squareAccessToken') // Never expose secrets in list
        .sort({ createdAt: -1 })
        .limit(options?.limit || 50)
        .skip(options?.skip || 0)
        .exec(),
      this.clientModel.countDocuments(query),
    ]);

    return { clients, total };
  }

  /**
   * Update a client's configuration
   */
  async updateClient(
    clientId: string | Types.ObjectId,
    updateData: Partial<Client>,
  ): Promise<ClientDocument> {
    // Prevent updating immutable fields
    delete (updateData as any)._id;
    delete (updateData as any).widgetKey;
    delete (updateData as any).secretKey;
    delete (updateData as any).slug;

    if (updateData.allowedDomains) {
      updateData.allowedDomains = this.normalizeAllowedDomains(updateData.allowedDomains);
    }

    const client = await this.clientModel
      .findByIdAndUpdate(clientId, { $set: updateData }, { new: true })
      .exec();

    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    console.log(`[TenantService] ✅ Client updated: ${client.name} (${client._id})`);
    return client;
  }

  /**
   * Deactivate a client (soft delete)
   */
  async deactivateClient(clientId: string | Types.ObjectId): Promise<ClientDocument> {
    const client = await this.clientModel
      .findByIdAndUpdate(clientId, { isActive: false }, { new: true })
      .exec();

    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    console.log(`[TenantService] ⚠️ Client deactivated: ${client.name} (${client._id})`);
    return client;
  }

  /**
   * Reactivate a client
   */
  async reactivateClient(clientId: string | Types.ObjectId): Promise<ClientDocument> {
    const client = await this.clientModel
      .findByIdAndUpdate(clientId, { isActive: true }, { new: true })
      .exec();

    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    console.log(`[TenantService] ✅ Client reactivated: ${client.name} (${client._id})`);
    return client;
  }

  /**
   * Rotate widget key (generates new public API key)
   */
  async rotateWidgetKey(clientId: string | Types.ObjectId): Promise<{ widgetKey: string }> {
    const newKey = this.generateWidgetKey();
    const client = await this.clientModel
      .findByIdAndUpdate(clientId, { widgetKey: newKey }, { new: true })
      .exec();

    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    console.log(`[TenantService] 🔑 Widget key rotated for: ${client.name}`);
    return { widgetKey: newKey };
  }

  /**
   * Rotate secret key (generates new server-to-server key)
   */
  async rotateSecretKey(clientId: string | Types.ObjectId): Promise<{ secretKey: string }> {
    const newKey = this.generateSecretKey();
    const client = await this.clientModel
      .findByIdAndUpdate(clientId, { secretKey: newKey }, { new: true })
      .exec();

    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    console.log(`[TenantService] 🔑 Secret key rotated for: ${client.name}`);
    return { secretKey: newKey };
  }

  /**
   * Validate that a domain is allowed for a client
   */
  async validateDomain(clientId: string | Types.ObjectId, domain: string): Promise<boolean> {
    const client = await this.findById(clientId);
    if (!client) return false;

    // If no domains are configured, allow all (useful during development)
    if (!client.allowedDomains || client.allowedDomains.length === 0) {
      return true;
    }

    const normalized = this.normalizeDomain(domain);
    if (!normalized) return false;

    return client.allowedDomains.some(d => {
      const normalizedAllowed = this.normalizeDomain(d);
      return normalizedAllowed === normalized;
    });
  }

  // --- Private helpers ---

  private generateWidgetKey(): string {
    return `wcs_${crypto.randomBytes(24).toString('hex')}`;
  }

  private generateSecretKey(): string {
    return `wcs_sk_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Normalize host/domain from values like:
   * - http://localhost:3000/
   * - https://webchatsales.com
   * - localhost
   * into a canonical host form used for matching.
   */
  private normalizeDomain(value?: string): string | null {
    if (!value) return null;
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return null;

    try {
      const withScheme = /^https?:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`;
      const url = new URL(withScheme);
      return url.hostname;
    } catch {
      return trimmed
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/:\d+$/, '')
        .trim()
        .toLowerCase() || null;
    }
  }

  private normalizeAllowedDomains(domains?: string[]): string[] {
    if (!domains?.length) return [];
    return Array.from(
      new Set(
        domains
          .map((d) => this.normalizeDomain(d))
          .filter((d): d is string => !!d),
      ),
    );
  }
}
