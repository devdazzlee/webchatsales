import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TENANT_KEY, SKIP_TENANT_KEY } from './tenant.decorator';

/**
 * TenantGuard — Ensures a valid tenant context exists on the request
 * 
 * Applied to controllers/routes that REQUIRE tenant isolation.
 * Routes decorated with @SkipTenant() bypass this guard.
 * 
 * Usage:
 *   @UseGuards(TenantGuard)
 *   @Controller('api/chat')
 *   export class ChatController { ... }
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route explicitly skips tenant requirement
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

    return true;
  }
}
