import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as crypto from "crypto";
import { Client, ClientDocument } from "../../schemas/client.schema";
import { config } from "../../config/config";

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
    jobDescription?: string;
    servicesOffered?: string[];
    allowedDomains?: string[];
    plan?: string;
    notificationEmail?: string;
    schedulingLink?: string;
    isDemoMode?: boolean;
    status?: "draft" | "test" | "live";
    businessConfig?: {
      assistantName?: string;
      assistantRole?: string;
      brandVoice?: string;
      valueProposition?: string;
      qualificationGoal?: string;
      responseRules?: string[];
    };
  }): Promise<ClientDocument> {
    const normalizedAllowedDomains = this.normalizeAllowedDomains(
      data.allowedDomains,
    );

    // Check for duplicate name or email (exclude platform tenant — it uses owner email too)
    const existingByName = await this.clientModel
      .findOne({ name: data.name, isPlatformTenant: { $ne: true } })
      .exec();
    if (existingByName) {
      throw new ConflictException(
        `Client with name "${data.name}" already exists`,
      );
    }

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check slug uniqueness
    const existingBySlug = await this.clientModel.findOne({ slug }).exec();
    if (existingBySlug) {
      throw new ConflictException(
        `Client slug "${slug}" already exists. Choose a different name.`,
      );
    }

    const client = new this.clientModel({
      ...data,
      allowedDomains: normalizedAllowedDomains,
      slug,
      widgetKey: this.generateWidgetKey(),
      secretKey: this.generateSecretKey(),
      notificationEmail: data.notificationEmail || data.ownerEmail,
      status: data.status || "draft",
    });

    const saved = await client.save();
    console.log(
      `[TenantService] ✅ Client created: ${saved.name} (${saved._id}), widgetKey: ${saved.widgetKey.substring(0, 12)}...`,
    );
    return saved;
  }

  /**
   * Find a client by its MongoDB _id
   */
  async findById(
    clientId: string | Types.ObjectId,
  ): Promise<ClientDocument | null> {
    return this.clientModel.findById(clientId).exec();
  }

  /** The webchatsales.com marketing site tenant */
  async findPlatformTenant(): Promise<ClientDocument | null> {
    return this.clientModel
      .findOne({ isPlatformTenant: true, isActive: true })
      .exec();
  }

  /** Create or update the protected platform tenant (seed script) */
  async ensurePlatformTenant(data: {
    name: string;
    ownerEmail: string;
    notificationEmail?: string;
    allowedDomains: string[];
  }): Promise<ClientDocument> {
    const slug = config.site.platformSlug;
    let client =
      (await this.findPlatformTenant()) ||
      (await this.clientModel.findOne({ slug }).exec());

    const mergedDomains = this.normalizeAllowedDomains(data.allowedDomains);

    if (!client) {
      client = new this.clientModel({
        name: data.name,
        slug,
        ownerEmail: data.ownerEmail,
        notificationEmail: data.notificationEmail || data.ownerEmail,
        allowedDomains: mergedDomains,
        widgetKey: config.site.defaultWidgetKey,
        secretKey: this.generateSecretKey(),
        status: 'live',
        isPlatformTenant: true,
        isActive: true,
        plan: 'trial',
      });
      await client.save();
      console.log(`[TenantService] ✅ Platform tenant created: ${client._id}`);
      return client;
    }

    const updated = await this.clientModel
      .findByIdAndUpdate(
        client._id,
        {
          $set: {
            name: data.name,
            slug,
            ownerEmail: data.ownerEmail,
            notificationEmail: data.notificationEmail || data.ownerEmail,
            allowedDomains: mergedDomains,
            widgetKey: config.site.defaultWidgetKey,
            status: 'live',
            isPlatformTenant: true,
            isActive: true,
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to ensure platform tenant');
    }

    console.log(`[TenantService] ✅ Platform tenant ensured: ${updated.name} (${updated._id})`);
    return updated;
  }

  /**
   * Find a client by widget key (used by public widget endpoints)
   */
  async findByWidgetKey(widgetKey: string): Promise<ClientDocument | null> {
    const client = await this.clientModel
      .findOne({ widgetKey, isActive: true })
      .exec();
    if (!client) {
      return null;
    }
    if (!client.isPlatformTenant && this.isDraftStatus(client.status)) {
      return null;
    }
    return client;
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

    // Marketing site domains always resolve to the platform tenant first
    const platform = await this.findPlatformTenant();
    if (platform && this.domainMatchesClient(normalized, platform)) {
      return platform;
    }

    const clients = await this.clientModel
      .find({ isActive: true, isPlatformTenant: { $ne: true } })
      .exec();

    for (const client of clients) {
      if (this.isDraftStatus(client.status)) {
        continue;
      }

      if (this.domainMatchesClient(normalized, client)) {
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
    status?: string;
  }): Promise<{ clients: ClientDocument[]; total: number }> {
    const query: any = {};
    if (options?.isActive !== undefined) {
      query.isActive = options.isActive;
    }
    if (options?.status) {
      query.status = options.status;
    }

    const [clients, total] = await Promise.all([
      this.clientModel
        .find(query)
        .select("-secretKey -openaiApiKey -smtpPassword -squareAccessToken") // Never expose secrets in list
        .sort({ updatedAt: -1, createdAt: -1 })
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
    const existing = await this.findById(clientId);
    if (!existing) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    // Prevent updating immutable fields
    delete (updateData as any)._id;
    delete (updateData as any).widgetKey;
    delete (updateData as any).secretKey;
    delete (updateData as any).slug;
    delete (updateData as any).isPlatformTenant;

    if (existing.isPlatformTenant) {
      if (updateData.isActive === false) {
        throw new BadRequestException('Cannot deactivate the platform tenant');
      }
      updateData.status = 'live';
    }

    if (updateData.allowedDomains) {
      updateData.allowedDomains = this.normalizeAllowedDomains(
        updateData.allowedDomains,
      );
    }

    const client = await this.clientModel
      .findByIdAndUpdate(clientId, { $set: updateData }, { new: true })
      .exec();

    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    console.log(
      `[TenantService] ✅ Client updated: ${client.name} (${client._id})`,
    );
    return client;
  }

  /**
   * Deactivate a client (soft delete)
   */
  async deactivateClient(
    clientId: string | Types.ObjectId,
  ): Promise<ClientDocument> {
    const existing = await this.findById(clientId);
    if (existing?.isPlatformTenant) {
      throw new BadRequestException('Cannot deactivate the platform tenant');
    }

    const client = await this.clientModel
      .findByIdAndUpdate(clientId, { isActive: false }, { new: true })
      .exec();

    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    console.log(
      `[TenantService] ⚠️ Client deactivated: ${client.name} (${client._id})`,
    );
    return client;
  }

  /**
   * Reactivate a client
   */
  async reactivateClient(
    clientId: string | Types.ObjectId,
  ): Promise<ClientDocument> {
    const client = await this.clientModel
      .findByIdAndUpdate(clientId, { isActive: true }, { new: true })
      .exec();

    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    console.log(
      `[TenantService] ✅ Client reactivated: ${client.name} (${client._id})`,
    );
    return client;
  }

  /**
   * Rotate widget key (generates new public API key)
   */
  async rotateWidgetKey(
    clientId: string | Types.ObjectId,
  ): Promise<{ widgetKey: string }> {
    const existing = await this.findById(clientId);
    if (existing?.isPlatformTenant) {
      throw new BadRequestException(
        'Cannot rotate the platform widget key — it is tied to webchatsales.com',
      );
    }

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
  async rotateSecretKey(
    clientId: string | Types.ObjectId,
  ): Promise<{ secretKey: string }> {
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
  async validateDomain(
    clientId: string | Types.ObjectId,
    domain: string,
  ): Promise<boolean> {
    const client = await this.findById(clientId);
    if (!client) return false;

    // If no domains are configured, allow all (useful during development)
    if (!client.allowedDomains || client.allowedDomains.length === 0) {
      return true;
    }

    const normalized = this.normalizeDomain(domain);
    if (!normalized) return false;

    return client.allowedDomains.some((d) => {
      const normalizedAllowed = this.normalizeDomain(d);
      return normalizedAllowed === normalized;
    });
  }

  /**
   * Build widget preview link for a client
   */
  buildWidgetLink(widgetKey: string): string {
    const frontendBase =
      process.env.FRONTEND_URL?.replace(/\/$/, "") || "http://localhost:3000";
    return `${frontendBase}/widget?widgetKey=${encodeURIComponent(widgetKey)}`;
  }

  /**
   * Build embed script snippet for a client
   */
  buildWidgetEmbedScript(widgetKey: string): string {
    const frontendBase =
      process.env.FRONTEND_URL?.replace(/\/$/, "") || "http://localhost:3000";
    return `<script src="${frontendBase}/abby-widget.js" data-widget-key="${widgetKey}"><\/script>`;
  }

  /**
   * Record widget install ping from client website
   */
  async recordWidgetPing(
    widgetKey: string,
    domain: string,
    pageUrl?: string,
  ): Promise<{
    success: boolean;
    installVerified: boolean;
    domainValid: boolean;
    status?: string;
    message?: string;
  }> {
    const client = await this.clientModel
      .findOne({ widgetKey, isActive: true, isPlatformTenant: { $ne: true } })
      .exec();

    if (!client) {
      return {
        success: false,
        installVerified: false,
        domainValid: false,
        message: "Invalid or inactive widget key",
      };
    }

    if (this.isDraftStatus(client.status)) {
      return {
        success: false,
        installVerified: false,
        domainValid: false,
        status: client.status,
        message: "Widget is not active yet (draft status)",
      };
    }

    const domainValid = await this.validateDomain(client._id, domain);
    const now = new Date();
    const installVerified = domainValid || client.installVerified === true;

    await this.clientModel
      .findByIdAndUpdate(client._id, {
        $set: {
          lastWidgetPingAt: now,
          lastWidgetPingDomain: domain,
          ...(domainValid ? { installVerified: true } : {}),
        },
      })
      .exec();

    await this.addActivationLog(client._id, {
      action: "widget_ping",
      details: `Widget loaded from ${domain}${pageUrl ? ` (${pageUrl})` : ""}${domainValid ? "" : " — domain not in allowlist"}`,
      performedBy: "system",
    });

    return {
      success: true,
      installVerified,
      domainValid,
      status: client.status,
    };
  }

  /**
   * Get deployment status summary for admin
   */
  async getDeploymentStatus(clientId: string | Types.ObjectId) {
    const client = await this.findById(clientId);
    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    const recentLogs = (client.activationLogs || [])
      .slice(-20)
      .reverse();

    return {
      clientId: client._id.toString(),
      name: client.name,
      status: client.status,
      isActive: client.isActive,
      installVerified: client.installVerified === true,
      lastWidgetPingAt: client.lastWidgetPingAt,
      lastWidgetPingDomain: client.lastWidgetPingDomain,
      allowedDomains: client.allowedDomains || [],
      testActivatedAt: client.testActivatedAt,
      activatedAt: client.activatedAt,
      widgetKey: client.widgetKey,
      widgetLink: this.buildWidgetLink(client.widgetKey),
      widgetEmbedScript: this.buildWidgetEmbedScript(client.widgetKey),
      canGoLive:
        client.installVerified === true &&
        client.status !== "live" &&
        client.isActive !== false,
      recentLogs,
    };
  }

  /**
   * Activate client for testing — widget works, domain check is warn-only
   */
  async activateTest(
    clientId: string | Types.ObjectId,
    performedBy?: string,
  ): Promise<ClientDocument> {
    const client = await this.findById(clientId);
    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }
    if (client.isPlatformTenant) {
      throw new BadRequestException("Platform tenant is always live");
    }
    if (client.isActive === false) {
      throw new BadRequestException("Reactivate the client before deploying");
    }

    const fromStatus = client.status;
    const updated = await this.clientModel
      .findByIdAndUpdate(
        clientId,
        { $set: { status: "test", testActivatedAt: new Date() } },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    await this.addActivationLog(clientId, {
      action: "activate_test",
      fromStatus,
      toStatus: "test",
      performedBy: performedBy || "admin",
      details: "Client activated for testing — widget embed enabled",
    });

    console.log(`[TenantService] 🧪 Client activated for test: ${updated.name}`);
    return updated;
  }

  /**
   * Activate client for production — requires install verification unless forced
   */
  async activateLive(
    clientId: string | Types.ObjectId,
    performedBy?: string,
    options?: { force?: boolean },
  ): Promise<ClientDocument> {
    const client = await this.findById(clientId);
    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }
    if (client.isPlatformTenant) {
      throw new BadRequestException("Platform tenant is always live");
    }
    if (client.isActive === false) {
      throw new BadRequestException("Reactivate the client before going live");
    }

    if (!options?.force && !client.installVerified) {
      throw new BadRequestException(
        "Install not verified. Add the embed code to the client site first, or use force activation.",
      );
    }

    const fromStatus = client.status;
    const updated = await this.clientModel
      .findByIdAndUpdate(
        clientId,
        { $set: { status: "live", activatedAt: new Date() } },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    await this.addActivationLog(clientId, {
      action: options?.force ? "activate_live_forced" : "activate_live",
      fromStatus,
      toStatus: "live",
      performedBy: performedBy || "admin",
      details: options?.force
        ? "Client went live (install verification bypassed)"
        : "Client went live after install verification",
    });

    console.log(`[TenantService] 🚀 Client activated live: ${updated.name}`);
    return updated;
  }

  /**
   * Safely deactivate deployment — returns client to draft without deleting account
   */
  async deactivateDeployment(
    clientId: string | Types.ObjectId,
    performedBy?: string,
  ): Promise<ClientDocument> {
    const client = await this.findById(clientId);
    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }
    if (client.isPlatformTenant) {
      throw new BadRequestException("Cannot deactivate platform tenant deployment");
    }

    const fromStatus = client.status;
    const updated = await this.clientModel
      .findByIdAndUpdate(clientId, { $set: { status: "draft" } }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    await this.addActivationLog(clientId, {
      action: "deactivate_deployment",
      fromStatus,
      toStatus: "draft",
      performedBy: performedBy || "admin",
      details: "Widget hidden — client returned to draft",
    });

    console.log(`[TenantService] ⏸️ Client deployment deactivated: ${updated.name}`);
    return updated;
  }

  /**
   * Get activation logs for a client
   */
  async getActivationLogs(clientId: string | Types.ObjectId) {
    const client = await this.findById(clientId);
    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    return [...(client.activationLogs || [])].reverse();
  }

  /**
   * Get public widget config for embed script (non-secret fields only)
   */
  async getWidgetConfig(widgetKey: string) {
    const client = await this.findByWidgetKey(widgetKey);
    if (!client) {
      return null;
    }

    return {
      agentName: client.widgetConfig?.agentName || "Abby",
      welcomeMessage:
        client.widgetConfig?.welcomeMessage || "Hi! How can I help you today?",
      primaryColor: client.widgetConfig?.primaryColor || "#22c55e",
      position: client.widgetConfig?.position || "bottom-right",
      showBranding: client.widgetConfig?.showBranding !== false,
      status: client.status,
    };
  }

  /**
   * Extract request domain from Origin/Referer for live-mode validation
   */
  extractRequestDomain(originOrReferer?: string): string | null {
    if (!originOrReferer) return null;
    return this.normalizeDomain(originOrReferer);
  }

  /**
   * Validate tenant domain for live clients (strict enforcement)
   */
  async validateLiveTenantDomain(
    clientId: string | Types.ObjectId,
    originOrReferer?: string,
  ): Promise<boolean> {
    const domain = this.extractRequestDomain(originOrReferer);
    if (!domain) {
      // No origin — allow (same-origin or server-side)
      return true;
    }
    return this.validateDomain(clientId, domain);
  }

  private async addActivationLog(
    clientId: string | Types.ObjectId,
    entry: {
      action: string;
      fromStatus?: string;
      toStatus?: string;
      performedBy?: string;
      details?: string;
    },
  ): Promise<void> {
    await this.clientModel
      .findByIdAndUpdate(clientId, {
        $push: {
          activationLogs: {
            $each: [entry],
            $slice: -100,
          },
        },
      })
      .exec();
  }

  // --- Private helpers ---

  private isDraftStatus(status?: string): boolean {
    return status === "draft";
  }

  private domainMatchesClient(normalized: string, client: ClientDocument): boolean {
    const allowed = (client.allowedDomains || [])
      .map((d) => this.normalizeDomain(d))
      .filter((d): d is string => !!d);

    if (allowed.includes(normalized)) {
      return true;
    }

    if (client.isPlatformTenant) {
      return config.site.marketingDomains.some(
        (d) => this.normalizeDomain(d) === normalized,
      );
    }

    return false;
  }

  private generateWidgetKey(): string {
    return `wcs_${crypto.randomBytes(24).toString("hex")}`;
  }

  private generateSecretKey(): string {
    return `wcs_sk_${crypto.randomBytes(32).toString("hex")}`;
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
      const withScheme = /^https?:\/\//.test(trimmed)
        ? trimmed
        : `http://${trimmed}`;
      const url = new URL(withScheme);
      const hostname = url.hostname.replace(/^www\./, "");
      return hostname;
    } catch {
      const fallback = trimmed
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .replace(/:\d+$/, "")
        .trim()
        .toLowerCase();
      return fallback.replace(/^www\./, "") || null;
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
