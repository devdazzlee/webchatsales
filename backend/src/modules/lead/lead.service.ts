import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lead, LeadDocument } from '../../schemas/lead.schema';

@Injectable()
export class LeadService {
  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
  ) {}

  async createLead(leadData: {
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
  }) {
    const lead = new this.leadModel({
      ...leadData,
      qualifiedAt: new Date(),
    });
    return lead.save();
  }

  async updateLead(sessionId: string, updateData: Partial<Lead>) {
    // Use $set to properly handle null values (to clear fields)
    const setData: any = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        setData[key] = updateData[key];
      }
    });
    
    return this.leadModel.findOneAndUpdate(
      { sessionId },
      { $set: setData },
      { new: true, upsert: false }
    ).exec();
  }

  async getLeadBySessionId(sessionId: string) {
    return this.leadModel.findOne({ sessionId }).exec();
  }

  async getLeadByEmail(email: string) {
    return this.leadModel.findOne({ email }).exec();
  }

  async getAllLeads(limit = 50) {
    return this.leadModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getLeadsByStatus(status: string) {
    return this.leadModel
      .find({ status })
      .sort({ createdAt: -1 })
      .exec();
  }
}

