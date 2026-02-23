import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { ClientId } from '../tenant/tenant.decorator';
import { TenantGuard } from '../tenant/tenant.guard';

@Controller('api/support')
@UseGuards(TenantGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('ticket')
  async createTicket(
    @ClientId() clientId: string,
    @Body() body: {
      sessionId: string;
      transcript: string;
      sentiment?: string;
      summary?: string;
      userEmail?: string;
      userName?: string;
      conversationId?: string;
      priority?: string;
    },
  ) {
    const ticket = await this.supportService.createSupportTicket(clientId, body);
    return {
      success: true,
      ticket,
    };
  }

  @Post('ticket/:ticketId/status')
  async updateTicketStatus(
    @ClientId() clientId: string,
    @Param('ticketId') ticketId: string,
    @Body() body: { status: string },
  ) {
    const ticket = await this.supportService.updateTicketStatus(clientId, ticketId, body.status);
    return {
      success: true,
      ticket,
    };
  }

  @Get('ticket/:ticketId')
  async getTicket(
    @ClientId() clientId: string,
    @Param('ticketId') ticketId: string,
  ) {
    const ticket = await this.supportService.getTicketByTicketId(clientId, ticketId);
    return {
      success: true,
      ticket,
    };
  }

  @Get('session/:sessionId')
  async getTicketBySession(
    @ClientId() clientId: string,
    @Param('sessionId') sessionId: string,
  ) {
    const ticket = await this.supportService.getTicketBySessionId(clientId, sessionId);
    return {
      success: true,
      ticket,
    };
  }

  @Get('all')
  async getAllTickets(
    @ClientId() clientId: string,
    @Query('limit') limit?: string,
  ) {
    const tickets = await this.supportService.getAllTickets(
      clientId,
      limit ? parseInt(limit) : 50,
    );
    return {
      success: true,
      tickets,
    };
  }

  @Get('status/:status')
  async getTicketsByStatus(
    @ClientId() clientId: string,
    @Param('status') status: string,
  ) {
    const tickets = await this.supportService.getTicketsByStatus(clientId, status);
    return {
      success: true,
      tickets,
    };
  }
}
