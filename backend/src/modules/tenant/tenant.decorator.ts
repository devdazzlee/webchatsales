import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

/**
 * Request property key where the resolved tenant is stored
 */
export const TENANT_KEY = 'tenant';

/**
 * @CurrentTenant() — Parameter decorator
 * 
 * Extracts the resolved tenant (Client document) from the request.
 * Must be used with TenantGuard or TenantMiddleware which populates req.tenant.
 * 
 * Usage:
 *   @Get('data')
 *   getData(@CurrentTenant() tenant: TenantContext) { ... }
 */
export const CurrentTenant = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request[TENANT_KEY];
    // If a specific field is requested, return just that field
    return data ? tenant?.[data] : tenant;
  },
);

/**
 * @ClientId() — Parameter decorator (shorthand)
 * 
 * Extracts just the clientId string from the tenant context.
 * 
 * Usage:
 *   @Get('data')
 *   getData(@ClientId() clientId: string) { ... }
 */
export const ClientId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request[TENANT_KEY];
    return tenant?.clientId?.toString() || tenant?._id?.toString();
  },
);

/**
 * @SkipTenant() — Method decorator
 * 
 * Marks a route as not requiring tenant resolution.
 * The TenantGuard will skip tenant checks for decorated handlers.
 * 
 * Usage:
 *   @SkipTenant()
 *   @Get('health')
 *   healthCheck() { ... }
 */
export const SKIP_TENANT_KEY = 'skipTenant';
export const SkipTenant = () => SetMetadata(SKIP_TENANT_KEY, true);

/**
 * Tenant context attached to each request after resolution
 */
export interface TenantContext {
  clientId: string;       // The MongoDB _id of the Client document
  widgetKey: string;      // The public widget API key
  name: string;           // Client/company name
  slug: string;           // URL-safe identifier
  isActive: boolean;      // Whether the client account is active
  plan: string;           // Client's plan
  isDemoMode: boolean;    // Whether in demo mode
  
  // Per-tenant config (resolved at request time)
  notificationEmail: string;
  openaiApiKey?: string;
  openaiModel: string;
  schedulingLink?: string;
  widgetConfig: {
    agentName: string;
    welcomeMessage: string;
    primaryColor: string;
    position: string;
    showBranding: boolean;
    avatarUrl?: string;
    logoUrl?: string;
  };
}
