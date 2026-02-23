import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking, BookingDocument } from '../../schemas/booking.schema';

@Injectable()
export class BookingService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
  ) {}

  async createBooking(clientId: string, bookingData: {
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
      clientId,
      bookedAt: new Date(),
    });
    return booking.save();
  }

  async updateBookingStatus(clientId: string, bookingId: string, status: string) {
    return this.bookingModel.findOneAndUpdate(
      { _id: bookingId, clientId },
      { status },
      { new: true }
    ).exec();
  }

  async getBookingById(clientId: string, bookingId: string) {
    return this.bookingModel.findOne({ _id: bookingId, clientId }).exec();
  }

  async getBookingBySessionId(clientId: string, sessionId: string) {
    return this.bookingModel.findOne({ clientId, sessionId }).sort({ createdAt: -1 }).exec();
  }

  async getAllBookings(clientId: string, limit = 50) {
    return this.bookingModel
      .find({ clientId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getBookingsByStatus(clientId: string, status: string) {
    return this.bookingModel
      .find({ clientId, status })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getAvailability(clientId: string, date: Date) {
    // Generate all possible time slots for the date
    // Only show availability after 4:30 PM and until 9:00 PM
    const slots = [];
    const startHour = 16; // 4 PM
    const startMinute = 30; // Start at 4:30 PM
    const endHour = 21; // 9 PM
    
    // Add the first slot at 4:30 PM
    const firstSlot = new Date(date);
    firstSlot.setHours(startHour, startMinute, 0, 0);
    slots.push(firstSlot);
    
    // Generate slots from 5:00 PM to 9:00 PM (every 30 minutes)
    for (let hour = startHour + 1; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Skip 9:30 PM slot (only include up to 9:00 PM)
        if (hour === endHour && minute === 30) {
          continue;
        }
        const slotDate = new Date(date);
        slotDate.setHours(hour, minute, 0, 0);
        slots.push(slotDate);
      }
    }
    
    // Get all booked slots for this date (scheduled or confirmed status) — scoped to client
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const bookedSlots = await this.bookingModel
      .find({
        clientId,
        timeSlot: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['scheduled', 'confirmed'] },
      })
      .select('timeSlot')
      .exec();
    
    // Extract booked time slots (rounded to nearest 30 minutes)
    const bookedTimes = bookedSlots.map(booking => {
      const bookedDate = new Date(booking.timeSlot);
      bookedDate.setSeconds(0, 0);
      const minutes = bookedDate.getMinutes();
      bookedDate.setMinutes(minutes < 30 ? 0 : 30);
      return bookedDate.getTime();
    });
    
    // Filter out booked slots
    const availableSlots = slots.filter(slot => {
      const slotTime = slot.getTime();
      return !bookedTimes.includes(slotTime);
    });
    
    return availableSlots;
  }

  /**
   * Check if a specific time slot is available for a client
   */
  async isTimeSlotAvailable(clientId: string, timeSlot: Date): Promise<boolean> {
    const slot = new Date(timeSlot);
    slot.setSeconds(0, 0);
    const minutes = slot.getMinutes();
    slot.setMinutes(minutes < 30 ? 0 : 30);
    
    const existingBooking = await this.bookingModel
      .findOne({
        clientId,
        timeSlot: {
          $gte: new Date(slot.getTime() - 15 * 60 * 1000),
          $lte: new Date(slot.getTime() + 15 * 60 * 1000),
        },
        status: { $in: ['scheduled', 'confirmed'] },
      })
      .exec();
    
    return !existingBooking;
  }

  /**
   * Check if a user (sessionId) already has a booking for a client
   */
  async hasExistingBooking(clientId: string, sessionId: string): Promise<boolean> {
    const existingBooking = await this.bookingModel
      .findOne({
        clientId,
        sessionId,
        status: { $in: ['scheduled', 'confirmed'] },
      })
      .exec();
    
    return !!existingBooking;
  }
}
