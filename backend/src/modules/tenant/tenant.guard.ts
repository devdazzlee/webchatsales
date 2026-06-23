import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TENANT_KEY, SKIP_TENANT_KEY } from './tenant.decorator';
import { TenantService } from './tenant.service';

/**
 * TenantGuard — Ensures a valid tenant context exists on the request
 *
 * Applied to controllers/routes that REQUIRE tenant isolation.
 * Routes decorated with @SkipTenant() bypass this guard.
 *
 * Status semantics:
 * - draft: blocked
 * - test: allowed (domain check warn-only via ping)
 * - live: allowed with strict domain validation
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenantService: TenantService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipTenant = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipTenant) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenant = request[TENANT_KEY];

    if (!tenant) {
      throw new ForbiddenException(
        'Tenant context required. Provide a valid x-widget-key header, x-client-id header, or ensure your domain is registered.',
      );
    }

    if (!tenant.isActive) {
      throw new ForbiddenException(
        'This client account has been deactivated. Contact support for assistance.',
      );
    }

    if (tenant.isPlatformTenant) {
      return true;
    }

    if (tenant.status === 'draft') {
      throw new ForbiddenException(
        'This chat widget is not active yet. The account is still being configured.',
      );
    }

    // Live clients: enforce domain whitelist when Origin/Referer is present
    if (tenant.status === 'live') {
      const origin = request.headers.origin || request.headers.referer;
      if (origin) {
        const domainValid = await this.tenantService.validateLiveTenantDomain(
          tenant.clientId,
          origin as string,
        );
        if (!domainValid) {
          throw new ForbiddenException(
            'This widget is not authorized for this domain. Contact support to update allowed domains.',
          );
        }
      }
    }

    return true;
  }
}
