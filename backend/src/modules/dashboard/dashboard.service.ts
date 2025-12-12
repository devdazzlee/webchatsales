import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation, ConversationDocument } from '../../schemas/conversation.schema';
import { Lead, LeadDocument } from '../../schemas/lead.schema';
import { SupportTicket, SupportTicketDocument } from '../../schemas/support-ticket.schema';
import { Payment, PaymentDocument } from '../../schemas/payment.schema';
import { Booking, BookingDocument } from '../../schemas/booking.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(SupportTicket.name) private supportTicketModel: Model<SupportTicketDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
  ) {}

  async getDashboardStats() {
    const [
      totalConversations,
      activeConversations,
      totalLeads,
      qualifiedLeads,
      totalTickets,
      openTickets,
      totalPayments,
      completedPayments,
      totalBookings,
      scheduledBookings,
      recentConversations,
      recentLeads,
      recentTickets,
      recentPayments,
      recentBookings,
    ] = await Promise.all([
      this.conversationModel.countDocuments({}),
      this.conversationModel.countDocuments({ isActive: true }),
      this.leadModel.countDocuments({}),
      this.leadModel.countDocuments({ status: 'qualified' }),
      this.supportTicketModel.countDocuments({}),
      this.supportTicketModel.countDocuments({ status: 'open' }),
      this.paymentModel.countDocuments({}),
      this.paymentModel.countDocuments({ status: 'completed' }),
      this.bookingModel.countDocuments({}),
      this.bookingModel.countDocuments({ status: 'scheduled' }),
      this.conversationModel.find().sort({ lastMessageAt: -1 }).limit(10).exec(),
      this.leadModel.find().sort({ createdAt: -1 }).limit(10).exec(),
      this.supportTicketModel.find().sort({ createdAt: -1 }).limit(10).exec(),
      this.paymentModel.find().sort({ createdAt: -1 }).limit(10).exec(),
      this.bookingModel.find().sort({ createdAt: -1 }).limit(10).exec(),
    ]);

    // Calculate revenue
    const revenueData = await this.paymentModel.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    // Get leads by status
    const leadsByStatus = await this.leadModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Get tickets by priority
    const ticketsByPriority = await this.supportTicketModel.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    // Get payments by status
    const paymentsByStatus = await this.paymentModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]);

    // Get conversations over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const conversationsOverTime = await this.conversationModel.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      stats: {
        conversations: {
          total: totalConversations,
          active: activeConversations,
        },
        leads: {
          total: totalLeads,
          qualified: qualifiedLeads,
        },
        tickets: {
          total: totalTickets,
          open: openTickets,
        },
        payments: {
          total: totalPayments,
          completed: completedPayments,
          revenue: totalRevenue,
        },
        bookings: {
          total: totalBookings,
          scheduled: scheduledBookings,
        },
      },
      breakdowns: {
        leadsByStatus,
        ticketsByPriority,
        paymentsByStatus,
      },
      trends: {
        conversationsOverTime,
      },
      recent: {
        conversations: recentConversations,
        leads: recentLeads,
        tickets: recentTickets,
        payments: recentPayments,
        bookings: recentBookings,
      },
    };
  }

  async getAllConversations(limit = 50, skip = 0) {
    const [conversations, total] = await Promise.all([
      this.conversationModel
        .find()
        .sort({ lastMessageAt: -1 })
        .limit(limit)
        .skip(skip)
        .exec(),
      this.conversationModel.countDocuments({}),
    ]);

    return {
      conversations,
      total,
      limit,
      skip,
    };
  }

  async getAllLeads(limit = 50, skip = 0, status?: string) {
    const query = status ? { status } : {};
    const [leads, total] = await Promise.all([
      this.leadModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .exec(),
      this.leadModel.countDocuments(query),
    ]);

    return {
      leads,
      total,
      limit,
      skip,
    };
  }

  async getAllTickets(limit = 50, skip = 0, status?: string) {
    const query = status ? { status } : {};
    const [tickets, total] = await Promise.all([
      this.supportTicketModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .exec(),
      this.supportTicketModel.countDocuments(query),
    ]);

    return {
      tickets,
      total,
      limit,
      skip,
    };
  }

  async getAllPayments(limit = 50, skip = 0, status?: string) {
    const query = status ? { status } : {};
    const [payments, total] = await Promise.all([
      this.paymentModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .exec(),
      this.paymentModel.countDocuments(query),
    ]);

    return {
      payments,
      total,
      limit,
      skip,
    };
  }

  async getAllBookings(limit = 50, skip = 0, status?: string, dateFrom?: string, dateTo?: string, search?: string) {
    const query: any = {};
    
    // Status filter
    if (status) {
      query.status = status;
    }
    
    // Date range filter (for timeSlot)
    if (dateFrom || dateTo) {
      query.timeSlot = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        query.timeSlot.$gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.timeSlot.$lte = toDate;
      }
    }
    
    // Search filter (name or email)
    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
      ];
    }
    
    const [bookings, total] = await Promise.all([
      this.bookingModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .exec(),
      this.bookingModel.countDocuments(query),
    ]);

    return {
      bookings,
      total,
      limit,
      skip,
    };
  }

  async getConversationDetails(sessionId: string) {
    const conversation = await this.conversationModel.findOne({ sessionId }).exec();
    if (!conversation) {
      return null;
    }

    // Get related data
    const [lead, ticket, booking, payment] = await Promise.all([
      this.leadModel.findOne({ sessionId }).exec(),
      this.supportTicketModel.findOne({ sessionId }).sort({ createdAt: -1 }).exec(),
      this.bookingModel.findOne({ sessionId }).sort({ createdAt: -1 }).exec(),
      this.paymentModel.findOne({ sessionId }).sort({ createdAt: -1 }).exec(),
    ]);

    return {
      conversation,
      lead,
      ticket,
      booking,
      payment,
    };
  }
}

