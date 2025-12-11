import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking, BookingDocument } from '../../schemas/booking.schema';

@Injectable()
export class BookingService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
  ) {}

  async createBooking(bookingData: {
    sessionId: string;
    timeSlot: Date;
    schedulingLink?: string;
    leadId?: string;
    userEmail?: string;
    userName?: string;
    userPhone?: string;
    notes?: string;
    conversationId?: string;
  }) {
    const booking = new this.bookingModel({
      ...bookingData,
      bookedAt: new Date(),
    });
    return booking.save();
  }

  async updateBookingStatus(bookingId: string, status: string) {
    return this.bookingModel.findByIdAndUpdate(
      bookingId,
      { status },
      { new: true }
    ).exec();
  }

  async getBookingById(bookingId: string) {
    return this.bookingModel.findById(bookingId).exec();
  }

  async getBookingBySessionId(sessionId: string) {
    return this.bookingModel.findOne({ sessionId }).sort({ createdAt: -1 }).exec();
  }

  async getAllBookings(limit = 50) {
    return this.bookingModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getBookingsByStatus(status: string) {
    return this.bookingModel
      .find({ status })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getAvailability(date: Date) {
    // This is a placeholder - implement actual availability logic
    // For now, return available time slots
    const slots = [];
    const startHour = 9;
    const endHour = 17;
    
    for (let hour = startHour; hour < endHour; hour++) {
      const slotDate = new Date(date);
      slotDate.setHours(hour, 0, 0, 0);
      slots.push(slotDate);
    }
    
    return slots;
  }
}

