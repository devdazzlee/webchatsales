import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { TENANT_KEY, TenantContext } from '../tenant/tenant.decorator';
import { TenantService } from '../tenant/tenant.service';

/**
 * AuthGuard — Multi-tenant aware authentication guard
 * 
 * Validates JWT tokens and enriches the request with tenant context
 * from the token's clientId. This is the primary guard for
 * dashboard/admin endpoints.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private tenantService: TenantService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route has skipAuth metadata (for internal endpoints)
    const skipAuth = this.reflector.get<boolean>('skipAuth', context.getHandler());
    if (skipAuth) {
      return true; // Skip authentication for this route
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    
    const isValid = await this.authService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Decode token to extract user info and clientId
    const decoded = this.authService.decodeToken(token);
    if (!decoded) {
      throw new UnauthorizedException('Failed to decode token');
    }

    // Attach user info to request
    request.user = decoded;

    // If JWT contains clientId, resolve and attach tenant context
    if (decoded.clientId) {
      const client = await this.tenantService.findById(decoded.clientId);
      if (client && client.isActive) {
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
        request[TENANT_KEY] = tenantContext;
      }
    }

    return true;
  }
}
