import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LeadService } from './lead.service';
import { ClientId } from '../tenant/tenant.decorator';
import { TenantGuard } from '../tenant/tenant.guard';

@Controller('api/lead')
@UseGuards(TenantGuard)
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  async createLead(
    @ClientId() clientId: string,
    @Body() body: {
      sessionId: string;
      name?: string;
      email?: string;
      phone?: string;
      serviceNeed?: string;
      timing?: string;
      budget?: string;
      tags?: string[];
      summary?: string;
      conversationId?: string;
    },
  ) {
    const lead = await this.leadService.createLead(clientId, body);
    return {
      success: true,
      lead,
    };
  }

  @Post('update')
  async updateLead(
    @ClientId() clientId: string,
    @Body() body: { sessionId: string; updateData: any },
  ) {
    const lead = await this.leadService.updateLead(clientId, body.sessionId, body.updateData);
    return {
      success: true,
      lead,
    };
  }

  @Get('session/:sessionId')
  async getLeadBySession(
    @ClientId() clientId: string,
    @Param('sessionId') sessionId: string,
  ) {
    const lead = await this.leadService.getLeadBySessionId(clientId, sessionId);
    return {
      success: true,
      lead,
    };
  }

  @Get('all')
  async getAllLeads(
    @ClientId() clientId: string,
    @Query('limit') limit?: string,
  ) {
    const leads = await this.leadService.getAllLeads(
      clientId,
      limit ? parseInt(limit) : 50,
    );
    return {
      success: true,
      leads,
    };
  }

  @Get('status/:status')
  async getLeadsByStatus(
    @ClientId() clientId: string,
    @Param('status') status: string,
  ) {
    const leads = await this.leadService.getLeadsByStatus(clientId, status);
    return {
      success: true,
      leads,
    };
  }
}
