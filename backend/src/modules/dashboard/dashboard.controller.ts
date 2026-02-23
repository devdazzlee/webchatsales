import { Controller, Get, Query, Param, Post, Body, UseGuards, SetMetadata } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '../auth/auth.guard';
import { ClientId, SkipTenant } from '../tenant/tenant.decorator';
import { TenantGuard } from '../tenant/tenant.guard';

@Controller('api/dashboard')
@UseGuards(AuthGuard, TenantGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getDashboardStats(@ClientId() clientId: string) {
    const stats = await this.dashboardService.getDashboardStats(clientId);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('conversations')
  async getAllConversations(
    @ClientId() clientId: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const result = await this.dashboardService.getAllConversations(
      clientId,
      limit ? parseInt(limit) : 50,
      skip ? parseInt(skip) : 0,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get('leads')
  async getAllLeads(
    @ClientId() clientId: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.dashboardService.getAllLeads(
      clientId,
      limit ? parseInt(limit) : 50,
      skip ? parseInt(skip) : 0,
      status,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get('tickets')
  async getAllTickets(
    @ClientId() clientId: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.dashboardService.getAllTickets(
      clientId,
      limit ? parseInt(limit) : 50,
      skip ? parseInt(skip) : 0,
      status,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get('payments')
  async getAllPayments(
    @ClientId() clientId: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.dashboardService.getAllPayments(
      clientId,
      limit ? parseInt(limit) : 50,
      skip ? parseInt(skip) : 0,
      status,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get('bookings')
  async getAllBookings(
    @ClientId() clientId: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.dashboardService.getAllBookings(
      clientId,
      limit ? parseInt(limit) : 50,
      skip ? parseInt(skip) : 0,
      status,
      dateFrom,
      dateTo,
      search,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get('conversation/:sessionId')
  async getConversationDetails(
    @ClientId() clientId: string,
    @Param('sessionId') sessionId: string,
  ) {
    const details = await this.dashboardService.getConversationDetails(clientId, sessionId);
    if (!details) {
      return {
        success: false,
        error: 'Conversation not found',
      };
    }
    return {
      success: true,
      data: details,
    };
  }

  @Post('ticket')
  @SkipTenant()
  async receiveTicket(@Body() body: {
    ticketId: string;
    sessionId: string;
    status: string;
    priority: string;
    sentiment: string;
    summary: string;
    transcript: string;
    userEmail?: string;
    userName?: string;
    userPhone?: string;
    conversationId?: string;
    openedAt: Date;
    createdAt: Date;
    leadInfo?: any;
  }) {
    try {
      console.log(`[DashboardController] ✅ Support ticket received: ${body.ticketId}`, {
        sessionId: body.sessionId,
        status: body.status,
        priority: body.priority,
        sentiment: body.sentiment,
        userName: body.userName,
        userEmail: body.userEmail,
      });

      // Ticket data is already stored in MongoDB via SupportService.createSupportTicket
      // This endpoint is for dashboard integration and logging (Phase 2)
      // Dashboard can access tickets via /api/dashboard/tickets endpoint

      return {
        success: true,
        message: 'Ticket received successfully',
        ticketId: body.ticketId,
      };
    } catch (error: any) {
      console.error(`[DashboardController] Error receiving ticket:`, error);
      return {
        success: false,
        error: error.message || 'Failed to receive ticket',
      };
    }
  }

  @Post('transcript')
  @SkipTenant() // Skip tenant for internal service-to-service calls
  async receiveTranscript(@Body() body: {
    sessionId: string;
    transcript: string;
    lead: any;
    conversationId?: string;
  }) {
    // Store transcript for admin dashboard (Phase 2)
    // This endpoint receives qualified lead transcripts
    console.log(`[DashboardController] ✅ Transcript received for session ${body.sessionId}`, {
      transcriptLength: body.transcript.length,
      leadName: body.lead?.name,
      leadEmail: body.lead?.email,
      leadPhone: body.lead?.phone,
      leadServiceNeed: body.lead?.serviceNeed,
    });
    
    // Transcript is already saved in conversation, this endpoint is for logging/processing
    // Dashboard can access full transcript via /api/dashboard/conversation/:sessionId
    // All lead data (name, email, phone, tags, summary, timestamps) is in the lead document
    
    return {
      success: true,
      message: 'Transcript received successfully',
      sessionId: body.sessionId,
      timestamp: new Date().toISOString(),
    };
  }
}
