import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lead, LeadDocument } from '../../schemas/lead.schema';

@Injectable()
export class LeadService {
  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
  ) {}

  async createLead(clientId: string, leadData: {
    sessionId: string;
    name?: string;
    email?: string;
    phone?: string;
    serviceNeed?: string;
    timing?: string;
    budget?: string;
    tags?: string[];
    summary?: string;
    conversationId?: string;
    hasBuyingIntent?: boolean;
    status?: string;
  }) {
    const lead = new this.leadModel({
      ...leadData,
      clientId,
      qualifiedAt: new Date(),
    });
    return lead.save();
  }

  async updateLead(clientId: string, sessionId: string, updateData: Partial<Lead>) {
    // Use $set to properly handle null values (to clear fields)
    const setData: any = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        setData[key] = updateData[key];
      }
    });
    
    return this.leadModel.findOneAndUpdate(
      { clientId, sessionId },
      { $set: setData },
      { new: true, upsert: false }
    ).exec();
  }

  async getLeadBySessionId(clientId: string, sessionId: string) {
    return this.leadModel.findOne({ clientId, sessionId }).exec();
  }

  async getLeadByEmail(clientId: string, email: string) {
    return this.leadModel.findOne({ clientId, email }).exec();
  }

  async getAllLeads(clientId: string, limit = 50) {
    return this.leadModel
      .find({ clientId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getLeadsByStatus(clientId: string, status: string) {
    return this.leadModel
      .find({ clientId, status })
      .sort({ createdAt: -1 })
      .exec();
  }
}
