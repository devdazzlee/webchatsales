import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { SupportService } from './support.service';

@Controller('api/support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('ticket')
  async createTicket(@Body() body: {
    sessionId: string;
    transcript: string;
    sentiment?: string;
    summary?: string;
    userEmail?: string;
    userName?: string;
    conversationId?: string;
    priority?: string;
  }) {
    const ticket = await this.supportService.createSupportTicket(body);
    return {
      success: true,
      ticket,
    };
  }

  @Post('ticket/:ticketId/status')
  async updateTicketStatus(
    @Param('ticketId') ticketId: string,
    @Body() body: { status: string }
  ) {
    const ticket = await this.supportService.updateTicketStatus(ticketId, body.status);
    return {
      success: true,
      ticket,
    };
  }

  @Get('ticket/:ticketId')
  async getTicket(@Param('ticketId') ticketId: string) {
    const ticket = await this.supportService.getTicketByTicketId(ticketId);
    return {
      success: true,
      ticket,
    };
  }

  @Get('session/:sessionId')
  async getTicketBySession(@Param('sessionId') sessionId: string) {
    const ticket = await this.supportService.getTicketBySessionId(sessionId);
    return {
      success: true,
      ticket,
    };
  }

  @Get('all')
  async getAllTickets(@Query('limit') limit?: string) {
    const tickets = await this.supportService.getAllTickets(
      limit ? parseInt(limit) : 50
    );
    return {
      success: true,
      tickets,
    };
  }

  @Get('status/:status')
  async getTicketsByStatus(@Param('status') status: string) {
    const tickets = await this.supportService.getTicketsByStatus(status);
    return {
      success: true,
      tickets,
    };
  }
}

