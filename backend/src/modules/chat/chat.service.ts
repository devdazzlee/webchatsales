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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[ChatService] ❌ OPENAI_API_KEY is not set in environment variables!');
      throw new Error('OpenAI API key is required. Please set OPENAI_API_KEY in your .env file.');
    }
    console.log(`[ChatService] ✅ OpenAI API key loaded (length: ${apiKey.length} chars)`);
    this.openai = new OpenAI({
      apiKey: apiKey,
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
    console.log(`[ChatService] Starting streamChatResponse for sessionId: ${sessionId}, message: "${userMessage.substring(0, 50)}..."`);
    
    // Get or create conversation
    let conversation = await this.getConversation(sessionId);
    if (!conversation) {
      console.log(`[ChatService] Creating new conversation for sessionId: ${sessionId}`);
      conversation = await this.createConversation(sessionId);
    }

    // Add user message
    await this.addMessage(sessionId, 'user', userMessage);
    console.log(`[ChatService] User message saved, fetching conversation for OpenAI context`);

    // Refetch conversation to get updated messages array
    conversation = await this.getConversation(sessionId);
    if (!conversation) {
      console.error(`[ChatService] Failed to retrieve conversation after adding message`);
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

    console.log(`[ChatService] Prepared ${messages.length} messages for OpenAI (${messages.map(m => m.role).join(', ')})`);

    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error(`[ChatService] OPENAI_API_KEY is not set!`);
      throw new Error('OpenAI API key is not configured');
    }

    // Stream response from OpenAI
    let fullResponse = '';
    let stream;
    
    try {
      console.log(`[ChatService] Calling OpenAI API with model: gpt-4, message count: ${messages.length}`);
    
    try {
      stream = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        stream: true,
        temperature: 0.7,
      });
      console.log(`[ChatService] ✅ OpenAI stream created successfully`);
    } catch (apiError: any) {
      console.error(`[ChatService] ❌ Failed to create OpenAI stream:`, {
        message: apiError?.message,
        status: apiError?.status,
        code: apiError?.code,
        type: apiError?.type
      });
      throw apiError;
    }

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          yield content;
        }
        
        // Check if stream finished
        if (chunk.choices[0]?.finish_reason) {
          console.log(`[ChatService] Stream finished, total length: ${fullResponse.length} chars`);
          break;
        }
      }

      // Save assistant response
      if (fullResponse && fullResponse.trim()) {
        await this.addMessage(sessionId, 'assistant', fullResponse);
        console.log(`[ChatService] Assistant response saved: ${fullResponse.length} chars`);
      } else {
        console.error(`[ChatService] ERROR: Empty response from OpenAI!`);
        throw new Error('OpenAI returned empty response');
      }
      
    } catch (openaiError: any) {
      console.error(`[ChatService] OpenAI API error for sessionId ${sessionId}:`, openaiError);
      
      // If we got a partial response, save it before throwing
      if (fullResponse && fullResponse.trim()) {
        try {
          await this.addMessage(sessionId, 'assistant', fullResponse);
          console.log(`[ChatService] Saved partial response (${fullResponse.length} chars) after error`);
        } catch (saveError) {
          console.error(`[ChatService] Error saving partial response:`, saveError);
        }
      }
      
      // Re-throw the error so controller can handle it
      throw openaiError;
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

