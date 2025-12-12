import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { BookingService } from './booking.service';

@Controller('api/book')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  async createBooking(@Body() body: {
    sessionId: string;
    timeSlot: string; // ISO date string
    schedulingLink?: string;
    leadId?: string;
    userEmail?: string;
    userName?: string;
    userPhone?: string;
    notes?: string;
    conversationId?: string;
  }) {
    const booking = await this.bookingService.createBooking({
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
    @Param('bookingId') bookingId: string,
    @Body() body: { status: string }
  ) {
    const booking = await this.bookingService.updateBookingStatus(bookingId, body.status);
    return {
      success: true,
      booking,
    };
  }

  // Specific routes must come BEFORE parameterized routes (e.g., :bookingId)
  @Get('availability')
  async getAvailability(@Query('date') date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const slots = await this.bookingService.getAvailability(targetDate);
    return {
      success: true,
      slots: slots.map(slot => slot.toISOString()),
    };
  }

  @Get('check-session/:sessionId')
  async checkSessionBooking(@Param('sessionId') sessionId: string) {
    const hasBooking = await this.bookingService.hasExistingBooking(sessionId);
    const existingBooking = hasBooking 
      ? await this.bookingService.getBookingBySessionId(sessionId)
      : null;
    
    return {
      success: true,
      hasBooking,
      booking: existingBooking,
    };
  }

  @Get('session/:sessionId')
  async getBookingBySession(@Param('sessionId') sessionId: string) {
    const booking = await this.bookingService.getBookingBySessionId(sessionId);
    return {
      success: true,
      booking,
    };
  }

  @Get('all')
  async getAllBookings(@Query('limit') limit?: string) {
    const bookings = await this.bookingService.getAllBookings(
      limit ? parseInt(limit) : 50
    );
    return {
      success: true,
      bookings,
    };
  }

  @Get('status/:status')
  async getBookingsByStatus(@Param('status') status: string) {
    const bookings = await this.bookingService.getBookingsByStatus(status);
    return {
      success: true,
      bookings,
    };
  }

  // Parameterized route must come LAST to avoid matching specific routes
  @Get(':bookingId')
  async getBooking(@Param('bookingId') bookingId: string) {
    const booking = await this.bookingService.getBookingById(bookingId);
    return {
      success: true,
      booking,
    };
  }
}

