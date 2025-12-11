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

  @Get(':bookingId')
  async getBooking(@Param('bookingId') bookingId: string) {
    const booking = await this.bookingService.getBookingById(bookingId);
    return {
      success: true,
      booking,
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

  @Get('availability')
  async getAvailability(@Query('date') date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const slots = await this.bookingService.getAvailability(targetDate);
    return {
      success: true,
      slots,
    };
  }
}

