import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { ClientId } from '../tenant/tenant.decorator';
import { TenantGuard } from '../tenant/tenant.guard';

@Controller('api/book')
@UseGuards(TenantGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  async createBooking(
    @ClientId() clientId: string,
    @Body() body: {
      sessionId: string;
      timeSlot: string; // ISO date string
      schedulingLink?: string;
      leadId?: string;
      userEmail?: string;
      userName?: string;
      userPhone?: string;
      notes?: string;
      conversationId?: string;
    },
  ) {
    const booking = await this.bookingService.createBooking(clientId, {
      ...body,
      timeSlot: new Date(body.timeSlot),
    });
    return {
      success: true,
      booking,
    };
  }

  @Post(':bookingId/status')
  async updateBookingStatus(
    @ClientId() clientId: string,
    @Param('bookingId') bookingId: string,
    @Body() body: { status: string },
  ) {
    const booking = await this.bookingService.updateBookingStatus(clientId, bookingId, body.status);
    return {
      success: true,
      booking,
    };
  }

  // Specific routes must come BEFORE parameterized routes (e.g., :bookingId)
  @Get('availability')
  async getAvailability(
    @ClientId() clientId: string,
    @Query('date') date?: string,
  ) {
    const targetDate = date ? new Date(date) : new Date();
    const slots = await this.bookingService.getAvailability(clientId, targetDate);
    return {
      success: true,
      slots: slots.map(slot => slot.toISOString()),
    };
  }

  @Get('check-session/:sessionId')
  async checkSessionBooking(
    @ClientId() clientId: string,
    @Param('sessionId') sessionId: string,
  ) {
    const hasBooking = await this.bookingService.hasExistingBooking(clientId, sessionId);
    const existingBooking = hasBooking 
      ? await this.bookingService.getBookingBySessionId(clientId, sessionId)
      : null;
    
    return {
      success: true,
      hasBooking,
      booking: existingBooking,
    };
  }

  @Get('session/:sessionId')
  async getBookingBySession(
    @ClientId() clientId: string,
    @Param('sessionId') sessionId: string,
  ) {
    const booking = await this.bookingService.getBookingBySessionId(clientId, sessionId);
    return {
      success: true,
      booking,
    };
  }

  @Get('all')
  async getAllBookings(
    @ClientId() clientId: string,
    @Query('limit') limit?: string,
  ) {
    const bookings = await this.bookingService.getAllBookings(
      clientId,
      limit ? parseInt(limit) : 50,
    );
    return {
      success: true,
      bookings,
    };
  }

  @Get('status/:status')
  async getBookingsByStatus(
    @ClientId() clientId: string,
    @Param('status') status: string,
  ) {
    const bookings = await this.bookingService.getBookingsByStatus(clientId, status);
    return {
      success: true,
      bookings,
    };
  }

  // Parameterized route must come LAST to avoid matching specific routes
  @Get(':bookingId')
  async getBooking(
    @ClientId() clientId: string,
    @Param('bookingId') bookingId: string,
  ) {
    const booking = await this.bookingService.getBookingById(clientId, bookingId);
    return {
      success: true,
      booking,
    };
  }
}
