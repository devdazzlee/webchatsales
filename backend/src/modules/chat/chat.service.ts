import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OpenAI } from 'openai';
import { Conversation, ConversationDocument } from '../../schemas/conversation.schema';

@Injectable()
export class ChatService {
  private openaiClient: OpenAI;
  private model: string;

  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    private configService: ConfigService,
  ) {
    // Get OpenAI API key from environment variables
    const openaiApiKey = 
      this.configService.get<string>('OPENAI_API_KEY') || 
      process.env.OPENAI_API_KEY;
    
    // Get model name from environment or use default
    this.model = 
      this.configService.get<string>('OPENAI_MODEL') || 
      process.env.OPENAI_MODEL || 
      'gpt-4o-mini';
    
    if (!openaiApiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable is required. Please set it in your .env file.\n' +
        'Get your API key from: https://platform.openai.com/api-keys'
      );
    }
    
    // Initialize OpenAI client
    this.openaiClient = new OpenAI({
      apiKey: openaiApiKey,
    });
    
    console.log(`[ChatService] ✅ OpenAI API initialized with model: ${this.model} (key ends with: ${openaiApiKey.substring(openaiApiKey.length - 6)})`);
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
    console.log(`[ChatService] User message saved, fetching conversation for AI context`);

    // Refetch conversation to get updated messages array
    conversation = await this.getConversation(sessionId);
    if (!conversation) {
      console.error(`[ChatService] Failed to retrieve conversation after adding message`);
      throw new Error('Failed to retrieve conversation after adding message');
    }

    // Prepare messages for OpenAI API format
    const systemPrompt = `You are Abby, an AI sales assistant for WebChat Sales. You help businesses with:
- Lead qualification and booking meetings
- Customer service inquiries
- Product information and pricing
- Sales assistance

Be friendly, professional, and helpful. Keep responses concise but informative. Always offer to help with specific next steps.`;

    // Convert conversation messages to OpenAI format
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    
    // Add system prompt if this is the first message
    const historyMessages = conversation.messages.filter(msg => msg.role !== 'system');
    if (historyMessages.length === 1 && historyMessages[0].role === 'user') {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    // Build conversation history - convert to OpenAI format
    for (const msg of historyMessages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    console.log(`[ChatService] Calling OpenAI API with model: ${this.model}, message count: ${messages.length}`);
    
    let fullResponse = '';
    
    try {
      // Call OpenAI API with streaming
      const stream = await this.openaiClient.chat.completions.create({
        model: this.model,
        messages: messages as any,
        temperature: 0.7,
        stream: true,
      });

      // Stream the response chunks
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          yield content; // Yield each chunk as it arrives
        }
      }

      console.log(`[ChatService] ✅ OpenAI API response received (${fullResponse.length} chars)`);

      // Save assistant response
      if (fullResponse && fullResponse.trim()) {
        await this.addMessage(sessionId, 'assistant', fullResponse);
        console.log(`[ChatService] Assistant response saved: ${fullResponse.length} chars`);
      } else {
        console.error(`[ChatService] ERROR: Empty response from AI!`);
        throw new Error('AI returned empty response');
      }
      
    } catch (aiError: any) {
      console.error(`[ChatService] OpenAI API error for sessionId ${sessionId}:`, aiError);
      
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
      throw aiError;
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

