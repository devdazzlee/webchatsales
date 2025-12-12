import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
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
    
    const isValid = this.authService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }
}

