import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';
import { TENANT_KEY, TenantContext } from './tenant.decorator';

/**
 * TenantMiddleware — Resolves tenant context on every request
 * 
 * Resolution order:
 * 1. x-widget-key header (primary — used by embedded chat widget)
 * 2. x-client-id header (used by authenticated dashboard/admin requests)
 * 3. Origin/Referer header domain matching (fallback for widget)
 * 
 * If no tenant can be resolved, the request continues WITHOUT a tenant context.
 * Individual guards/controllers decide if tenant is required.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    let client = null;

    // Strategy 1: Widget key in header (x-widget-key)
    const widgetKey = req.headers['x-widget-key'] as string;
    if (widgetKey) {
      client = await this.tenantService.findByWidgetKey(widgetKey);
      if (client) {
        this.attachTenant(req, client);
        return next();
      }
      // Invalid widget key — don't fail, just continue without tenant
      console.warn(`[TenantMiddleware] ⚠️ Invalid widget key: ${widgetKey.substring(0, 12)}...`);
    }

    // Strategy 2: Client ID in header (from authenticated JWT-based requests)
    const clientIdHeader = req.headers['x-client-id'] as string;
    if (clientIdHeader) {
      client = await this.tenantService.findById(clientIdHeader);
      if (client) {
        this.attachTenant(req, client);
        return next();
      }
    }

    // Strategy 3: Widget key in query string (?widgetKey=wcs_xxx)
    const widgetKeyQuery = req.query?.widgetKey as string;
    if (widgetKeyQuery) {
      client = await this.tenantService.findByWidgetKey(widgetKeyQuery);
      if (client) {
        this.attachTenant(req, client);
        return next();
      }
    }

    // Strategy 4: Domain matching via Origin or Referer header
    const origin = req.headers.origin || req.headers.referer;
    if (origin) {
      client = await this.tenantService.findByDomain(origin);
      if (client) {
        this.attachTenant(req, client);
        return next();
      }
    }

    // No tenant resolved — request continues without tenant context
    // Guards will enforce tenant requirement where needed
    next();
  }

  /**
   * Attach resolved tenant context to the request object
   */
  private attachTenant(req: Request, client: any): void {
    const tenantContext: TenantContext = {
      clientId: client._id.toString(),
      widgetKey: client.widgetKey,
      name: client.name,
      slug: client.slug,
      isActive: client.isActive,
      plan: client.plan,
      isDemoMode: client.isDemoMode || false,
      notificationEmail: client.notificationEmail || client.ownerEmail,
      openaiApiKey: client.openaiApiKey,
      openaiModel: client.openaiModel || 'gpt-4o-mini',
      schedulingLink: client.schedulingLink,
      widgetConfig: {
        agentName: client.widgetConfig?.agentName || 'Abby',
        welcomeMessage: client.widgetConfig?.welcomeMessage || 'Hi! How can I help you today?',
        primaryColor: client.widgetConfig?.primaryColor || '#22c55e',
        position: client.widgetConfig?.position || 'bottom-right',
        showBranding: client.widgetConfig?.showBranding !== false,
        avatarUrl: client.widgetConfig?.avatarUrl,
        logoUrl: client.widgetConfig?.logoUrl,
      },
    };

    (req as any)[TENANT_KEY] = tenantContext;
  }
}
