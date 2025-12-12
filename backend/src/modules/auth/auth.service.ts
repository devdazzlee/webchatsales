import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

// Optional bcrypt import (only needed if using password hashing)
let bcrypt: any;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  // bcrypt not installed, will use plain password comparison
  bcrypt = null;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly adminUsername: string;
  private readonly adminPassword: string;

  constructor(private configService: ConfigService) {
    this.jwtSecret = 
      this.configService.get<string>('JWT_SECRET') || 
      process.env.JWT_SECRET || 
      'your-super-secret-jwt-key-change-in-production';
    
    this.adminUsername = 
      this.configService.get<string>('ADMIN_USERNAME') || 
      process.env.ADMIN_USERNAME || 
      'admin';
    
    // In production, use hashed password from env
    const hashedPassword = 
      this.configService.get<string>('ADMIN_PASSWORD_HASH') || 
      process.env.ADMIN_PASSWORD_HASH;
    
    this.adminPassword = hashedPassword || 
      this.configService.get<string>('ADMIN_PASSWORD') || 
      process.env.ADMIN_PASSWORD || 
      'admin123'; // Default for development only
  }

  async validateAdmin(username: string, password: string): Promise<boolean> {
    if (username !== this.adminUsername) {
      return false;
    }

    // If password hash is set and bcrypt is available, use bcrypt comparison
    if (process.env.ADMIN_PASSWORD_HASH && bcrypt) {
      return await bcrypt.compare(password, this.adminPassword);
    }

    // Otherwise, simple comparison (development only)
    return password === this.adminPassword;
  }

  async login(username: string, password: string) {
    const isValid = await this.validateAdmin(username, password);
    
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        username: this.adminUsername,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
      },
      this.jwtSecret,
      { expiresIn: '24h' }
    );

    return {
      success: true,
      token,
      user: {
        username: this.adminUsername,
        role: 'admin',
      },
    };
  }

  async verifyToken(token: string): Promise<boolean> {
    try {
      jwt.verify(token, this.jwtSecret);
      return true;
    } catch (error) {
      return false;
    }
  }

  decodeToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      return null;
    }
  }
}

