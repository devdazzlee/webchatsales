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
    
    // Get all booked slots for this date (scheduled or confirmed status)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const bookedSlots = await this.bookingModel
      .find({
        timeSlot: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['scheduled', 'confirmed'] }, // Only count active bookings
      })
      .select('timeSlot')
      .exec();
    
    // Extract booked time slots (rounded to nearest 30 minutes)
    const bookedTimes = bookedSlots.map(booking => {
      const bookedDate = new Date(booking.timeSlot);
      bookedDate.setSeconds(0, 0);
      // Round to nearest 30 minutes
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
   * Check if a specific time slot is available
   */
  async isTimeSlotAvailable(timeSlot: Date): Promise<boolean> {
    // Round to nearest 30 minutes for comparison
    const slot = new Date(timeSlot);
    slot.setSeconds(0, 0);
    const minutes = slot.getMinutes();
    slot.setMinutes(minutes < 30 ? 0 : 30);
    
    // Check if there's an existing booking at this time (scheduled or confirmed)
    const existingBooking = await this.bookingModel
      .findOne({
        timeSlot: {
          $gte: new Date(slot.getTime() - 15 * 60 * 1000), // 15 min before
          $lte: new Date(slot.getTime() + 15 * 60 * 1000), // 15 min after
        },
        status: { $in: ['scheduled', 'confirmed'] },
      })
      .exec();
    
    return !existingBooking;
  }

  /**
   * Check if a user (sessionId) already has a booking
   */
  async hasExistingBooking(sessionId: string): Promise<boolean> {
    const existingBooking = await this.bookingModel
      .findOne({
        sessionId,
        status: { $in: ['scheduled', 'confirmed'] }, // Only count active bookings
      })
      .exec();
    
    return !!existingBooking;
  }
}

