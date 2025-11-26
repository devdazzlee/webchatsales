import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import OpenAI from 'openai';
import { Conversation, ConversationDocument } from '../../schemas/conversation.schema';

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async createConversation(sessionId: string, userEmail?: string, userName?: string) {
    const conversation = new this.conversationModel({
      sessionId,
      messages: [],
      isActive: true,
      userEmail,
      userName,
      startedAt: new Date(),
    });
    return conversation.save();
  }

  async getConversation(sessionId: string) {
    return this.conversationModel.findOne({ sessionId, isActive: true }).exec();
  }

  async addMessage(sessionId: string, role: 'user' | 'assistant', content: string) {
    try {
      const conversation = await this.getConversation(sessionId);
      
      if (!conversation) {
        console.error(`[ChatService] Conversation not found for sessionId: ${sessionId}`);
        throw new Error('Conversation not found');
      }

      const message = {
        role,
        content,
        timestamp: new Date(),
      };

      // Ensure messages array exists
      if (!conversation.messages) {
        conversation.messages = [];
      }

      conversation.messages.push(message);
      conversation.lastMessageAt = new Date();
      conversation.markModified('messages'); // Explicitly mark array as modified
      
      const saved = await conversation.save();
      console.log(`[ChatService] Message saved: sessionId=${sessionId}, role=${role}, messageCount=${saved.messages.length}`);
      
      return message;
    } catch (error) {
      console.error(`[ChatService] Error adding message:`, error);
      throw error;
    }
  }

  async *streamChatResponse(sessionId: string, userMessage: string) {
    // Get or create conversation
    let conversation = await this.getConversation(sessionId);
    if (!conversation) {
      conversation = await this.createConversation(sessionId);
    }

    // Add user message
    await this.addMessage(sessionId, 'user', userMessage);

    // Refetch conversation to get updated messages array
    conversation = await this.getConversation(sessionId);
    if (!conversation) {
      throw new Error('Failed to retrieve conversation after adding message');
    }

    // Prepare messages for OpenAI
    const systemPrompt = `You are Abby, an AI sales assistant for WebChat Sales. You help businesses with:
- Lead qualification and booking meetings
- Customer service inquiries
- Product information and pricing
- Sales assistance

Be friendly, professional, and helpful. Keep responses concise but informative. Always offer to help with specific next steps.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversation.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
    ];

    // Stream response from OpenAI
    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      stream: true,
      temperature: 0.7,
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        yield content;
      }
    }

    // Save assistant response
    if (fullResponse) {
      try {
        await this.addMessage(sessionId, 'assistant', fullResponse);
        console.log(`[ChatService] Assistant response saved for sessionId: ${sessionId}`);
      } catch (error) {
        console.error(`[ChatService] Error saving assistant response:`, error);
        // Don't throw - response was already streamed to user
      }
    }
  }

  async getAllConversations(limit = 50) {
    return this.conversationModel
      .find({ isActive: true })
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .exec();
  }

  async deactivateConversation(sessionId: string) {
    return this.conversationModel.updateOne(
      { sessionId },
      { isActive: false }
    ).exec();
  }
}

