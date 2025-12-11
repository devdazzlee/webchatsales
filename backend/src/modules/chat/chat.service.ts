import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OpenAI } from 'openai';
import { Conversation, ConversationDocument } from '../../schemas/conversation.schema';
import { LeadService } from '../lead/lead.service';
import { SupportService } from '../support/support.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class ChatService {
  private openaiClient: OpenAI;
  private model: string;

  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    private configService: ConfigService,
    private leadService: LeadService,
    private supportService: SupportService,
    private emailService: EmailService,
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
    const systemPrompt = `You are Abby, an AI sales assistant for WebChat Sales. Your role is to:

1. LEAD QUALIFICATION (Primary Focus):
   - Greet users instantly and warmly
   - Qualify leads by gathering: name, email, phone, service need, timing, and budget
   - Ask questions naturally in conversation flow
   - Handle basic objections with empathy and facts
   - When qualified, offer to book a demo using a scheduling link
   - Be friendly, humorous when appropriate, and empathetic

2. SUPPORT HANDLING:
   - If a user expresses problems, issues, or complaints, acknowledge them immediately
   - Show empathy and offer solutions
   - Support tickets are automatically created, so focus on helping the user

3. SALES FLOW:
   - Guide users through understanding WebChat Sales benefits
   - Explain pricing clearly (Founder Special: $279 for first month, regular $479/mo)
   - Use humor and personality to build rapport
   - Always end with a clear next step

IMPORTANT INSTRUCTIONS:
- Extract lead information (name, email, phone) from conversation naturally
- Don't be pushy, but be persistent in a friendly way
- When booking demos, provide a scheduling link or ask for preferred time
- Be conversational, not robotic
- Show personality and humor when appropriate
- For scheduling, you can say: "I'd love to book a demo for you! What time works best?" or provide a link if available

Remember: Your goal is to qualify leads and book demos while providing excellent customer service.`;

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
        
        // Process conversation for lead qualification and support detection
        await this.processConversationForActions(sessionId, userMessage, fullResponse);
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

  private async processConversationForActions(sessionId: string, userMessage: string, assistantResponse: string) {
    try {
      const conversation = await this.getConversation(sessionId);
      if (!conversation) return;

      // Check for support issues
      const supportKeywords = ['problem', 'issue', 'complaint', 'error', 'broken', 'not working', 'help', 'fix', 'bug', 'wrong', 'bad', 'terrible', 'awful', 'disappointed', 'frustrated', 'angry'];
      const userMessageLower = userMessage.toLowerCase();
      const hasSupportIssue = supportKeywords.some(keyword => userMessageLower.includes(keyword));

      if (hasSupportIssue) {
        await this.handleSupportIssue(sessionId, conversation);
      }

      // Extract lead information and check if qualified
      await this.extractAndSaveLead(sessionId, conversation);
    } catch (error) {
      console.error(`[ChatService] Error processing conversation actions:`, error);
    }
  }

  private async handleSupportIssue(sessionId: string, conversation: any) {
    try {
      // Check if ticket already exists
      const existingTicket = await this.supportService.getTicketBySessionId(sessionId);
      if (existingTicket) {
        return; // Ticket already created
      }

      // Analyze sentiment
      const sentiment = this.analyzeSentiment(conversation.messages);
      
      // Determine priority based on sentiment and keywords
      let priority = 'medium';
      const urgentKeywords = ['urgent', 'critical', 'emergency', 'immediately', 'asap', 'broken', 'down'];
      const conversationText = conversation.messages.map((m: any) => m.content).join(' ').toLowerCase();
      if (urgentKeywords.some(kw => conversationText.includes(kw)) || sentiment === 'very_negative') {
        priority = 'high';
      }

      // Create transcript
      const transcript = conversation.messages
        .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Abby'}: ${msg.content}`)
        .join('\n\n');

      // Create support ticket
      const ticket = await this.supportService.createSupportTicket({
        sessionId,
        transcript,
        sentiment,
        summary: `Support request from ${conversation.userName || 'user'}`,
        userEmail: conversation.userEmail,
        userName: conversation.userName,
        conversationId: conversation._id.toString(),
        priority,
      });

      console.log(`[ChatService] ✅ Support ticket created: ${ticket.ticketId}`);

      // Send notification to admin (transcript will be sent to admin endpoint in Phase 2)
      // For now, we'll log it
      console.log(`[ChatService] Support ticket ${ticket.ticketId} created for session ${sessionId}`);
    } catch (error) {
      console.error(`[ChatService] Error handling support issue:`, error);
    }
  }

  private analyzeSentiment(messages: any[]): string {
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'disappointed', 'frustrated', 'angry', 'worst', 'horrible'];
    const veryNegativeWords = ['hate', 'worst', 'horrible', 'terrible', 'awful', 'angry'];
    
    const allText = messages.map(m => m.content).join(' ').toLowerCase();
    
    const veryNegativeCount = veryNegativeWords.filter(word => allText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => allText.includes(word)).length;
    
    if (veryNegativeCount >= 2) return 'very_negative';
    if (negativeCount >= 2) return 'negative';
    if (negativeCount >= 1) return 'neutral';
    return 'positive';
  }

  private async extractAndSaveLead(sessionId: string, conversation: any) {
    try {
      // Extract lead information from conversation
      const messages = conversation.messages.map((m: any) => m.content).join(' ');
      
      // Use OpenAI to extract structured lead data
      const extractionPrompt = `Extract lead information from this conversation. Return JSON with: name, email, phone, serviceNeed, timing, budget. If information is not available, use null.

Conversation:
${messages}

Return only valid JSON, no other text.`;

      try {
        const extractionResponse = await this.openaiClient.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a data extraction assistant. Extract lead information from conversations and return only valid JSON.' },
            { role: 'user', content: extractionPrompt },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        });

        const extractedData = JSON.parse(extractionResponse.choices[0].message.content || '{}');
        
        // Check if we have enough information to create/update a lead
        const hasName = extractedData.name && extractedData.name !== 'null' && extractedData.name.trim();
        const hasEmail = extractedData.email && extractedData.email !== 'null' && extractedData.email.trim();
        const hasPhone = extractedData.phone && extractedData.phone !== 'null' && extractedData.phone.trim();
        const hasServiceNeed = extractedData.serviceNeed && extractedData.serviceNeed !== 'null' && extractedData.serviceNeed.trim();

        if (hasName || hasEmail || hasPhone || hasServiceNeed) {
          // Check if lead already exists
          let lead = await this.leadService.getLeadBySessionId(sessionId);
          
          const leadData: any = {
            sessionId,
            conversationId: conversation._id.toString(),
          };

          if (hasName) leadData.name = extractedData.name.trim();
          if (hasEmail) leadData.email = extractedData.email.trim();
          if (hasPhone) leadData.phone = extractedData.phone.trim();
          if (hasServiceNeed) leadData.serviceNeed = extractedData.serviceNeed.trim();
          if (extractedData.timing && extractedData.timing !== 'null') leadData.timing = extractedData.timing.trim();
          if (extractedData.budget && extractedData.budget !== 'null') leadData.budget = extractedData.budget.trim();

          // Generate summary
          const summaryPrompt = `Summarize this lead in 2-3 sentences: ${JSON.stringify(leadData)}`;
          try {
            const summaryResponse = await this.openaiClient.chat.completions.create({
              model: this.model,
              messages: [
                { role: 'system', content: 'You are a lead summarization assistant. Create concise summaries.' },
                { role: 'user', content: summaryPrompt },
              ],
              temperature: 0.5,
              max_tokens: 100,
            });
            leadData.summary = summaryResponse.choices[0].message.content?.trim() || '';
          } catch (summaryError) {
            leadData.summary = `Lead interested in ${leadData.serviceNeed || 'services'}`;
          }

          if (lead) {
            // Update existing lead
            await this.leadService.updateLead(sessionId, leadData);
            console.log(`[ChatService] ✅ Lead updated for session ${sessionId}`);
          } else {
            // Create new lead
            lead = await this.leadService.createLead(leadData);
            console.log(`[ChatService] ✅ Lead created for session ${sessionId}`);

            // If lead is qualified (has name, email, and service need), send transcript to admin
            if (hasName && hasEmail && hasServiceNeed) {
              try {
                const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_EMAIL;
                if (adminEmail) {
                  await this.emailService.sendEmail(
                    adminEmail,
                    `New Qualified Lead: ${leadData.name}`,
                    `
                      <h2>New Qualified Lead</h2>
                      <p><strong>Name:</strong> ${leadData.name}</p>
                      <p><strong>Email:</strong> ${leadData.email}</p>
                      <p><strong>Phone:</strong> ${leadData.phone || 'Not provided'}</p>
                      <p><strong>Service Need:</strong> ${leadData.serviceNeed}</p>
                      <p><strong>Timing:</strong> ${leadData.timing || 'Not specified'}</p>
                      <p><strong>Budget:</strong> ${leadData.budget || 'Not specified'}</p>
                      <p><strong>Summary:</strong> ${leadData.summary}</p>
                      <p><strong>Session ID:</strong> ${sessionId}</p>
                    `
                  );
                  console.log(`[ChatService] ✅ Lead notification sent to admin`);
                }
              } catch (emailError) {
                console.error(`[ChatService] Error sending lead notification:`, emailError);
              }
            }
          }
        }
      } catch (extractionError) {
        console.error(`[ChatService] Error extracting lead data:`, extractionError);
      }
    } catch (error) {
      console.error(`[ChatService] Error in extractAndSaveLead:`, error);
    }
  }
}

