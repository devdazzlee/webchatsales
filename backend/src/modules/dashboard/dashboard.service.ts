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

  async getDashboardStats(clientId: string) {
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
      this.conversationModel.countDocuments({ clientId }),
      this.conversationModel.countDocuments({ clientId, isActive: true }),
      this.leadModel.countDocuments({ clientId }),
      this.leadModel.countDocuments({ clientId, status: 'qualified' }),
      this.supportTicketModel.countDocuments({ clientId }),
      this.supportTicketModel.countDocuments({ clientId, status: 'open' }),
      this.paymentModel.countDocuments({ clientId }),
      this.paymentModel.countDocuments({ clientId, status: 'completed' }),
      this.bookingModel.countDocuments({ clientId }),
      this.bookingModel.countDocuments({ clientId, status: 'scheduled' }),
      this.conversationModel.find({ clientId }).sort({ lastMessageAt: -1 }).limit(10).exec(),
      this.leadModel.find({ clientId }).sort({ createdAt: -1 }).limit(10).exec(),
      this.supportTicketModel.find({ clientId }).sort({ createdAt: -1 }).limit(10).exec(),
      this.paymentModel.find({ clientId }).sort({ createdAt: -1 }).limit(10).exec(),
      this.bookingModel.find({ clientId }).sort({ createdAt: -1 }).limit(10).exec(),
    ]);

    // Calculate revenue
    const revenueData = await this.paymentModel.aggregate([
      { $match: { clientId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    // Get leads by status
    const leadsByStatus = await this.leadModel.aggregate([
      { $match: { clientId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Get tickets by priority
    const ticketsByPriority = await this.supportTicketModel.aggregate([
      { $match: { clientId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    // Get payments by status
    const paymentsByStatus = await this.paymentModel.aggregate([
      { $match: { clientId } },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]);

    // Get conversations over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const conversationsOverTime = await this.conversationModel.aggregate([
      { $match: { clientId, createdAt: { $gte: thirtyDaysAgo } } },
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

  async getAllConversations(clientId: string, limit = 50, skip = 0) {
    const [conversations, total] = await Promise.all([
      this.conversationModel
        .find({ clientId })
        .sort({ lastMessageAt: -1 })
        .limit(limit)
        .skip(skip)
        .exec(),
      this.conversationModel.countDocuments({ clientId }),
    ]);

    return {
      conversations,
      total,
      limit,
      skip,
    };
  }

  async getAllLeads(clientId: string, limit = 50, skip = 0, status?: string) {
    const query: any = { clientId };
    if (status) query.status = status;

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

  async getAllTickets(clientId: string, limit = 50, skip = 0, status?: string) {
    const query: any = { clientId };
    if (status) query.status = status;

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

  async getAllPayments(clientId: string, limit = 50, skip = 0, status?: string) {
    const query: any = { clientId };
    if (status) query.status = status;

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

  async getAllBookings(clientId: string, limit = 50, skip = 0, status?: string, dateFrom?: string, dateTo?: string, search?: string) {
    const query: any = { clientId };
    
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

  async getConversationDetails(clientId: string, sessionId: string) {
    const conversation = await this.conversationModel.findOne({ clientId, sessionId }).exec();
    if (!conversation) {
      return null;
    }

    // Get related data — all scoped to the same client
    const [lead, ticket, booking, payment] = await Promise.all([
      this.leadModel.findOne({ clientId, sessionId }).exec(),
      this.supportTicketModel.findOne({ clientId, sessionId }).sort({ createdAt: -1 }).exec(),
      this.bookingModel.findOne({ clientId, sessionId }).sort({ createdAt: -1 }).exec(),
      this.paymentModel.findOne({ clientId, sessionId }).sort({ createdAt: -1 }).exec(),
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
