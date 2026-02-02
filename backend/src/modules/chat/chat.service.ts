import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OpenAI } from 'openai';
import { Conversation, ConversationDocument } from '../../schemas/conversation.schema';
import { LeadService } from '../lead/lead.service';
import { SupportService } from '../support/support.service';
import { EmailService } from '../email/email.service';
import { BookingService } from '../booking/booking.service';
import { PromptBuilderService } from './prompt-builder.service';
import { SalesAgentPromptService } from './sales-agent-prompt.service';
import { config } from '../../config/config';

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
    private bookingService: BookingService,
    private promptBuilder: PromptBuilderService,
    private salesAgentPrompt: SalesAgentPromptService,
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

  /**
   * Checks if discovery phase is complete
   * SENIOR APPROACH: Count message exchanges, not keywords
   * The AI decides what to ask based on conversation context
   */
  private async checkDiscoveryPhase(conversation: any): Promise<{ isComplete: boolean; discoveryCount: number; nextDiscoveryQuestion?: string | null }> {
    // Filter to user and assistant messages only
    const messages = (conversation.messages || []).filter((m: any) => m.role !== 'system');
    
    // Count exchanges (user-assistant pairs)
    const userMessages = messages.filter((m: any) => m.role === 'user');
    const assistantMessages = messages.filter((m: any) => m.role === 'assistant');
    
    // Discovery is complete after at least 2 exchanges
    // The AI handles what questions to ask through the system prompt
    const exchangeCount = Math.min(userMessages.length, assistantMessages.length);
    const isComplete = exchangeCount >= 2;
    
    return {
      isComplete,
      discoveryCount: assistantMessages.length,
      nextDiscoveryQuestion: null, // AI decides through system prompt
    };
  }

  /**
   * Get next sales agent discovery question (NEW 9-STEP FLOW - Jan 2026)
   * 1. Name - "Who am I speaking with?"
   * 2. Business type - "What type of business is this?"
   * 3. Lead source - "How do leads usually come in for you?"
   * 4. Leads per week - "Roughly how many per week?"
   * 5. Deal value - "What's a typical deal or job worth?"
   * 6. After-hours pain - "What happens when leads come in after hours?"
   * 7. [Tie-back] - Automatic transition, not a question
   */
  private getNextSalesAgentDiscoveryQuestion(existingLead: any): string | null {
    // Step 2: Business type
    if (!existingLead?.businessType) {
      return "What type of business is this?";
    }
    // Step 3: Lead source
    if (!existingLead?.leadSource) {
      return "How do leads usually come in for you?";
    }
    // Step 4: Leads per week
    if (!existingLead?.leadsPerWeek) {
      return "Roughly how many per week?";
    }
    // Step 5: Deal value
    if (!existingLead?.dealValue) {
      return "What's a typical deal or job worth?";
    }
    // Step 6: After-hours pain
    if (!existingLead?.afterHoursPain) {
      return "What happens when leads come in after hours or when you're busy?";
    }
    return null; // Discovery complete - ready for tie-back and closing
  }

  /**
   * Get next sales agent qualification question (after discovery)
   * Only collect email + business name when closing
   */
  private getNextSalesAgentQualificationQuestion(existingLead: any): string | null {
    // Sales agent qualification: email → phone (for closing)
    if (!existingLead?.email) {
      return "What's your email?";
    }
    if (!existingLead?.phone) {
      return "And your phone number?";
    }
    return null; // Qualification complete - ready for closing
  }

  /**
   * Determines what qualification question to ask next based on collected lead data
   * This is a programmatic approach that checks the database for collected information
   * STRICT: Does not move to next question until current one is properly answered
   * Returns either a string (question) or an object with question and validation failure info
   */
  private async getNextQualificationQuestion(sessionId: string, lastValidationFailure?: { field: string; reason?: string } | null): Promise<string | { question: string; lastFailure?: { field: string; reason?: string } } | null> {
    // Check existing lead data from database (most reliable source)
    const existingLead = await this.leadService.getLeadBySessionId(sessionId);
    
    // Check if we should use sales agent flow (client websites, not demo mode)
    const isDemoMode = process.env.DEMO_MODE === 'true' || 
                       process.env.DEMO_MODE === '1' ||
                       (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('webchatsales.com'));
    
    if (!isDemoMode) {
      // Sales agent flow: Check discovery first, then qualification
      const discoveryQuestion = this.getNextSalesAgentDiscoveryQuestion(existingLead);
      if (discoveryQuestion) {
        return discoveryQuestion;
      }
      // Discovery complete, check qualification
      const qualificationQuestion = this.getNextSalesAgentQualificationQuestion(existingLead);
      if (qualificationQuestion) {
        return qualificationQuestion;
      }
      // All questions answered - ready for closing
      return null;
    }
    
    // Use AI to validate existing answers to ensure they're still valid
    // This catches cases where an invalid update attempt should keep us on the same question
    const hasName = existingLead?.name && existingLead.name.trim().length > 2;
    
    // Check email - validate format
    const hasEmail = existingLead?.email && 
                     existingLead.email.trim().length > 0 && 
                     /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(existingLead.email.trim());
    
    // Check phone - very lenient validation: just needs to contain digits
    const hasPhone = existingLead?.phone && 
                     existingLead.phone.trim().length > 0 &&
                     /\d/.test(existingLead.phone.replace(/\s/g, ''));
    
    // Validate existing serviceNeed with AI if it exists
    let hasServiceNeed = false;
    if (existingLead?.serviceNeed && existingLead.serviceNeed.trim().length > 3) {
      const isInvalid = await this.isInvalidAnswer(existingLead.serviceNeed, 'serviceNeed');
      hasServiceNeed = !isInvalid;
    }
    
    // Validate existing timing and budget with AI if they exist
    // "unsure" is treated as a valid answer (user was asked but didn't provide specific answer)
    let hasTiming = false;
    if (existingLead?.timing && existingLead.timing.trim().length > 2) {
      const timingLower = existingLead.timing.toLowerCase().trim();
      // "unsure" is acceptable - treat as answered
      if (timingLower === 'unsure' || timingLower.includes('unsure')) {
        hasTiming = true;
      } else {
        const isInvalid = await this.isInvalidAnswer(existingLead.timing, 'timing');
        hasTiming = !isInvalid;
      }
    }
    
    let hasBudget = false;
    let budgetIsUnknown = false;
    if (existingLead?.budget && existingLead.budget.trim().length > 2) {
      // SENIOR APPROACH: Use AI to determine if budget is "unknown" type answer
      const budgetValue = existingLead.budget.trim();
      try {
        const budgetCheckResponse = await this.openaiClient.chat.completions.create({
          model: this.model,
          messages: [
            { 
              role: 'system', 
              content: 'Analyze if this budget response indicates the person does not know their budget. Return ONLY "unknown" if they don\'t know, or "known" if they provided a specific budget or range.' 
            },
            { role: 'user', content: `Budget response: "${budgetValue}"` },
          ],
          temperature: 0.1,
          max_tokens: 10,
        });
        
        const result = budgetCheckResponse.choices[0]?.message?.content?.trim().toLowerCase() || 'known';
        budgetIsUnknown = result === 'unknown';
        hasBudget = true; // Budget was answered (either known or unknown)
      } catch (error) {
        // Fallback: if AI fails, check if budget has value
        hasBudget = budgetValue.length > 0;
      }
    }

    // Check qualified questions (asked when budget is unknown or after basic qualification)
    const hasLeadsPerDay = existingLead?.leadsPerDay && existingLead.leadsPerDay.trim().length > 0;
    const hasOvernightLeads = existingLead?.overnightLeads && existingLead.overnightLeads.trim().length > 0;
    const hasReturnCallTiming = existingLead?.returnCallTiming && existingLead.returnCallTiming.trim().length > 0;

    // Log current state for debugging
    console.log(`[ChatService] Qualification state check for ${sessionId}:`, {
      hasName,
      hasEmail,
      hasPhone,
      hasServiceNeed,
      hasTiming,
      hasBudget,
      budgetIsUnknown,
      hasLeadsPerDay,
      hasOvernightLeads,
      hasReturnCallTiming,
      name: existingLead?.name,
      email: existingLead?.email,
      phone: existingLead?.phone,
      serviceNeed: existingLead?.serviceNeed,
      timing: existingLead?.timing,
      budget: existingLead?.budget
    });

    // Determine next question based on what's missing (frame as helping tailor solution)
    if (!hasName) {
      return lastValidationFailure?.field === 'name' 
        ? { question: "To make sure I share the most relevant info, I'd love to know your name. What should I call you?", lastFailure: lastValidationFailure }
        : "To make sure I share the most relevant info, I'd love to know your name. What should I call you?";
    }
    
    if (!hasEmail) {
      const name = existingLead.name;
      const question = `Great to meet you, ${name}! To help me personalize this for you, what's your email address?`;
      return lastValidationFailure?.field === 'email'
        ? { question, lastFailure: lastValidationFailure }
        : question;
    }
    
    if (!hasPhone) {
      const name = existingLead.name;
      const question = `Thanks ${name}! To make sure I can reach you with the most relevant information, what's your phone number?`;
      return lastValidationFailure?.field === 'phone'
        ? { question, lastFailure: lastValidationFailure }
        : question;
    }
    
    if (!hasServiceNeed) {
      const name = existingLead.name;
      const question = `Thanks ${name}! To help me tailor the most relevant information, what's the main reason you're reaching out today?`;
      return lastValidationFailure?.field === 'serviceNeed'
        ? { question, lastFailure: lastValidationFailure }
        : question;
    }
    
    // CRITICAL: If budget is unknown, ask qualified questions INSTEAD of timing and budget
    // These questions help qualify the lead better and show sales expertise
    if (budgetIsUnknown) {
      if (!hasLeadsPerDay) {
        return "Got it. To better understand your situation, how many leads do you typically get per day?";
      }
      
      if (!hasOvernightLeads) {
        return "Thanks! How many of those leads come in overnight or after hours?";
      }
      
      if (!hasReturnCallTiming) {
        return "Perfect. When do you typically return calls to those leads?";
      }
      // All qualified questions answered - qualification complete (skip timing when budget is unknown)
    }
    
    // Only ask timing if budget is NOT unknown
    if (!budgetIsUnknown && !hasTiming) {
      const question = "To make sure I share the most relevant info, when are you looking to get started?";
      return lastValidationFailure?.field === 'timing'
        ? { question, lastFailure: lastValidationFailure }
        : question;
    }
    
    // Only ask budget if it's not already marked as unknown
    if (!hasBudget && !budgetIsUnknown) {
      const question = "To help me personalize this for you, what's your budget range?";
      return lastValidationFailure?.field === 'budget'
        ? { question, lastFailure: lastValidationFailure }
        : question;
    }
    
    // All qualification data collected (including qualified questions if budget was unknown)
    return null;
  }

  /**
   * Checks if an answer is invalid (skip attempts, refusals, vague responses, chatbot name)
   */
  /**
   * Uses AI to analyze if an answer is invalid (skip attempts, refusals, vague responses, or chatbot's name)
   * @param text The answer text to validate
   * @param fieldType The type of field being validated (name, serviceNeed, timing, budget)
   * @returns Promise<boolean> - true if invalid, false if valid
   */
  private async isInvalidAnswer(text: string, fieldType: 'name' | 'email' | 'phone' | 'serviceNeed' | 'timing' | 'budget'): Promise<boolean> {
    if (!text || text.trim().length <= 2) {
      return true; // Too short to be meaningful
    }

    try {
      // Special handling for serviceNeed, timing, and budget - be very lenient
      const isServiceNeedField = fieldType === 'serviceNeed';
      const isBudgetField = fieldType === 'budget';
      const isTimingField = fieldType === 'timing';
      
      const validationPrompt = `Analyze if this answer is valid for a ${fieldType} field in a lead qualification form.

Answer to analyze: "${text}"

${isServiceNeedField ? `CRITICAL: For serviceNeed field, be EXTREMELY LENIENT. Accept ANY answer that describes a service, product, or business need, even with typos, poor grammar, or incomplete sentences. Only reject if it's clearly a refusal, skip attempt, or completely vague response.

VALID serviceNeed answers include (but not limited to):
- "social marketing", "socail marketing" (typo OK), "social media marketing", "socail media marketing" (typos OK)
- "i want social media marketing", "from you i want to do my socail media marketing" (grammar/typos OK)
- "website", "e-commerce", "chatbot", "consultation", "customer service"
- "POS system", "inventory management", "CRM", "automation", "software development"
- Any phrase containing keywords: marketing, website, software, system, app, platform, service, solution, tool, development, design, etc.
- Typos are ALWAYS acceptable if the intent is clear (e.g., "socail" = "social", "websit" = "website")
- Partial sentences are acceptable (e.g., "social media marketing", "want website")

ONLY reject serviceNeed if answer is:
- A clear refusal: "no", "skip", "I don't want to answer", "not interested"
- Completely vague: "yes", "no" (without context), "help", "information"
- A question: "what?", "how?", "why?"

Examples:
- serviceNeed "social marketing" → VALID
- serviceNeed "socail marketing" → VALID (typo, but clear intent)
- serviceNeed "i want socail marketing of my brand" → VALID (typos and grammar OK)
- serviceNeed "from you i want to do my socail media marketing" → VALID (typos and grammar OK)
- serviceNeed "consultation" → VALID
- serviceNeed "yes" → INVALID (too vague)
- serviceNeed "no" → INVALID (refusal or too vague)
- serviceNeed "skip" → INVALID (refusal)` : isBudgetField ? `CRITICAL: For budget field, be EXTREMELY LENIENT. Accept ANY answer that mentions a budget amount, price, or monetary value, in ANY format.

VALID budget answers include (but not limited to):
- "10 thousand", "10 thousand usd", "10k", "$10,000", "$10000", "10000 usd"
- "5k", "5 thousand", "$5k", "5000 dollars"
- "twenty thousand", "20k usd", "$20k", "20,000"
- "a thousand", "one thousand", "1k", "$1,000"
- "50k", "fifty thousand", "$50,000"
- "between 10 and 20 thousand", "around 10k", "about 10000"
- Any format with numbers and currency indicators (dollar, usd, $, k, thousand, etc.)
- Typos are acceptable: "ten thousand", "10 thouusand", "10k us"
- Written numbers: "ten thousand", "twenty five thousand"

ONLY reject budget if answer is:
- A clear refusal: "no budget", "skip", "I don't want to answer", "not that"
- Completely vague: "yes", "no", "help", "information" (without any budget mention)
- A question: "what?", "how much?", "why?"
- Does not mention any amount, number, or currency

SPECIAL HANDLING - "DON'T KNOW" RESPONSES:
- If user says: "I don't know", "not sure", "unsure", "haven't decided", "not sure yet", "don't have one", "no idea", "haven't thought about it"
- These are ACCEPTABLE responses - mark budget as "unknown" or "not sure" and DO NOT ask again
- Move to qualified questions instead (leads per day, overnight leads, return call timing)

Examples:
- budget "10 thousand" → VALID
- budget "10k" → VALID
- budget "$10000" → VALID
- budget "ten thousand usd" → VALID
- budget "20 thousand dollars" → VALID
- budget "around 5k" → VALID
- budget "yes" → INVALID (too vague, no amount mentioned)
- budget "no" → INVALID (refusal or too vague)
- budget "skip" → INVALID (refusal)` : isTimingField ? `CRITICAL: For timing field, be EXTREMELY LENIENT. Accept ANY answer that mentions a time, date, timeframe, or when they want to start, in ANY format.

VALID timing answers include (but not limited to):
- "in 2 months", "in 2 moths" (typo OK - "moths" = "months"), "in 2 month", "2 months"
- "next month", "next week", "next year", "next year"
- "asap", "as soon as possible", "immediately", "right away", "soon"
- "in 3 weeks", "in a month", "in 6 months", "in a year"
- "january", "next january", "this january", "q1 2024", "q2"
- "within 2 months", "within a month", "within 6 months"
- "sometime next year", "early next year", "late this year"
- "not sure yet", "flexible", "open", "whenever works" (acceptable timing responses)
- Written numbers: "two months", "three weeks", "six months"
- Typos are acceptable: "moths" = "months", "wek" = "week", "yer" = "year"
- Partial phrases: "2 months", "next month", "asap"

ONLY reject timing if answer is:
- A clear refusal: "never", "don't want to", "skip", "I don't want to answer", "not interested"
- Completely vague: "yes", "no" (without any time reference), "help", "information"
- A question: "what?", "when?", "why?"
- Does not mention any timeframe, time, or date reference

Examples:
- timing "in 2 months" → VALID
- timing "in 2 moths" → VALID (typo - clearly means "months")
- timing "2 months" → VALID
- timing "asap" → VALID
- timing "next year" → VALID
- timing "flexible" → VALID (acceptable timing response)
- timing "yes" → INVALID (too vague, no time mentioned)
- timing "no" → INVALID (refusal or too vague)
- timing "skip" → INVALID (refusal)` : `An answer is INVALID if it:
- Is an attempt to skip or refuse (e.g., "skip", "I don't want to answer", "no", "not that")
- Is too vague or generic (e.g., "yes", "no", "help", "information")
- Is a greeting or question (e.g., "hi", "hello", "what?", "why?")
- Is the chatbot's name "Abby" (for name field)
- Does not provide the actual requested information
- For email: Must be a valid email format (contain @ and domain)

An answer is VALID if it:
- Provides the actual requested information
- Is specific and meaningful
- Answers the question properly
- For email: Must be valid email format like "user@example.com"
- For phone: Must be valid phone format with digits (any length is acceptable, minimum 5 characters). Examples: "+1234567890", "(123) 456-7890", "032350536", "1234567890", any format with digits is valid`}

Examples:
- email "john@example.com" → VALID
- email "test@domain.com" → VALID
- email "not an email" → INVALID (not valid format)
${isServiceNeedField ? '' : `- serviceNeed "consultation" → VALID
- serviceNeed "chatbot" → VALID
- serviceNeed "yes" → INVALID (too vague)`}

Respond with JSON: {"isInvalid": true/false, "reason": "brief explanation"}`;

      const response = await this.openaiClient.chat.completions.create({
        model: this.model,
        messages: [
          { 
            role: 'system', 
            content: 'You are a validation assistant. Analyze answers and determine if they are valid or invalid for lead qualification forms. Return only valid JSON.' 
          },
          { role: 'user', content: validationPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
        max_tokens: 100,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.isInvalid === true;
    } catch (error) {
      console.error(`[ChatService] Error validating answer:`, error);
      // On error, be conservative - reject very short answers only
      return text.trim().length <= 2;
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

    // Get lead state BEFORE extraction to detect validation failures
    const leadBeforeExtraction = await this.leadService.getLeadBySessionId(sessionId);
    
    // ROOT CAUSE FIX: Skip expensive AI-powered support detection for normal conversations
    // Use quick keyword check first - only call AI for potential support issues
    // This reduces OpenAI API calls from 7+ to 2-3 per message
    const potentialSupportKeywords = /\b(error|broken|not working|bug|issue|problem|help|frustrated|disappointed|doesn't work|can't|won't|failed|wrong)\b/i;
    const mightBeSupportIssue = potentialSupportKeywords.test(userMessage);
    
    let newlyCreatedTicket: any = null;
    
    // Only do expensive AI detection if keywords suggest support issue
    if (mightBeSupportIssue) {
      const hasSupportIssue = await this.detectSupportIssue(userMessage, conversation);
    if (hasSupportIssue) {
      console.log(`[ChatService] 🔴 Support issue detected for session ${sessionId} - creating ticket before response`);
      try {
        newlyCreatedTicket = await this.handleSupportIssue(sessionId, conversation);
      } catch (error) {
        console.error(`[ChatService] ⚠️ Error creating support ticket:`, error);
        // Continue with response generation even if ticket creation fails
        }
      }
    }
    
    // CLIENT REQUIREMENT (Jan 2026): NO DEMO MODE
    // Abby should ALWAYS qualify and sell, even on webchatsales.com
    // The conversation flow is the same everywhere - qualify, then close the sale
    const isDemoMode = false; // Disabled - always qualify
    
    console.log(`[ChatService] Sales mode active for ${sessionId} - qualifying and selling`);

    // Check discovery phase - MUST complete before qualification
    let discoveryPhase: { isComplete: boolean; discoveryCount: number; nextDiscoveryQuestion?: string | null } = { 
      isComplete: true, 
      discoveryCount: 0, 
      nextDiscoveryQuestion: null 
    };
    
      discoveryPhase = await this.checkDiscoveryPhase(conversation);
    console.log(`[ChatService] Discovery phase check for ${sessionId}:`, discoveryPhase);
    
    // Extract lead data from conversation (this updates the lead in database)
    await this.extractAndSaveLead(sessionId, conversation);
    
    // Get lead state AFTER extraction to detect if a field was cleared (validation failure)
    // Note: Using immediate refetch - MongoDB write is synchronous in this context
    // If needed, implement retry logic for eventual consistency scenarios
    const leadAfterExtraction = await this.leadService.getLeadBySessionId(sessionId);
    
    // Detect validation failure: if a field had a value before but is now null/cleared, it failed validation
    let lastValidationFailure: { field: string; reason?: string } | null = null;
    if (leadBeforeExtraction && leadAfterExtraction && discoveryPhase.isComplete) {
      if (leadBeforeExtraction.email && !leadAfterExtraction.email) {
        lastValidationFailure = { field: 'email', reason: 'Invalid email format' };
      } else if (leadBeforeExtraction.phone && !leadAfterExtraction.phone) {
        lastValidationFailure = { field: 'phone', reason: 'Invalid phone format' };
      } else if (leadBeforeExtraction.serviceNeed && !leadAfterExtraction.serviceNeed) {
        lastValidationFailure = { field: 'serviceNeed', reason: 'Invalid service need format' };
      } else if (leadBeforeExtraction.timing && !leadAfterExtraction.timing) {
        lastValidationFailure = { field: 'timing', reason: 'Invalid timing format' };
      } else if (leadBeforeExtraction.budget && !leadAfterExtraction.budget) {
        lastValidationFailure = { field: 'budget', reason: 'Invalid budget format' };
      }
    }

    // Determine next question: Use sales agent flow for client websites, skip for demo mode
    let nextQuestionResult: string | { question: string; lastFailure?: { field: string; reason?: string } } | null = null;
    
    if (!isDemoMode) {
      // Sales agent flow: Use new discovery/qualification questions
      nextQuestionResult = await this.getNextQualificationQuestion(sessionId, lastValidationFailure);
    }
    
    // Handle null case (all questions answered - qualification complete)
    const nextQuestion = nextQuestionResult === null 
      ? null 
      : (typeof nextQuestionResult === 'string' ? nextQuestionResult : nextQuestionResult.question);
    
    // Update lastValidationFailure if provided in result
    if (nextQuestionResult !== null && typeof nextQuestionResult === 'object' && nextQuestionResult.lastFailure) {
      lastValidationFailure = nextQuestionResult.lastFailure;
    }
    
    console.log(`[ChatService] Next qualification question for ${sessionId}:`, nextQuestion);
    if (lastValidationFailure) {
      console.log(`[ChatService] Last validation failure:`, lastValidationFailure);
    }
    
    // Check if there's an active support ticket for this session (support mode)
    const activeTicket = newlyCreatedTicket || await this.supportService.getTicketBySessionId(sessionId);
    const isSupportMode = activeTicket && activeTicket.status !== 'closed' && activeTicket.status !== 'resolved';
    const ticketJustCreated = newlyCreatedTicket !== null;
    
    // Get lead data for context
    const lead = await this.leadService.getLeadBySessionId(sessionId);

    // ROOT CAUSE FIX: Use fast pattern matching for buying intent instead of OpenAI API call
    // This eliminates 1 API call per message - reduces crashes significantly
    let hasBuyingIntent = lead?.hasBuyingIntent || false;
    
    if (!hasBuyingIntent) {
      // Fast pattern-based detection - no AI call needed for obvious cases
      const strongBuyingPatterns = /\b(sign me up|let's do it|i want to sign up|i'm ready|let's start|yes let's|yeah let's|i'll try it|sounds good let's|let's go|i'm in|count me in|how much|what's the price|what's the cost|how do i pay|ready to buy|want to purchase)\b/i;
      const weakPatterns = /\b(what information|what do you need|tell me what you need|how do i get started|what's required)\b/i;
      
      const messageLower = userMessage.toLowerCase();
      const isStrongIntent = strongBuyingPatterns.test(messageLower);
      const isWeakIntent = weakPatterns.test(messageLower);
      
      // Only count as buying intent if strong pattern matches and no weak pattern
      hasBuyingIntent = isStrongIntent && !isWeakIntent;
        
        if (hasBuyingIntent) {
        console.log(`[ChatService] ✅ Buying intent detected (pattern match) for ${sessionId}`);
          if (lead) {
            await this.leadService.updateLead(sessionId, { hasBuyingIntent: true });
            
          // Send email if lead has email but is not qualified yet
            if (lead.email && 
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email.trim()) && 
                lead.status !== 'qualified') {
              try {
                await this.emailService.sendLeadQualificationConfirmation(
                  lead.email,
                  lead.name || 'there',
                  lead.serviceNeed,
                  lead.timing,
                  lead.budget
                );
              console.log(`[ChatService] ✅ Email confirmation sent to user: ${lead.email}`);
              } catch (emailError) {
                console.error(`[ChatService] Error sending email confirmation:`, emailError);
              }
            }
        } else {
            await this.leadService.createLead({ 
              sessionId, 
              hasBuyingIntent: true,
              status: 'new'
            });
          }
      }
    } else {
      console.log(`[ChatService] Buying intent already detected for ${sessionId}`);
    }
    
    // Determine conversation phase based on collected data (for context in prompt)
    // CRITICAL: Only skip to buying_intent if qualification is complete OR if it's a clear buying signal
    // Don't skip qualification just because someone asks "what do you need"
    let conversationPhase: 'opening' | 'discovery' | 'qualification' | 'objection' | 'closing' | 'buying_intent' = 'opening';
    
    // Check if basic qualification is complete
    const hasBasicQualification = lead?.name && lead?.businessType && 
                                  (lead?.leadSource || lead?.leadsPerWeek || lead?.dealValue || lead?.afterHoursPain);
    
    if (hasBuyingIntent && hasBasicQualification) {
      // Only skip to buying_intent if we have qualification data
      conversationPhase = 'buying_intent';
    } else if (hasBuyingIntent && !hasBasicQualification) {
      // Buying intent detected but no qualification - continue qualification first
      console.log(`[ChatService] Buying intent detected but qualification incomplete - continuing qualification for ${sessionId}`);
      conversationPhase = 'discovery';
      // Reset buying intent flag - we'll set it again after qualification
      hasBuyingIntent = false;
    } else if (!lead?.name) {
      conversationPhase = 'opening';
    } else if (!lead?.businessType || !lead?.leadSource || !lead?.leadsPerWeek || !lead?.dealValue || !lead?.afterHoursPain) {
      conversationPhase = 'discovery';
    } else if (!lead?.email) {
      conversationPhase = 'qualification';
    } else {
      conversationPhase = 'closing';
    }
    
    console.log(`[ChatService] Base conversation phase for ${sessionId}: ${conversationPhase} (AI will analyze intent)`);

    // Determine if we're in discovery or qualification phase (for legacy system)
    const isDiscoveryPhase = !discoveryPhase.isComplete;
    const isQualificationActive = discoveryPhase.isComplete && nextQuestion !== null && !isDemoMode;

    // Get lead data if qualification is complete (for demo link)
    // Skip in demo mode - no booking links for WebChatSales.com
    let schedulingLink: string | undefined;
    if (!isQualificationActive && !isDiscoveryPhase && !isDemoMode && lead) {
      schedulingLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/book-demo?sessionId=${sessionId}`;
    }

    // Build system prompt - SENIOR APPROACH
    // The AI analyzes intent naturally - no hardcoded detection
    // We just pass collected data for context
    
    const systemPrompt = this.salesAgentPrompt.buildSalesAgentPrompt({
        conversationPhase,
      nextQuestion: null, // AI decides what to ask based on context
        clientContext: {
        companyName: process.env.CLIENT_COMPANY_NAME || 'WebChatSales',
      },
        collectedData: {
          name: lead?.name,
          businessType: lead?.businessType,
        leadSource: lead?.leadSource,
        leadsPerWeek: lead?.leadsPerWeek,
        dealValue: lead?.dealValue,
        afterHoursPain: lead?.afterHoursPain,
          email: lead?.email,
          phone: lead?.phone,
        },
        hasBuyingIntent: hasBuyingIntent || lead?.hasBuyingIntent,
      });

    // Convert conversation messages to OpenAI format
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    
    // Filter out system messages from history
    const historyMessages = (conversation.messages || []).filter(msg => msg.role !== 'system');
    
    // Always include system prompt
    messages.push({ role: 'system', content: systemPrompt });
    
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
    const maxRetries = 2;
    let lastError: any = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[ChatService] Retry attempt ${attempt}/${maxRetries} for sessionId: ${sessionId}`);
          // Exponential backoff: 1s, 2s
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
        
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
        
        // Process conversation for lead qualification (support detection already done earlier)
        // Note: Support ticket creation already happened before generating response
          return; // Success - exit the retry loop
      } else {
        console.error(`[ChatService] ERROR: Empty response from AI!`);
        throw new Error('AI returned empty response');
      }
      
    } catch (aiError: any) {
        lastError = aiError;
        console.error(`[ChatService] OpenAI API error (attempt ${attempt + 1}/${maxRetries + 1}) for sessionId ${sessionId}:`, aiError?.message || aiError);
      
        // If we got a partial response, save it and don't retry
      if (fullResponse && fullResponse.trim()) {
        try {
          await this.addMessage(sessionId, 'assistant', fullResponse);
          console.log(`[ChatService] Saved partial response (${fullResponse.length} chars) after error`);
            return; // Don't retry if we have partial content
        } catch (saveError) {
          console.error(`[ChatService] Error saving partial response:`, saveError);
        }
      }
      
        // Don't retry on certain errors
        const noRetryErrors = ['invalid_api_key', 'insufficient_quota', 'rate_limit_exceeded'];
        if (aiError?.code && noRetryErrors.includes(aiError.code)) {
          console.error(`[ChatService] Non-retryable error: ${aiError.code}`);
          break;
        }
        
        // Continue to next retry attempt
      }
    }
    
    // All retries exhausted, throw the last error
    console.error(`[ChatService] All retry attempts exhausted for sessionId ${sessionId}`);
    throw lastError || new Error('Failed to get AI response after retries');
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
      // Note: Support detection and ticket creation now happens BEFORE generating AI response
      // This function is kept for backwards compatibility but is mostly unused now
      // Lead extraction happens earlier in the flow as well
    } catch (error) {
      console.error(`[ChatService] Error processing conversation actions:`, error);
    }
  }

  /**
   * AI-powered detection to determine if user is expressing a problem, issue, or complaint
   * This replaces simple keyword matching with intelligent context-aware detection
   */
  private async detectSupportIssue(userMessage: string, conversation: any): Promise<boolean> {
    try {
      // Get the last few messages for context
      const recentMessages = conversation.messages.slice(-5).map((m: any) => 
        `${m.role}: ${m.content}`
      ).join('\n');

      const detectionPrompt = `Analyze if the user is expressing a PROBLEM, ISSUE, or COMPLAINT that requires support/ticket creation.

User's latest message and recent conversation context:
${recentMessages}

Determine if the user is:
1. Reporting a technical problem (e.g., "it's not working", "error", "bug", "broken")
2. Expressing a complaint (e.g., "disappointed", "frustrated", "this is bad", "not satisfied")
3. Asking for help with an issue (e.g., "I have a problem with...", "need help fixing...")
4. Reporting something wrong (e.g., "this doesn't work", "can't access", "failed")

DO NOT create tickets for:
- General questions about services/products
- Asking for information
- Normal conversation
- Qualification questions
- Booking requests

Respond with JSON: {"isSupportIssue": true/false, "reason": "brief explanation", "category": "technical|complaint|question|other"}`;

      const response = await this.openaiClient.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a support issue detection assistant. Analyze conversations and determine if they require support ticket creation. Return only valid JSON.'
          },
          { role: 'user', content: detectionPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
        max_tokens: 150,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      const isSupportIssue = result.isSupportIssue === true;

      if (isSupportIssue) {
        console.log(`[ChatService] 🔴 Support issue detected: ${result.reason} (Category: ${result.category})`);
      }

      return isSupportIssue;
    } catch (error) {
      console.error(`[ChatService] Error detecting support issue:`, error);
      // SENIOR APPROACH: If AI fails, return false - don't use hardcoded keywords
      // The AI will naturally handle support issues through the system prompt
      return false;
    }
  }

  /**
   * Handle support issue - automatically create ticket with all required fields
   * ROOT CAUSE FIX: Combined 3 AI calls into 1 to prevent API overload/crashes
   */
  private async handleSupportIssue(sessionId: string, conversation: any): Promise<any> {
    try {
      // Check if ticket already exists for this session
      const existingTicket = await this.supportService.getTicketBySessionId(sessionId);
      if (existingTicket && existingTicket.status !== 'closed' && existingTicket.status !== 'resolved') {
        console.log(`[ChatService] ⚠️ Active support ticket already exists: ${existingTicket.ticketId}`);
        return; // Don't create duplicate tickets
      }

      // Get lead information if available
      const lead = await this.leadService.getLeadBySessionId(sessionId);

      // ROOT CAUSE FIX: Combine sentiment + priority + summary into ONE API call
      // This reduces 3 API calls to 1, significantly reducing crash risk
      const analysisResult = await this.analyzeTicketInOneCall(conversation.messages, lead);
      
      const sentimentResult = { sentiment: analysisResult.sentiment, confidence: 0.8 };
      const priorityResult = { priority: analysisResult.priority, reason: analysisResult.priorityReason };
      const summary = analysisResult.summary;

      // Create full transcript with timestamps
      const transcript = conversation.messages
        .map((msg: any) => {
          const timestamp = msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString();
          return `[${timestamp}] ${msg.role === 'user' ? 'User' : 'Abby'}: ${msg.content}`;
        })
        .join('\n\n');

      // Create support ticket with all required fields
      const ticket = await this.supportService.createSupportTicket({
        sessionId,
        transcript,
        sentiment: sentimentResult.sentiment,
        summary: summary,
        userEmail: lead?.email || conversation.userEmail,
        userName: lead?.name || conversation.userName,
        userPhone: lead?.phone,
        conversationId: conversation._id.toString(),
        priority: priorityResult.priority,
      });

      console.log(`[ChatService] ✅ Support ticket created automatically:`, {
        ticketId: ticket.ticketId,
        sessionId,
        status: ticket.status,
        priority: ticket.priority,
        sentiment: ticket.sentiment,
      });

      // Send ticket to admin dashboard endpoint
      await this.sendTicketToDashboard(ticket, lead, conversation);

      // Note: Email notifications are sent automatically by SupportService.createSupportTicket
      
      // Return the ticket so caller can reference it in the response
      return ticket;
    } catch (error) {
      console.error(`[ChatService] Error handling support issue:`, error);
      return null;
    }
  }

  /**
   * ROOT CAUSE FIX: Combined ticket analysis - sentiment + priority + summary in ONE API call
   * Reduces 3 API calls to 1 to prevent rate limits and crashes
   */
  private async analyzeTicketInOneCall(messages: any[], lead?: any): Promise<{
    sentiment: string;
    priority: string;
    priorityReason: string;
    summary: string;
  }> {
    try {
      const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');

      const combinedPrompt = `Analyze this support conversation and provide sentiment, priority, and summary in ONE response.

Conversation:
${conversationText}

${lead ? `User Info: ${lead.name}${lead.email ? ` (${lead.email})` : ''}` : ''}

Analyze and return JSON with:
1. sentiment: "positive", "neutral", "negative", or "very_negative"
2. priority: "low", "medium", "high", or "urgent"
3. priorityReason: brief explanation (10 words max)
4. summary: 2-3 sentence summary of the issue

Return JSON: {"sentiment": "...", "priority": "...", "priorityReason": "...", "summary": "..."}`;

      const response = await this.openaiClient.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a support ticket analysis assistant. Analyze conversations and return structured JSON.'
          },
          { role: 'user', content: combinedPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
        max_tokens: 300,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        sentiment: result.sentiment || 'neutral',
        priority: ['low', 'medium', 'high', 'urgent'].includes(result.priority) ? result.priority : 'medium',
        priorityReason: result.priorityReason || 'Automatic assignment',
        summary: result.summary || 'Support issue reported by user',
      };
    } catch (error) {
      console.error(`[ChatService] Error in combined ticket analysis:`, error);
      // Fallback values
      return {
        sentiment: 'neutral',
        priority: 'medium',
        priorityReason: 'Fallback assignment',
        summary: 'Support issue reported by user',
      };
    }
  }

  /**
   * AI-powered sentiment analysis - more accurate than keyword matching
   */
  private async analyzeSentimentAI(messages: any[]): Promise<{ sentiment: string; confidence: number }> {
    try {
      const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');

      const sentimentPrompt = `Analyze the sentiment of this conversation. Classify as: positive, neutral, negative, or very_negative.

Conversation:
${conversationText}

Consider:
- Tone and emotion
- Problem severity
- User frustration level
- Urgency indicators

Respond with JSON: {"sentiment": "positive|neutral|negative|very_negative", "confidence": 0.0-1.0}`;

      const response = await this.openaiClient.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analysis assistant. Analyze conversations and classify sentiment. Return only valid JSON.'
          },
          { role: 'user', content: sentimentPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
        max_tokens: 100,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        sentiment: result.sentiment || 'neutral',
        confidence: result.confidence || 0.5,
      };
    } catch (error) {
      console.error(`[ChatService] Error in AI sentiment analysis:`, error);
      // Fallback to basic sentiment analysis
      return { sentiment: this.analyzeSentimentBasic(messages), confidence: 0.5 };
    }
  }

  /**
   * Fallback basic sentiment analysis
   * SENIOR APPROACH: Return neutral if AI fails - don't use hardcoded word lists
   * The AI handles sentiment analysis naturally through the prompt
   */
  private analyzeSentimentBasic(messages: any[]): string {
    // Default to neutral - the AI will analyze sentiment naturally
    return 'neutral';
  }

  /**
   * AI-powered priority determination based on sentiment and content analysis
   */
  private async determinePriority(messages: any[], sentiment: string): Promise<{ priority: string; reason: string }> {
    try {
      const conversationText = messages.map(m => m.content).join('\n');

      const priorityPrompt = `Determine the priority level for this support request: low, medium, high, or urgent.

Conversation:
${conversationText}

Sentiment: ${sentiment}

Consider:
- Urgency keywords (urgent, critical, emergency, immediately, asap, broken, down, not working)
- Sentiment level
- Impact severity
- Time sensitivity

Respond with JSON: {"priority": "low|medium|high|urgent", "reason": "brief explanation"}`;

      const response = await this.openaiClient.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a support priority assessment assistant. Determine ticket priority levels. Return only valid JSON.'
          },
          { role: 'user', content: priorityPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
        max_tokens: 100,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      let priority = result.priority || 'medium';
      
      // Validate priority values
      if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
        priority = sentiment === 'very_negative' ? 'high' : 'medium';
      }

      return {
        priority,
        reason: result.reason || 'Automatic priority assignment',
      };
    } catch (error) {
      console.error(`[ChatService] Error in priority determination:`, error);
      // Fallback priority logic
      const priority = sentiment === 'very_negative' ? 'high' : sentiment === 'negative' ? 'medium' : 'low';
      return { priority, reason: 'Fallback priority assignment' };
    }
  }

  /**
   * Generate comprehensive support ticket summary using AI
   */
  private async generateSupportSummary(messages: any[], lead?: any): Promise<string> {
    try {
      const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');

      const summaryPrompt = `Generate a concise summary (2-3 sentences) of this support issue for a support ticket.

Conversation:
${conversationText}

${lead ? `User Info: ${lead.name}${lead.email ? ` (${lead.email})` : ''}` : ''}

Focus on:
- What problem the user is experiencing
- Key details needed for support resolution
- Any relevant context

Respond with JSON: {"summary": "brief summary text"}`;

      const response = await this.openaiClient.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a support ticket summary generator. Create concise, informative summaries. Return only valid JSON.'
          },
          { role: 'user', content: summaryPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
        max_tokens: 200,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.summary || `Support request from ${lead?.name || 'user'}`;
    } catch (error) {
      console.error(`[ChatService] Error generating support summary:`, error);
      // Fallback summary
      return `Support request from ${lead?.name || 'user'}`;
    }
  }

  /**
   * Send ticket data to admin dashboard endpoint
   */
  private async sendTicketToDashboard(ticket: any, lead?: any, conversation?: any) {
    try {
      const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:9000';
      
      const ticketData = {
        ticketId: ticket.ticketId,
        sessionId: ticket.sessionId,
        status: ticket.status,
        priority: ticket.priority,
        sentiment: ticket.sentiment,
        summary: ticket.summary,
        transcript: ticket.transcript,
        userEmail: ticket.userEmail,
        userName: ticket.userName,
        userPhone: lead?.phone,
        conversationId: ticket.conversationId,
        openedAt: ticket.openedAt,
        createdAt: ticket.createdAt,
        leadInfo: lead ? {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          serviceNeed: lead.serviceNeed,
          timing: lead.timing,
          budget: lead.budget,
        } : null,
      };

      const response = await fetch(`${apiBaseUrl}/api/dashboard/ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
      });

      if (response.ok) {
        console.log(`[ChatService] ✅ Support ticket sent to dashboard: ${ticket.ticketId}`);
      } else {
        console.warn(`[ChatService] ⚠️ Failed to send ticket to dashboard: ${response.status}`);
      }
    } catch (error) {
      // Don't fail ticket creation if dashboard POST fails
      console.error(`[ChatService] Error sending ticket to dashboard:`, error);
    }
  }

  private async extractAndSaveLead(sessionId: string, conversation: any) {
    try {
      // Get the last user message to prioritize most recent input
      const userMessages = conversation.messages.filter((m: any) => m.role === 'user');
      const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';
      
      // Get the last assistant message to understand context of what question was asked
      const assistantMessages = conversation.messages.filter((m: any) => m.role === 'assistant');
      const lastAssistantMessage = assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1].content : '';
      
      // Get existing lead to check current state (for "unsure" logic)
      const existingLead = await this.leadService.getLeadBySessionId(sessionId);
      
      const allMessages = conversation.messages.map((m: any) => `${m.role}: ${m.content}`).join('\n');
      
      // Use OpenAI to extract structured lead data
      // ROOT CAUSE: Train the model to understand context and intent, not just keywords
      // Check if we're in sales agent mode (client websites, not demo)
      const isDemoMode = process.env.DEMO_MODE === 'true' || 
                         process.env.DEMO_MODE === '1' ||
                         (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('webchatsales.com'));
      
      const extractionPrompt = `You are a lead qualification data extractor. Extract these fields: ${isDemoMode 
        ? 'name, email, phone, serviceNeed, timing, budget, leadsPerDay, overnightLeads, returnCallTiming'
        : 'name, company, email, phone, businessType, leadSource, leadsPerWeek, dealValue, afterHoursPain, serviceNeed, timing, budget, leadsPerDay, overnightLeads, returnCallTiming'}.

CRITICAL PRIORITY: The LAST user message is the most important. If it contradicts or rejects previous answers, DO NOT extract the old values.

EXTRACTION LOGIC:

1. **Name Extraction:**
   - Extract ONLY when user explicitly states their name: "My name is X", "I'm X", "Call me X", "This is X"
   - Extract from opening question response: "Who am I speaking with, and what company are you with?" → "I'm John" or "John" → name: "John"
   - DO NOT extract if name appears in: questions, chatbot's name ("Abby"), third person references
   - Example: "Can I try Abby?" → name: null (question + chatbot name)
   - Example: "My name is Ahmed" → name: "Ahmed" (declaration)
   - Example: "I'm John from ABC Plumbing" → name: "John", company: "ABC Plumbing"

2. **Email Extraction:**
   - Extract email addresses when user explicitly provides them
   - Valid formats: "myemail@example.com", "email me at test@domain.com", "it's john@email.com"
   - DO NOT extract email from questions or chatbot responses
   - Example: "My email is john@example.com" → email: "john@example.com"
   - Example: "Send it to me" → email: null (no email provided)
   - Only extract valid email format (must contain @ and domain)

3. **Phone Extraction:**
   - Extract phone numbers when user explicitly provides them
   - Valid formats: "+1234567890", "(123) 456-7890", "123-456-7890", "1234567890", "+1 234 567 8900"
   - DO NOT extract phone from questions or chatbot responses
   - Example: "My phone is 123-456-7890" → phone: "123-456-7890"
   - Example: "Call me" → phone: null (no phone provided)
   - Phone is OPTIONAL - only extract if explicitly provided

${!isDemoMode ? `3a. **Company Extraction (Sales Agent Flow):**
   - Extract when user mentions their company name: "I'm with X", "I work at X", "X company", "company name is X"
   - Example: "I'm John from ABC Plumbing" → company: "ABC Plumbing"
   - Example: "My company is XYZ Corp" → company: "XYZ Corp"

3b. **Business Type Extraction (NEW 9-STEP FLOW - Step 2):**
   - Extract when user answers "What type of business is this?"
   - Extract business type/industry: "Plumbing", "HVAC", "Dental", "Law firm", "Marketing agency"
   - Example: "We're a plumbing company" → businessType: "plumbing"
   - Example: "I run a dental practice" → businessType: "dental"

3c. **Lead Source Extraction (SEMANTIC - NOT QUESTION-SPECIFIC):**
   - Extract from ANY mention of WHERE/HOW leads come in, not just from a specific question
   - Sources include: "Website", "Phone calls", "Referrals", "Google", "Facebook ads", "Social media", "Email", "Walk-ins"
   - CRITICAL: This is about the CHANNEL/SOURCE, NOT the number/volume
   - If user says just a number (like "10"), this is NOT leadSource - it's probably leadsPerWeek
   - Examples that should ALL extract leadSource:
     * "Mostly from our website and Google" → leadSource: "website and Google"
     * "Phone calls and referrals" → leadSource: "phone calls and referrals"
     * "Most of my jobs come from word of mouth" → leadSource: "word of mouth"
     * "People find us on Facebook mostly" → leadSource: "Facebook"

3d. **Leads Per Week Extraction (SEMANTIC - NOT QUESTION-SPECIFIC):**
   - Extract from ANY mention of lead volume/quantity, not just from a specific question
   - Extract numbers: "10-15", "About 20", "Maybe 5-10", "8 to 10 a week"
   - CRITICAL: This is about the NUMBER/VOLUME, NOT the source/channel
   - Examples that should ALL extract leadsPerWeek:
     * "Probably 15-20 per week" → leadsPerWeek: "15-20"
     * "Maybe 8 to 10 a week" → leadsPerWeek: "8-10"
     * "I probably miss half of them" (with context of 10 leads) → leadsPerWeek: "about 10, misses half"
     * "Not many, maybe 5" → leadsPerWeek: "about 5"

3e. **Deal Value Extraction (SEMANTIC - NOT QUESTION-SPECIFIC):**
   - Extract from ANY mention of job costs/prices/values, not just from a specific question
   - Extract dollar amounts or ranges: "$500", "$2000-5000", "A few hundred"
   - Examples that should ALL extract dealValue:
     * "Average job is about $1500" → dealValue: "$1500"
     * "Regular job is maybe $200 to $300. Emergency ones can be $500 or more" → dealValue: "$200-500+"
     * "Those emergency ones are $500 or more easy" → dealValue: "$500+"
     * "A few hundred bucks usually" → dealValue: "few hundred"

3f. **After-Hours Pain Extraction (CRITICAL - SEMANTIC UNDERSTANDING):**
   - Extract from ANY message where user describes issues with after-hours leads, missed calls, or losing leads
   - DO NOT wait for a specific question - extract if they MENTION the pain ANYWHERE in conversation
   - Look for semantic meaning: missed calls, after hours, lose leads, competitors get them first, can't respond in time, voicemail, busy working
   - Examples that should ALL extract afterHoursPain:
     * "Missing calls after hours is the biggest one" → afterHoursPain: "missing calls after hours"
     * "By the time I call back half of them have already found someone else" → afterHoursPain: "lose leads to competitors"
     * "I miss calls when I'm on a job" → afterHoursPain: "miss calls when busy"
     * "Evening calls go to voicemail" → afterHoursPain: "calls go to voicemail"
     * "They usually go to voicemail and we lose them" → afterHoursPain: "go to voicemail, lose leads"
     * "We try to call back but often too late" → afterHoursPain: "call back too late"
   - CRITICAL: If user mentioned ANYTHING about losing leads, missing calls, or after-hours issues ANYWHERE in conversation, extract it!

` : ''}4. **Service Need Extraction (Purpose/Reason for Contact):**
   - Extract from DECLARATIVE statements: "I need X", "I want X", "I'm looking for X", "my business is X", "I'm in X", "I do X"
   - Extract business type/industry when mentioned: "my business is marketing" → serviceNeed: "marketing" or "lead generation for marketing"
   - Extract service descriptions: "I need help with leads", "I want chatbot", "I'm looking for website", "I need consultation"
   - Extract from questions that describe their need: "how you help me in leads" → serviceNeed: "lead generation" or "leads"
   - Look at the FULL CONVERSATION, not just the last message - if user mentioned their business/need earlier, extract it
   - DO NOT extract from pure questions without context: "What is X?", "How does X work?" (unless they mentioned their business/need)
   - DO NOT extract from chatbot's responses
   - CRITICAL: If the LAST user message is a REJECTION ("no", "skip", "not that", "don't want", "I don't want to answer"), return null for that field
   - Valid service needs include: "marketing", "lead generation", "consultation", "chatbot", "website", "e-commerce", "customer service", "social media", business types, etc.
   - Examples:
     * "my business is marketing" → serviceNeed: "marketing" or "lead generation for marketing"
     * "how you help me in leads" → serviceNeed: "lead generation" or "leads"
     * "I need help with leads" → serviceNeed: "lead generation"
     * "consultation" → serviceNeed: "consultation"
     * Last message "no" → serviceNeed: null (rejection)

4. **Timing & Budget:**
   - Extract ONLY from the LAST user message if it contains explicit statements: "I want to start in X", "My budget is X"
   - DO NOT infer or extract from questions
   - If last message is a rejection, return null
   - CONTEXT-AWARE: Look at the LAST assistant message to determine which question was asked:
     * If assistant asked about TIMING (e.g., "when are you looking to get started", "timeline", "when do you want to start") and user says "I don't know", "not sure", "unsure" → extract timing as null (not budget)
     * If assistant asked about BUDGET (e.g., "what's your budget", "budget range", "how much") and user says "I don't know", "not sure", "unsure", "haven't decided", "no idea", "don't have budget", "no budget" → extract budget as "unknown" (this is acceptable, don't ask again)
   - SPECIAL: For budget, ONLY extract as "unknown" if the question was actually about budget. If question was about timing and user says "don't know", extract timing as null, NOT budget as unknown.

5. **Qualified Questions (leadsPerDay, overnightLeads, returnCallTiming):**
   - Extract when user answers questions about:
     * "How many leads do you get per day?" → leadsPerDay: extract the number or description
     * "How many leads come in overnight?" → overnightLeads: extract the number or description
     * "When do you return calls?" → returnCallTiming: extract the timing/description
   - Extract numbers, timeframes, or descriptive answers
   - Examples:
     * "We get about 20 leads per day" → leadsPerDay: "20" or "about 20"
     * "Maybe 5-10 overnight" → overnightLeads: "5-10" or "maybe 5-10"
     * "Usually the next morning" → returnCallTiming: "next morning" or "usually next morning"

6. **Rejection Detection:**
   - If the last user message contains: "no", "skip", "not", "don't", "won't", "refuse", "reject", "I don't want", "I don't need", "not interested"
   - Return null for the field that was being asked about (determine from context)

FULL CONVERSATION (for context):
${allMessages}

LAST ASSISTANT MESSAGE (to understand which question was asked):
"${lastAssistantMessage}"

LAST USER MESSAGE (most important - prioritize this):
"${lastUserMessage}"

EXTRACTION PRIORITY:
- For name, email, phone: Analyze the LAST user message first. Only extract from earlier messages if the last message doesn't contain the information AND is not a rejection.
- For serviceNeed (Purpose): Look at the FULL CONVERSATION. If the user mentioned their business type, industry, or what they need help with anywhere in the conversation, extract it. Examples: "my business is marketing", "I'm in marketing", "I need help with leads", "how you help me in leads" → extract "marketing" or "lead generation".
- For timing and budget: Analyze the LAST user message first, but also check earlier messages if the last message doesn't contain the information.

Return JSON: ${isDemoMode 
  ? '{"name": null or "value", "email": null or "value", "phone": null or "value", "serviceNeed": null or "value", "timing": null or "value", "budget": null or "value" or "unknown", "leadsPerDay": null or "value", "overnightLeads": null or "value", "returnCallTiming": null or "value"}'
  : '{"name": null or "value", "company": null or "value", "email": null or "value", "phone": null or "value", "businessType": null or "value", "leadSource": null or "value", "leadsPerWeek": null or "value", "dealValue": null or "value", "afterHoursPain": null or "value", "serviceNeed": null or "value", "timing": null or "value", "budget": null or "value" or "unknown", "leadsPerDay": null or "value", "overnightLeads": null or "value", "returnCallTiming": null or "value"}'}`;

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
        
        console.log(`[ChatService] Extracted data for ${sessionId}:`, extractedData);
        
        // Check if we have information (extract name, email, phone, serviceNeed, timing, budget)
        const hasName = extractedData.name && extractedData.name !== 'null' && extractedData.name.trim();
        const hasEmail = extractedData.email && extractedData.email !== 'null' && extractedData.email.trim();
        const hasPhone = extractedData.phone && extractedData.phone !== 'null' && extractedData.phone.trim();
        const hasServiceNeed = extractedData.serviceNeed && extractedData.serviceNeed !== 'null' && extractedData.serviceNeed.trim();
        
        // Sales agent fields (NEW 9-STEP FLOW - only for client websites, not demo mode)
        const hasCompany = !isDemoMode && extractedData.company && extractedData.company !== 'null' && extractedData.company.trim();
        const hasBusinessType = !isDemoMode && extractedData.businessType && extractedData.businessType !== 'null' && extractedData.businessType.trim();
        const hasLeadSource = !isDemoMode && extractedData.leadSource && extractedData.leadSource !== 'null' && extractedData.leadSource.trim();
        const hasLeadsPerWeek = !isDemoMode && extractedData.leadsPerWeek && extractedData.leadsPerWeek !== 'null' && extractedData.leadsPerWeek.trim();
        const hasDealValue = !isDemoMode && extractedData.dealValue && extractedData.dealValue !== 'null' && extractedData.dealValue.trim();
        const hasAfterHoursPain = !isDemoMode && extractedData.afterHoursPain && extractedData.afterHoursPain !== 'null' && extractedData.afterHoursPain.trim();
        // Legacy fields (kept for backward compatibility)
        const hasCustomers = !isDemoMode && extractedData.customers && extractedData.customers !== 'null' && extractedData.customers.trim();
        const hasPricingTier = !isDemoMode && extractedData.pricingTier && extractedData.pricingTier !== 'null' && extractedData.pricingTier.trim();
        const hasBiggestProblem = !isDemoMode && extractedData.biggestProblem && extractedData.biggestProblem !== 'null' && extractedData.biggestProblem.trim();
        
        // Be STRICT - don't extract invalid/vague responses as valid answers
        const extractedName = hasName ? extractedData.name.trim() : null;
        const extractedEmail = hasEmail ? extractedData.email.trim() : null;
        const extractedPhone = hasPhone ? extractedData.phone.trim() : null;
        const extractedServiceNeed = hasServiceNeed ? extractedData.serviceNeed.trim() : null;
        
        // Sales agent fields (NEW 9-STEP FLOW)
        const extractedCompany = hasCompany ? extractedData.company.trim() : null;
        const extractedBusinessType = hasBusinessType ? extractedData.businessType.trim() : null;
        const extractedLeadSource = hasLeadSource ? extractedData.leadSource.trim() : null;
        const extractedLeadsPerWeek = hasLeadsPerWeek ? extractedData.leadsPerWeek.trim() : null;
        const extractedDealValue = hasDealValue ? extractedData.dealValue.trim() : null;
        const extractedAfterHoursPain = hasAfterHoursPain ? extractedData.afterHoursPain.trim() : null;
        // Legacy fields
        const extractedCustomers = hasCustomers ? extractedData.customers.trim() : null;
        const extractedPricingTier = hasPricingTier ? extractedData.pricingTier.trim() : null;
        const extractedBiggestProblem = hasBiggestProblem ? extractedData.biggestProblem.trim() : null;
        const extractedTiming = extractedData.timing && extractedData.timing !== 'null' ? extractedData.timing.trim() : null;
        // Handle budget - if "unknown", keep it as "unknown" (don't trim to lowercase)
        const extractedBudget = extractedData.budget && extractedData.budget !== 'null' 
          ? (extractedData.budget.toLowerCase().includes('unknown') ? 'unknown' : extractedData.budget.trim())
          : null;
        
        // Extract qualified question answers
        const extractedLeadsPerDay = extractedData.leadsPerDay && extractedData.leadsPerDay !== 'null' ? extractedData.leadsPerDay.trim() : null;
        const extractedOvernightLeads = extractedData.overnightLeads && extractedData.overnightLeads !== 'null' ? extractedData.overnightLeads.trim() : null;
        const extractedReturnCallTiming = extractedData.returnCallTiming && extractedData.returnCallTiming !== 'null' ? extractedData.returnCallTiming.trim() : null;
        
        // Validate email format
        const isValidEmailFormat = extractedEmail ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(extractedEmail) : false;
        
        // Validate phone format - very lenient: just needs to contain digits (no hardcoded length requirement)
        const isValidPhoneFormat = extractedPhone ? /\d/.test(extractedPhone.replace(/\s/g, '')) && extractedPhone.trim().length >= 5 : false;
        
        // Use AI to validate each extracted value - reject invalid/vague answers
        const validationPromises = [];
        
        if (extractedName) {
          validationPromises.push(
            this.isInvalidAnswer(extractedName, 'name').then(isInvalid => ({
              field: 'name',
              value: extractedName,
              isValid: !isInvalid
            }))
          );
        }
        
        // Email validation - check format and if it's not invalid
        if (extractedEmail) {
          validationPromises.push(
            this.isInvalidAnswer(extractedEmail, 'email').then(isInvalid => ({
              field: 'email',
              value: extractedEmail,
              isValid: !isInvalid && isValidEmailFormat
            }))
          );
        }
        
        // Phone validation (optional field - only validate if provided)
        if (extractedPhone) {
          validationPromises.push(
            this.isInvalidAnswer(extractedPhone, 'phone').then(isInvalid => ({
              field: 'phone',
              value: extractedPhone,
              isValid: !isInvalid && isValidPhoneFormat
            }))
          );
        }
        
        if (extractedServiceNeed) {
          validationPromises.push(
            this.isInvalidAnswer(extractedServiceNeed, 'serviceNeed').then(isInvalid => ({
              field: 'serviceNeed',
              value: extractedServiceNeed,
              isValid: !isInvalid && extractedServiceNeed.trim().length > 3
            }))
          );
        }
        
        if (extractedTiming) {
          validationPromises.push(
            this.isInvalidAnswer(extractedTiming, 'timing').then(isInvalid => ({
              field: 'timing',
              value: extractedTiming,
              isValid: !isInvalid
            }))
          );
        }
        
        // Budget validation - skip if "unknown" (this is acceptable)
        if (extractedBudget && extractedBudget.toLowerCase() !== 'unknown') {
          validationPromises.push(
            this.isInvalidAnswer(extractedBudget, 'budget').then(isInvalid => ({
              field: 'budget',
              value: extractedBudget,
              isValid: !isInvalid
            }))
          );
        }
        
        // Wait for all validations to complete
        const validationResults = await Promise.all(validationPromises);
        
        // If budget is "unknown", add it as valid to validation results
        if (extractedBudget && extractedBudget.toLowerCase() === 'unknown') {
          validationResults.push({
            field: 'budget',
            value: extractedBudget,
            isValid: true
          });
        }
        
        const isValidName = validationResults.find(r => r.field === 'name')?.isValid ?? false;
        const isValidEmail = validationResults.find(r => r.field === 'email')?.isValid ?? false;
        const isValidPhone = validationResults.find(r => r.field === 'phone')?.isValid ?? false;
        const isValidServiceNeed = validationResults.find(r => r.field === 'serviceNeed')?.isValid ?? false;
        const isValidTiming = validationResults.find(r => r.field === 'timing')?.isValid ?? false;
        const isValidBudget = extractedBudget && extractedBudget.toLowerCase() === 'unknown' 
          ? true 
          : (validationResults.find(r => r.field === 'budget')?.isValid ?? false);
        
        // Track which fields failed validation for clear user feedback
        const validationFailures: string[] = [];
        if (extractedName !== null && !isValidName) validationFailures.push('name');
        if (extractedEmail !== null && !isValidEmail) validationFailures.push('email');
        if (extractedPhone !== null && !isValidPhone) validationFailures.push('phone');
        if (extractedServiceNeed !== null && !isValidServiceNeed) validationFailures.push('serviceNeed');
        if (extractedTiming !== null && !isValidTiming) validationFailures.push('timing');
        if (extractedBudget !== null && !isValidBudget) validationFailures.push('budget');
        
        console.log(`[ChatService] AI Validation results for ${sessionId}:`, {
          isValidName,
          isValidEmail,
          isValidPhone,
          isValidServiceNeed,
          isValidTiming,
          isValidBudget,
          extractedName,
          extractedEmail,
          extractedPhone,
          extractedServiceNeed,
          validationFailures
        });
        
        // Store validation failures in conversation metadata or pass to next function
        // We'll use this in getNextQualificationQuestion to provide clear feedback

        // Always try to update lead (even if clearing invalid values)
        // Check if lead already exists
        let lead = await this.leadService.getLeadBySessionId(sessionId);
        
        // If we have at least one valid piece of information OR we need to clear invalid values
        // Also include qualified question answers and sales agent fields (NEW 9-STEP FLOW)
        if (isValidName || isValidEmail || isValidPhone || isValidServiceNeed || isValidTiming || isValidBudget || 
            extractedLeadsPerDay || extractedOvernightLeads || extractedReturnCallTiming ||
            (!isDemoMode && (extractedCompany || extractedBusinessType || extractedLeadSource || extractedLeadsPerWeek || extractedDealValue || extractedAfterHoursPain || extractedCustomers || extractedPricingTier || extractedBiggestProblem)) ||
            (extractedEmail !== null && !isValidEmail) ||
            (extractedPhone !== null && !isValidPhone) ||
            (extractedServiceNeed !== null && !isValidServiceNeed) ||
            (extractedTiming !== null && !isValidTiming) ||
            (extractedBudget !== null && !isValidBudget)) {
          
          const leadData: any = {
            sessionId,
            conversationId: conversation._id.toString(),
          };

          // Only save VALID answers - do not save invalid/vague responses
          // IMPORTANT: Only update fields with valid new values
          // For fields where user provided new value but it's invalid, check if we should clear old value
          
          // Check what currently exists in database
          const currentServiceNeed = lead?.serviceNeed;
          const currentTiming = lead?.timing;
          const currentBudget = lead?.budget;
          
          if (isValidName) leadData.name = extractedName;
          
          // Sales agent fields - NEW 9-STEP FLOW (only save if not demo mode)
          if (!isDemoMode) {
            if (extractedCompany) leadData.company = extractedCompany;
            if (extractedBusinessType) leadData.businessType = extractedBusinessType;
            if (extractedLeadSource) leadData.leadSource = extractedLeadSource;
            if (extractedLeadsPerWeek) leadData.leadsPerWeek = extractedLeadsPerWeek;
            if (extractedDealValue) leadData.dealValue = extractedDealValue;
            if (extractedAfterHoursPain) leadData.afterHoursPain = extractedAfterHoursPain;
            // Legacy fields (backward compatibility)
            if (extractedCustomers) leadData.customers = extractedCustomers;
            if (extractedPricingTier) leadData.pricingTier = extractedPricingTier;
            if (extractedBiggestProblem) leadData.biggestProblem = extractedBiggestProblem;
          }
          
          // For email: Only save if valid format and not invalid
          let emailJustAdded = false;
          if (extractedEmail !== null) {
            if (isValidEmail) {
              // Check if this is a new email (wasn't there before)
              emailJustAdded = !lead?.email || lead.email !== extractedEmail;
              leadData.email = extractedEmail;
            } else {
              // Invalid email format provided - clear it and mark for feedback
              leadData.email = null;
              leadData._lastValidationFailure = { field: 'email', reason: 'Invalid email format' };
              console.log(`[ChatService] Invalid email "${extractedEmail}" provided. Clearing field.`);
            }
          }
          
          // For phone: Only save if valid format and not invalid
          if (extractedPhone !== null) {
            if (isValidPhone) {
              leadData.phone = extractedPhone;
            } else {
              // Invalid phone format - clear it and mark for feedback
              leadData.phone = null;
              leadData._lastValidationFailure = { field: 'phone', reason: 'Invalid phone format' };
              console.log(`[ChatService] Invalid phone "${extractedPhone}" provided. Clearing field.`);
            }
          }
          
          // For serviceNeed: If user provided new answer, validate it
          // IMPORTANT: If extraction returned null (user said "no"/rejected), don't update the field (preserve existing if any)
          // Only update if extraction found something new
          if (extractedServiceNeed !== null) {
            if (isValidServiceNeed) {
              leadData.serviceNeed = extractedServiceNeed; // Save valid answer
            } else {
              // Invalid answer provided - check if this was a rejection or just invalid
              // If user clearly rejected ("no", "skip"), clear the field
              const lastUserMessage = conversation.messages
                .filter((m: any) => m.role === 'user')
                .map((m: any) => m.content.toLowerCase())
                .pop() || '';
              
              const isRejection = /^(no|skip|not|don'?t|won'?t|refuse|reject|i don'?t want|i don'?t need|not interested)/.test(lastUserMessage.trim());
              
              if (isRejection) {
                // User explicitly rejected - clear the field
                leadData.serviceNeed = null;
                console.log(`[ChatService] User rejected serviceNeed question. Clearing field.`);
              }
              // If not a clear rejection, don't update (preserve existing value)
            }
          }
          // If extractedServiceNeed is null, don't set leadData.serviceNeed at all (preserves existing value)
          
          // SENIOR APPROACH: Save what AI extracted, don't use hardcoded question detection
          // The AI naturally handles invalid/vague answers through conversation
          if (extractedTiming !== null) {
            if (isValidTiming) {
              leadData.timing = extractedTiming;
            } else {
              // AI will naturally re-ask in the next message
              console.log(`[ChatService] Timing "${extractedTiming}" not valid - AI will handle naturally`);
            }
          }
          
          // SENIOR APPROACH: Save what AI extracted, let AI handle vague answers naturally
          if (extractedBudget !== null) {
            if (isValidBudget) {
              leadData.budget = extractedBudget;
            } else {
              // AI will naturally re-ask in the next message
              console.log(`[ChatService] Budget "${extractedBudget}" not valid - AI will handle naturally`);
            }
          }
          
          // Save qualified question answers (these don't need validation - just save what user said)
          if (extractedLeadsPerDay !== null) {
            leadData.leadsPerDay = extractedLeadsPerDay;
          }
          if (extractedOvernightLeads !== null) {
            leadData.overnightLeads = extractedOvernightLeads;
          }
          if (extractedReturnCallTiming !== null) {
            leadData.returnCallTiming = extractedReturnCallTiming;
          }
          
          // For serviceNeed: Store validation failure if invalid
          if (extractedServiceNeed !== null && !isValidServiceNeed) {
            const lastUserMessage = conversation.messages
              .filter((m: any) => m.role === 'user')
              .map((m: any) => m.content.toLowerCase())
              .pop() || '';
            
            const isRejection = /^(no|skip|not|don'?t|won'?t|refuse|reject|i don'?t want|i don'?t need|not interested)/.test(lastUserMessage.trim());
            
            if (!isRejection) {
              leadData._lastValidationFailure = { field: 'serviceNeed', reason: 'Invalid service need format' };
            }
          }
          
          // Clean up temporary validation failure marker before saving
          delete leadData._lastValidationFailure; // Don't save this to DB

          // Generate summary and tags
          const summaryPrompt = `Summarize this lead in 2-3 sentences: ${JSON.stringify({
            name: leadData.name || lead?.name,
            email: leadData.email || lead?.email,
            serviceNeed: leadData.serviceNeed || lead?.serviceNeed,
            timing: leadData.timing || lead?.timing,
            budget: leadData.budget || lead?.budget,
          })}`;
          
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
            leadData.summary = `Lead interested in ${leadData.serviceNeed || lead?.serviceNeed || 'services'}`;
          }
          
          // Generate tags based on lead data (optional - can be enhanced with AI)
          // Tags are automatically generated based on service need, timing, budget
          // SENIOR APPROACH: Use AI to generate tags instead of hardcoded keywords
          if (!leadData.tags || leadData.tags.length === 0) {
            const serviceNeed = leadData.serviceNeed || lead?.serviceNeed;
            const timing = leadData.timing || lead?.timing;
            const budget = leadData.budget || lead?.budget;
            
            if (serviceNeed || timing || budget) {
              try {
                const tagResponse = await this.openaiClient.chat.completions.create({
                  model: this.model,
                  messages: [
                    { 
                      role: 'system', 
                      content: 'Generate 1-3 relevant tags for this lead. Return ONLY a JSON array of strings. Tags should be lowercase, single words like: chatbot, website, ecommerce, urgent, consultation, budget-specified. Example: ["chatbot", "urgent"]' 
                    },
                    { 
                      role: 'user', 
                      content: `Service need: ${serviceNeed || 'not specified'}\nTiming: ${timing || 'not specified'}\nBudget: ${budget || 'not specified'}` 
                    },
                  ],
                  temperature: 0.3,
                  max_tokens: 50,
                });
                
                const tagContent = tagResponse.choices[0]?.message?.content?.trim() || '[]';
                const parsedTags = JSON.parse(tagContent);
                if (Array.isArray(parsedTags) && parsedTags.length > 0) {
                  leadData.tags = parsedTags;
                }
              } catch (tagError) {
                console.log(`[ChatService] Tag generation skipped - AI will handle naturally`);
              }
            }
          }

          // Check if all qualification fields are complete (including what we're about to save)
          const finalName = leadData.name || lead?.name;
          const finalEmail = leadData.email !== undefined ? leadData.email : lead?.email;
          const finalPhone = leadData.phone !== undefined ? leadData.phone : lead?.phone;
          const finalServiceNeed = leadData.serviceNeed !== undefined ? leadData.serviceNeed : lead?.serviceNeed;
          const finalTiming = leadData.timing !== undefined ? leadData.timing : lead?.timing;
          const finalBudget = leadData.budget !== undefined ? leadData.budget : lead?.budget;
          const finalLeadsPerDay = leadData.leadsPerDay !== undefined ? leadData.leadsPerDay : lead?.leadsPerDay;
          const finalOvernightLeads = leadData.overnightLeads !== undefined ? leadData.overnightLeads : lead?.overnightLeads;
          const finalReturnCallTiming = leadData.returnCallTiming !== undefined ? leadData.returnCallTiming : lead?.returnCallTiming;
          
          // If budget is unknown, check if qualified questions are answered
          const budgetIsUnknown = finalBudget && finalBudget.toLowerCase() === 'unknown';
          const hasQualifiedQuestions = finalLeadsPerDay && finalOvernightLeads && finalReturnCallTiming;
          
          // Validate final phone format if phone exists
          let finalIsValidPhone = false;
          if (finalPhone) {
            // Check if we validated phone in this extraction
            const phoneValidation = validationResults.find(r => r.field === 'phone');
            if (phoneValidation) {
              finalIsValidPhone = phoneValidation.isValid;
            } else {
              // Phone exists but wasn't extracted now - validate format
              finalIsValidPhone = /\d/.test(finalPhone.replace(/\s/g, '')) && finalPhone.trim().length >= 5;
            }
          }
          
          // NEW 9-STEP FLOW QUALIFICATION CHECK (Client Requirement)
          // Required fields: name, businessType, leadSource, leadsPerWeek, dealValue, afterHoursPain, email
          // Phone is optional but preferred
          const finalBusinessType = leadData.businessType !== undefined ? leadData.businessType : lead?.businessType;
          const finalLeadSource = leadData.leadSource !== undefined ? leadData.leadSource : lead?.leadSource;
          const finalLeadsPerWeek = leadData.leadsPerWeek !== undefined ? leadData.leadsPerWeek : lead?.leadsPerWeek;
          const finalDealValue = leadData.dealValue !== undefined ? leadData.dealValue : lead?.dealValue;
          const finalAfterHoursPain = leadData.afterHoursPain !== undefined ? leadData.afterHoursPain : lead?.afterHoursPain;
          
          // Check if all 9-step flow fields are collected
          const hasAll9StepFields = finalName && 
                                   finalBusinessType && 
                                   finalLeadSource && 
                                   finalLeadsPerWeek && 
                                   finalDealValue && 
                                   finalAfterHoursPain && 
                                   finalEmail;
          
          // All fields valid (email must be valid format)
          const allFieldsValid = isValidName && 
                                (finalEmail ? isValidEmail : true) &&
                                (finalPhone ? finalIsValidPhone : true);
          
          // For 9-step flow: Email is required, phone is optional
          // Lead is qualified when all discovery fields + email are collected
          const hasAllFields = hasAll9StepFields;
          
          if (hasAllFields && allFieldsValid) {
            leadData.status = 'qualified';
            
            // If this is a new qualification (wasn't qualified before), send notification
            const wasQualifiedBefore = lead?.status === 'qualified';
            if (!wasQualifiedBefore) {
              // Will send notification after saving
              leadData._shouldNotify = true;
            }
          }

          if (lead) {
            // Update existing lead - use $set to properly handle null values
            await this.leadService.updateLead(sessionId, leadData);
            
            // Re-fetch to get updated status
            const updatedLead = await this.leadService.getLeadBySessionId(sessionId);
            
            console.log(`[ChatService] ✅ Lead updated for session ${sessionId}`, {
              name: updatedLead?.name,
              email: updatedLead?.email,
              phone: updatedLead?.phone,
              serviceNeed: updatedLead?.serviceNeed,
              timing: updatedLead?.timing,
              budget: updatedLead?.budget,
              status: updatedLead?.status || 'new'
            });
            
            // Send notification if lead just became qualified
            if (leadData._shouldNotify && updatedLead?.status === 'qualified') {
              await this.sendQualifiedLeadNotification(sessionId, updatedLead, conversation);
            }
            
            // Send confirmation email when email is first collected
            // Priority: If buying intent detected, send email immediately when email is collected
            // Otherwise, send if lead is NOT qualified yet (qualified leads get email from sendQualifiedLeadNotification)
            const hasBuyingIntentFlag = updatedLead?.hasBuyingIntent || leadData.hasBuyingIntent;
            const shouldSendEmail = emailJustAdded && updatedLead?.email && isValidEmail && 
                                   (hasBuyingIntentFlag || updatedLead?.status !== 'qualified');
            
            if (shouldSendEmail) {
              try {
                await this.emailService.sendLeadQualificationConfirmation(
                  updatedLead.email,
                  updatedLead.name || 'there',
                  updatedLead.serviceNeed,
                  updatedLead.timing,
                  updatedLead.budget
                );
                console.log(`[ChatService] ✅ Email confirmation sent to user: ${updatedLead.email}${hasBuyingIntentFlag ? ' (buying intent detected)' : ''}`);
              } catch (emailError) {
                console.error(`[ChatService] Error sending email confirmation:`, emailError);
              }
            }
          } else if (isValidName || isValidEmail || isValidPhone || isValidServiceNeed || isValidTiming || isValidBudget) {
            // Create new lead (will be marked qualified if all fields are present including phone)
            if (isValidName && isValidEmail && isValidPhone && isValidServiceNeed && isValidTiming && isValidBudget) {
              leadData.status = 'qualified';
            }
            lead = await this.leadService.createLead(leadData);
            console.log(`[ChatService] ✅ Lead created for session ${sessionId}`, {
              status: leadData.status || 'new',
              hasAllFields: !!(isValidName && isValidEmail && isValidPhone && isValidServiceNeed && isValidTiming && isValidBudget)
            });

            // If lead is qualified (has all required fields including phone), send transcript to admin
            // Check final state after creation
            const finalLead = await this.leadService.getLeadBySessionId(sessionId);
            if (finalLead) {
              const finalHasAllFields = finalLead.name && finalLead.email && finalLead.phone && finalLead.serviceNeed && finalLead.timing && finalLead.budget;
              if (finalHasAllFields && finalLead.status === 'qualified') {
                await this.sendQualifiedLeadNotification(sessionId, finalLead, conversation);
              }
              
              // Send email if email is collected (either with buying intent or just collected)
              // Priority: Send immediately when email is collected, especially with buying intent
              const hasBuyingIntentNow = finalLead.hasBuyingIntent || leadData.hasBuyingIntent;
              const shouldSendEmailForNewLead = (hasBuyingIntentNow || emailJustAdded) && 
                                                 finalLead.email && 
                                                 isValidEmail && 
                                                 finalLead.status !== 'qualified';
              
              if (shouldSendEmailForNewLead) {
                try {
                  await this.emailService.sendLeadQualificationConfirmation(
                    finalLead.email,
                    finalLead.name || 'there',
                    finalLead.serviceNeed,
                    finalLead.timing,
                    finalLead.budget
                  );
                  console.log(`[ChatService] ✅ Email confirmation sent to user: ${finalLead.email}${hasBuyingIntentNow ? ' (buying intent detected)' : ' (email just collected)'}`);
                } catch (emailError) {
                  console.error(`[ChatService] Error sending email confirmation:`, emailError);
                }
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

  /**
   * Sends qualified lead notification with transcript to admin
   */
  private async sendQualifiedLeadNotification(sessionId: string, lead: any, conversation: any) {
    try {
      // Get full conversation for transcript
      const fullConversation = await this.getConversation(sessionId);
      
      // Create full transcript
      const transcript = fullConversation?.messages
        ?.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Abby'}: ${msg.content}`)
        .join('\n\n') || '';
      
      const transcriptHtml = fullConversation?.messages
        ?.map((msg: any) => `
          <div style="margin-bottom: 15px; padding: 10px; background: ${msg.role === 'user' ? '#e3f2fd' : '#f5f5f5'}; border-radius: 4px;">
            <strong>${msg.role === 'user' ? 'User' : 'Abby'}:</strong>
            <p style="margin: 5px 0 0 0;">${msg.content.replace(/\n/g, '<br>')}</p>
            <small style="color: #666;">${new Date(msg.timestamp).toLocaleString()}</small>
          </div>
        `)
        .join('') || '';

      // Send email notification to admin
      const adminEmail = config.adminEmail;
      if (adminEmail) {
        try {
          await this.emailService.sendEmail(
            adminEmail,
            `New Qualified Lead: ${lead.name}`,
            `
              <h2>New Qualified Lead</h2>
              <div style="background: #fff; padding: 15px; margin: 10px 0; border-left: 4px solid #22c55e;">
                <p><strong>Name:</strong> ${lead.name}</p>
                <p><strong>Email:</strong> ${lead.email || 'Not provided'}</p>
                <p><strong>Phone:</strong> ${lead.phone || 'Not provided'}</p>
                <p><strong>Service Need:</strong> ${lead.serviceNeed}</p>
                <p><strong>Timing:</strong> ${lead.timing || 'Not specified'}</p>
                <p><strong>Budget:</strong> ${lead.budget || 'Not specified'}</p>
                <p><strong>Summary:</strong> ${lead.summary || 'Not provided'}</p>
                <p><strong>Session ID:</strong> ${sessionId}</p>
              </div>
              <h3>Full Conversation Transcript</h3>
              ${transcriptHtml}
            `
          );
          console.log(`[ChatService] ✅ Lead notification with transcript sent to admin: ${adminEmail}`);
        } catch (emailError) {
          console.error(`[ChatService] Error sending email notification to admin:`, emailError);
        }
      }

      // Send confirmation email to user
      if (lead.email) {
        try {
          await this.emailService.sendLeadQualificationConfirmation(
            lead.email,
            lead.name,
            lead.serviceNeed,
            lead.timing,
            lead.budget
          );
          console.log(`[ChatService] ✅ Lead qualification confirmation sent to user: ${lead.email}`);
        } catch (emailError) {
          console.error(`[ChatService] Error sending confirmation email to user:`, emailError);
        }
      }

      // POST transcript to admin endpoint (for dashboard/Phase 2)
      try {
        const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:9000';
        // Note: This requires authentication, but since it's an internal call, we'll skip auth for now
        // In production, you might want to use a service-to-service token or call the service directly
        const response = await fetch(`${apiBaseUrl}/api/dashboard/transcript`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            transcript,
            lead: {
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              serviceNeed: lead.serviceNeed,
              timing: lead.timing,
              budget: lead.budget,
              tags: lead.tags || [],
              summary: lead.summary,
              status: lead.status,
              qualifiedAt: lead.qualifiedAt,
              createdAt: lead.createdAt,
              updatedAt: lead.updatedAt,
            },
            conversationId: conversation._id.toString(),
          }),
        });
        
        if (response.ok) {
          console.log(`[ChatService] ✅ Transcript POSTed to admin endpoint successfully`);
        } else {
          console.warn(`[ChatService] ⚠️ Failed to POST transcript to admin endpoint: ${response.status}`);
        }
      } catch (postError) {
        // Don't fail the whole process if POST fails
        console.error(`[ChatService] Error POSTing transcript to admin endpoint:`, postError);
      }
      
      console.log(`[ChatService] ✅ Qualified lead saved. Transcript available via /api/dashboard/conversation/${sessionId}`);
      
    } catch (error) {
      console.error(`[ChatService] Error sending qualified lead notification:`, error);
    }
  }

  /**
   * Handle demo booking when user confirms a time slot
   */
  async handleDemoBooking(sessionId: string, timeSlot: Date, notes?: string): Promise<any> {
    try {
      // Check if we're in demo mode (WebChatSales.com - no bookings allowed)
      const isDemoMode = process.env.DEMO_MODE === 'true' || 
                         process.env.DEMO_MODE === '1' ||
                         (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('webchatsales.com'));
      
      if (isDemoMode) {
        throw new Error('Demo booking is not available on WebChatSales.com. Demo booking is only available on client websites where Abby is installed.');
      }

      // Check if user already has a booking
      const hasBooking = await this.bookingService.hasExistingBooking(sessionId);
      if (hasBooking) {
        throw new Error('You already have a booking. Please cancel your existing booking before creating a new one.');
      }

      // Check if time slot is available
      const isAvailable = await this.bookingService.isTimeSlotAvailable(timeSlot);
      if (!isAvailable) {
        throw new Error('This time slot is no longer available. Please select a different time.');
      }

      // Get lead for this session
      const lead = await this.leadService.getLeadBySessionId(sessionId);
      if (!lead) {
        throw new Error('Lead not found for this session');
      }

      // Get conversation
      const conversation = await this.getConversation(sessionId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Create scheduling link (can be customized)
      const schedulingLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/book-demo?sessionId=${sessionId}&timeSlot=${timeSlot.toISOString()}`;

      // Create booking
      const booking = await this.bookingService.createBooking({
        sessionId,
        leadId: lead._id.toString(),
        timeSlot,
        schedulingLink,
        userEmail: lead.email,
        userName: lead.name,
        userPhone: lead.phone,
        notes: notes || `Demo booking for ${lead.serviceNeed}`,
        conversationId: conversation._id.toString(),
      });

      // Update lead status to booked
      await this.leadService.updateLead(sessionId, { status: 'booked' });

      // Send confirmation email to user
      if (lead.email) {
        try {
          await this.emailService.sendDemoBookingConfirmation(
            lead.email,
            lead.name,
            timeSlot,
            lead.serviceNeed
          );
          console.log(`[ChatService] ✅ Demo booking confirmation sent to user: ${lead.email}`);
        } catch (emailError) {
          console.error(`[ChatService] Error sending demo booking confirmation to user:`, emailError);
        }
      }

      // Send notification email to admin
      try {
        await this.emailService.sendDemoBookingNotification(
          lead.email,
          lead.name,
          timeSlot,
          lead.serviceNeed,
          lead.phone
        );
        console.log(`[ChatService] ✅ Demo booking notification sent to admin`);
      } catch (emailError) {
        console.error(`[ChatService] Error sending demo booking notification to admin:`, emailError);
      }

      console.log(`[ChatService] ✅ Demo booking created for session ${sessionId}`, {
        bookingId: booking._id,
        timeSlot: timeSlot.toISOString(),
      });

      return booking;
    } catch (error) {
      console.error(`[ChatService] Error creating demo booking:`, error);
      throw error;
    }
  }
}

