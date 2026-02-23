import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Types } from 'mongoose';
import { AuthGuard } from '../auth/auth.guard';
import { TenantService } from './tenant.service';

@Controller('api/tenants')
@UseGuards(AuthGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  async createTenant(
    @Req() req: Request,
    @Body()
    body: {
      name: string;
      ownerEmail: string;
      ownerName?: string;
      ownerPhone?: string;
      companyWebsite?: string;
      industry?: string;
      allowedDomains?: string[];
      plan?: string;
      notificationEmail?: string;
      schedulingLink?: string;
      isDemoMode?: boolean;
    },
  ) {
    this.assertSuperAdmin(req);
    const client = await this.tenantService.createClient(body);
    return {
      success: true,
      client,
    };
  }

  @Get()
  async listTenants(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('isActive') isActive?: string,
  ) {
    this.assertSuperAdmin(req);
    const parsedIsActive =
      typeof isActive === 'string' ? isActive.toLowerCase() === 'true' : undefined;

    const result = await this.tenantService.listClients({
      limit: limit ? parseInt(limit, 10) : 50,
      skip: skip ? parseInt(skip, 10) : 0,
      isActive: parsedIsActive,
    });

    return {
      success: true,
      ...result,
    };
  }

  @Get(':tenantId')
  async getTenantById(@Req() req: Request, @Param('tenantId') tenantId: string) {
    this.assertSuperAdmin(req);
    this.assertObjectId(tenantId);

    const client = await this.tenantService.findById(tenantId);
    return {
      success: true,
      client,
    };
  }

  @Patch(':tenantId')
  async updateTenant(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Body() body: Record<string, any>,
  ) {
    this.assertSuperAdmin(req);
    this.assertObjectId(tenantId);

    const client = await this.tenantService.updateClient(tenantId, body);
    return {
      success: true,
      client,
    };
  }

  @Post(':tenantId/deactivate')
  async deactivateTenant(@Req() req: Request, @Param('tenantId') tenantId: string) {
    this.assertSuperAdmin(req);
    this.assertObjectId(tenantId);

    const client = await this.tenantService.deactivateClient(tenantId);
    return {
      success: true,
      client,
    };
  }

  @Post(':tenantId/reactivate')
  async reactivateTenant(@Req() req: Request, @Param('tenantId') tenantId: string) {
    this.assertSuperAdmin(req);
    this.assertObjectId(tenantId);

    const client = await this.tenantService.reactivateClient(tenantId);
    return {
      success: true,
      client,
    };
  }

  @Post(':tenantId/rotate-widget-key')
  async rotateWidgetKey(@Req() req: Request, @Param('tenantId') tenantId: string) {
    this.assertSuperAdmin(req);
    this.assertObjectId(tenantId);

    const key = await this.tenantService.rotateWidgetKey(tenantId);
    return {
      success: true,
      ...key,
    };
  }

  @Post(':tenantId/rotate-secret-key')
  async rotateSecretKey(@Req() req: Request, @Param('tenantId') tenantId: string) {
    this.assertSuperAdmin(req);
    this.assertObjectId(tenantId);

    const key = await this.tenantService.rotateSecretKey(tenantId);
    return {
      success: true,
      ...key,
    };
  }

  private assertSuperAdmin(req: Request): void {
    const user = (req as any).user;
    if (!user || user.role !== 'super_admin') {
      throw new ForbiddenException('Super admin access required');
    }
  }

  private assertObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new ForbiddenException('Invalid tenant ID');
    }
  }
}
