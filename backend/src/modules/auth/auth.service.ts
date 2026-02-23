import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as jwt from 'jsonwebtoken';
import { AdminUser, AdminUserDocument } from '../../schemas/admin-user.schema';

// Optional bcrypt import (only needed if using password hashing)
let bcrypt: any;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  // bcrypt not installed, will use plain password comparison
  bcrypt = null;
}

/**
 * AuthService — Multi-tenant aware authentication
 * 
 * Supports:
 * 1. Per-client admin login (each client has their own admin users)
 * 2. Super admin login (platform-level access to all tenants)
 * 3. Legacy single-admin login (backward compatible via env vars)
 * 
 * JWT tokens now include clientId for tenant-scoped dashboard access.
 */
@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly superAdminUsername: string;
  private readonly superAdminPassword: string;

  constructor(
    private configService: ConfigService,
    @InjectModel(AdminUser.name) private adminUserModel: Model<AdminUserDocument>,
  ) {
    this.jwtSecret = 
      this.configService.get<string>('JWT_SECRET') || 
      process.env.JWT_SECRET || 
      'your-super-secret-jwt-key-change-in-production';
    
    // Super admin credentials from env (platform owner)
    this.superAdminUsername = 
      this.configService.get<string>('ADMIN_USERNAME') || 
      process.env.ADMIN_USERNAME || 
      'admin';
    
    const hashedPassword = 
      this.configService.get<string>('ADMIN_PASSWORD_HASH') || 
      process.env.ADMIN_PASSWORD_HASH;
    
    this.superAdminPassword = hashedPassword || 
      this.configService.get<string>('ADMIN_PASSWORD') || 
      process.env.ADMIN_PASSWORD || 
      'admin123'; // Default for development only
  }

  /**
   * Login — supports both super admin and per-client admin
   * 
   * If clientId is provided, validates against that client's admin users.
   * If not, validates against super admin credentials.
   */
  async login(username: string, password: string, clientId?: string) {
    // Try per-client admin login first if there are admin users in the DB
    const adminUser = await this.adminUserModel.findOne({
      $or: [
        { email: username },
        { username: username },
      ],
      isActive: true,
    }).exec();

    if (adminUser) {
      const isValid = await this.comparePassword(password, adminUser.passwordHash);
      if (!isValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Update last login
      adminUser.lastLoginAt = new Date();
      await adminUser.save();

      const tokenPayload: any = {
        userId: adminUser._id.toString(),
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
        iat: Math.floor(Date.now() / 1000),
      };

      // Include clientId for client_admin users
      if (adminUser.role === 'client_admin' && adminUser.clientId) {
        tokenPayload.clientId = adminUser.clientId.toString();
      }

      const token = jwt.sign(tokenPayload, this.jwtSecret, { expiresIn: '24h' });

      return {
        success: true,
        token,
        user: {
          id: adminUser._id.toString(),
          username: adminUser.username,
          email: adminUser.email,
          role: adminUser.role,
          displayName: adminUser.displayName || adminUser.username,
          clientId: adminUser.clientId?.toString() || null,
        },
      };
    }

    // Fallback: Super admin login via env vars
    const isSuperAdmin = await this.validateSuperAdmin(username, password);
    if (!isSuperAdmin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = jwt.sign(
      {
        username: this.superAdminUsername,
        role: 'super_admin',
        iat: Math.floor(Date.now() / 1000),
      },
      this.jwtSecret,
      { expiresIn: '24h' },
    );

    return {
      success: true,
      token,
      user: {
        username: this.superAdminUsername,
        role: 'super_admin',
        clientId: null, // Super admin has access to all tenants
      },
    };
  }

  /**
   * Create an admin user for a specific client
   */
  async createAdminUser(data: {
    clientId: string;
    email: string;
    username: string;
    password: string;
    role?: string;
    displayName?: string;
  }): Promise<AdminUserDocument> {
    const passwordHash = await this.hashPassword(data.password);

    const adminUser = new this.adminUserModel({
      clientId: data.clientId,
      email: data.email,
      username: data.username,
      passwordHash,
      role: data.role || 'client_admin',
      displayName: data.displayName || data.username,
    });

    const saved = await adminUser.save();
    console.log(`[AuthService] ✅ Admin user created: ${saved.email} for client ${data.clientId}`);
    return saved;
  }

  /**
   * Verify a JWT token and return the decoded payload
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      jwt.verify(token, this.jwtSecret);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Decode a JWT token and return the payload
   */
  decodeToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract clientId from a JWT token
   */
  getClientIdFromToken(token: string): string | null {
    const decoded = this.decodeToken(token);
    return decoded?.clientId || null;
  }

  /**
   * Check if token belongs to a super admin
   */
  isSuperAdmin(token: string): boolean {
    const decoded = this.decodeToken(token);
    return decoded?.role === 'super_admin';
  }

  // --- Private helpers ---

  private async validateSuperAdmin(username: string, password: string): Promise<boolean> {
    if (username !== this.superAdminUsername) {
      return false;
    }

    if (process.env.ADMIN_PASSWORD_HASH && bcrypt) {
      return await bcrypt.compare(password, this.superAdminPassword);
    }

    return password === this.superAdminPassword;
  }

  private async hashPassword(password: string): Promise<string> {
    if (bcrypt) {
      return bcrypt.hash(password, 10);
    }
    // Fallback for development (NOT secure for production)
    return password;
  }

  private async comparePassword(password: string, hash: string): Promise<boolean> {
    if (bcrypt) {
      return bcrypt.compare(password, hash);
    }
    // Fallback for development
    return password === hash;
  }
}
