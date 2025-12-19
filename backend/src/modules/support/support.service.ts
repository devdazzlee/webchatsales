import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SupportTicket, SupportTicketDocument } from '../../schemas/support-ticket.schema';
import { EmailService } from '../email/email.service';

@Injectable()
export class SupportService {
  constructor(
    @InjectModel(SupportTicket.name) private supportTicketModel: Model<SupportTicketDocument>,
    private emailService: EmailService,
  ) {}

  generateTicketId(): string {
    return `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  async createSupportTicket(ticketData: {
    sessionId: string;
    transcript: string;
    sentiment?: string;
    summary?: string;
    userEmail?: string;
    userName?: string;
    userPhone?: string;
    conversationId?: string;
    priority?: string;
  }) {
    const ticketId = this.generateTicketId();
    const ticket = new this.supportTicketModel({
      ...ticketData,
      ticketId,
      openedAt: new Date(),
      status: 'open', // Ensure status is set
      priority: ticketData.priority || 'medium',
    });
    const savedTicket = await ticket.save();

    // Send confirmation email to user
    if (ticketData.userEmail && ticketData.userName) {
      try {
        await this.emailService.sendTicketCreationConfirmation(
          ticketData.userEmail,
          ticketData.userName,
          ticketId
        );
        console.log(`[SupportService] ✅ Ticket creation confirmation sent to user: ${ticketData.userEmail}`);
      } catch (emailError) {
        console.error(`[SupportService] Error sending ticket confirmation to user:`, emailError);
      }
    }

    // Send notification email to admin
    try {
      await this.emailService.sendTicketCreationNotification(
        ticketData.userEmail || 'unknown@example.com',
        ticketData.userName || 'Unknown User',
        ticketId,
        ticketData.summary,
        ticketData.sentiment || 'neutral'
      );
      console.log(`[SupportService] ✅ Ticket creation notification sent to admin`);
    } catch (emailError) {
      console.error(`[SupportService] Error sending ticket notification to admin:`, emailError);
    }

    return savedTicket;
  }

  async updateTicketStatus(ticketId: string, status: string) {
    const updateData: any = { status };
    if (status === 'resolved' || status === 'closed') {
      updateData.resolvedAt = new Date();
    }
    return this.supportTicketModel.findOneAndUpdate(
      { ticketId },
      updateData,
      { new: true }
    ).exec();
  }

  async getTicketByTicketId(ticketId: string) {
    return this.supportTicketModel.findOne({ ticketId }).exec();
  }

  async getTicketBySessionId(sessionId: string) {
    return this.supportTicketModel.findOne({ sessionId }).sort({ createdAt: -1 }).exec();
  }

  async getAllTickets(limit = 50) {
    return this.supportTicketModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getTicketsByStatus(status: string) {
    return this.supportTicketModel
      .find({ status })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getTicketsByPriority(priority: string) {
    return this.supportTicketModel
      .find({ priority })
      .sort({ createdAt: -1 })
      .exec();
  }
}

