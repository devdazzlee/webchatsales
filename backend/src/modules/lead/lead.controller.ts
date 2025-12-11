import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { LeadService } from './lead.service';

@Controller('api/lead')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  async createLead(@Body() body: {
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
  }) {
    const lead = await this.leadService.createLead(body);
    return {
      success: true,
      lead,
    };
  }

  @Post('update')
  async updateLead(
    @Body() body: { sessionId: string; updateData: any }
  ) {
    const lead = await this.leadService.updateLead(body.sessionId, body.updateData);
    return {
      success: true,
      lead,
    };
  }

  @Get('session/:sessionId')
  async getLeadBySession(@Param('sessionId') sessionId: string) {
    const lead = await this.leadService.getLeadBySessionId(sessionId);
    return {
      success: true,
      lead,
    };
  }

  @Get('all')
  async getAllLeads(@Query('limit') limit?: string) {
    const leads = await this.leadService.getAllLeads(
      limit ? parseInt(limit) : 50
    );
    return {
      success: true,
      leads,
    };
  }

  @Get('status/:status')
  async getLeadsByStatus(@Param('status') status: string) {
    const leads = await this.leadService.getLeadsByStatus(status);
    return {
      success: true,
      leads,
    };
  }
}

