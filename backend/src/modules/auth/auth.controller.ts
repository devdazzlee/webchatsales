import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    try {
      const result = await this.authService.login(body.username, body.password);
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }
      throw error;
    }
  }

  @Post('verify')
  async verifyToken(@Body() body: { token: string }) {
    try {
      const isValid = await this.authService.verifyToken(body.token);
      return {
        success: true,
        valid: isValid,
      };
    } catch (error) {
      return {
        success: false,
        valid: false,
      };
    }
  }
}

