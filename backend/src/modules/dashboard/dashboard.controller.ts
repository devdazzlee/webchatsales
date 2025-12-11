import { Controller, Get, Query, Param } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getDashboardStats() {
    const stats = await this.dashboardService.getDashboardStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('conversations')
  async getAllConversations(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const result = await this.dashboardService.getAllConversations(
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
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.dashboardService.getAllLeads(
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
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.dashboardService.getAllTickets(
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
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.dashboardService.getAllPayments(
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
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.dashboardService.getAllBookings(
      limit ? parseInt(limit) : 50,
      skip ? parseInt(skip) : 0,
      status,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get('conversation/:sessionId')
  async getConversationDetails(@Param('sessionId') sessionId: string) {
    const details = await this.dashboardService.getConversationDetails(sessionId);
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
}

