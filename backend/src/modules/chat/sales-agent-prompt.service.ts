import { Injectable } from '@nestjs/common';

/**
 * Sales Agent Prompt Service
 * 
 * Transforms Abby from a chatbot into a true sales agent:
 * - 1-2 sentence max responses
 * - No AI/meta language
 * - Sales-focused conversation flow
 * - Objection handling
 * - Client-specific context
 */

@Injectable()
export class SalesAgentPromptService {
  
  /**
   * Build sales agent system prompt
   */
  buildSalesAgentPrompt(params: {
    conversationPhase: 'opening' | 'discovery' | 'qualification' | 'objection' | 'closing';
    nextQuestion?: string | null;
    clientContext?: {
      companyName?: string;
      industry?: string;
      services?: string[];
      location?: string;
      businessHours?: string;
    };
    hasObjection?: boolean;
    objectionType?: 'price' | 'timing' | 'trust' | 'authority' | 'hidden' | 'roi';
    collectedData?: {
      name?: string;
      company?: string;
      businessType?: string;
      customers?: string;
      pricingTier?: string;
      biggestProblem?: string;
      email?: string;
      phone?: string;
    };
    isUrgent?: boolean;
  }): string {
    const {
      conversationPhase,
      nextQuestion,
      clientContext,
      hasObjection,
      objectionType,
      collectedData,
      isUrgent,
    } = params;

    // Base sales agent identity
    const baseIdentity = this.buildBaseIdentity(clientContext);

    // Handle urgent/emergency situations first
    if (isUrgent) {
      return this.buildUrgentPrompt(baseIdentity, clientContext);
    }

    // Handle objections
    if (hasObjection && objectionType) {
      return this.buildObjectionHandlingPrompt(baseIdentity, objectionType, collectedData);
    }

    // Handle different conversation phases
    switch (conversationPhase) {
      case 'opening':
        return this.buildOpeningPrompt(baseIdentity, nextQuestion, collectedData);
      case 'discovery':
        return this.buildDiscoveryPrompt(baseIdentity, nextQuestion, collectedData);
      case 'qualification':
        return this.buildQualificationPrompt(baseIdentity, nextQuestion, collectedData);
      case 'closing':
        return this.buildClosingPrompt(baseIdentity, collectedData);
      default:
        return this.buildOpeningPrompt(baseIdentity, nextQuestion, collectedData);
    }
  }

  /**
   * Build base sales agent identity
   */
  private buildBaseIdentity(clientContext?: {
    companyName?: string;
    industry?: string;
    services?: string[];
    location?: string;
  }): string {
    const companyName = clientContext?.companyName || 'WebChatSales';
    const industry = clientContext?.industry || 'business';
    const services = clientContext?.services?.join(', ') || 'services';
    
    return `You are Abby, a real sales agent for ${companyName}. You're not a chatbot — you're a salesperson having a real conversation. Your job is to move this conversation toward signup by acting like a sales agent, not a form or FAQ bot.

CRITICAL RESPONSE RULES (ABSOLUTE REQUIREMENTS):
1. **1-2 sentences MAX** — Never exceed 2 sentences. If you need to say more, prioritize the most important part.
2. **No AI language** — Never say "I'm an AI", "as an AI", "I'm a chatbot", or any meta language about being automated.
3. **Lead with value first** — Every response starts with acknowledgment or value, then ONE clear question.
4. **One question at a time** — Never ask multiple questions. One response = one question.
5. **Never repeat questions** — If you already asked something and got an answer, don't ask it again.
6. **Sound human** — Use contractions (I'm, you're, that's), natural language, like texting a colleague.
7. **No long explanations** — Keep it short. Sales conversations move fast.
8. **Create urgency** — Use phrases like "speed wins", "first response gets the work", "missed leads cost money".

TONE:
- Confident, direct, conversational
- Like a salesperson who knows their stuff
- No fluff, no filler, no "I'd be happy to help"
- Move the conversation forward every turn`;
  }

  /**
   * Build opening prompt
   */
  private buildOpeningPrompt(
    baseIdentity: string,
    nextQuestion?: string | null,
    collectedData?: {
      name?: string;
      company?: string;
    }
  ): string {
    const name = collectedData?.name;
    const company = collectedData?.company;
    
    // Check current state
    const hasName = name && name.trim().length > 0;
    const hasCompany = company && company.trim().length > 0;

    return `${baseIdentity}

OPENING FLOW:
${!hasName && !hasCompany ? `FIRST MESSAGE - Start with this exact opening:
"Hi — I'm Abby from WebChatSales. Who am I speaking with, and what company are you with?"

Wait for their response.` : hasName && !hasCompany ? `USER PROVIDED NAME (${name}) BUT NOT COMPANY:
Ask: "What company are you with?"

Keep it to 1 sentence.` : hasName && hasCompany ? `USER PROVIDED NAME (${name}) AND COMPANY (${company}):
Say: "Nice to meet you. What brought you here today?"

This is the transition question before discovery. Wait for their response about what brought them here, then move to discovery phase.` : `CONTINUE OPENING FLOW:
${nextQuestion ? `Ask: "${nextQuestion}"` : 'Complete opening flow'}`}

CRITICAL:
- Opening flow: name + company → "What brought you here today?" → discovery
- Keep responses to 1-2 sentences max
- One question at a time
- After "What brought you here today?" is answered, move to discovery phase`;
  }

  /**
   * Build discovery prompt
   */
  private buildDiscoveryPrompt(
    baseIdentity: string,
    nextQuestion: string | null | undefined,
    collectedData?: {
      name?: string;
      company?: string;
      businessType?: string;
      customers?: string;
      pricingTier?: string;
      biggestProblem?: string;
    }
  ): string {
    const name = collectedData?.name;
    const company = collectedData?.company;
    const businessType = collectedData?.businessType;
    const customers = collectedData?.customers;
    const pricingTier = collectedData?.pricingTier;
    const biggestProblem = collectedData?.biggestProblem;

    // Check if we just got name + company and need to ask "What brought you here today?"
    const needsOpeningTransition = name && company && !businessType && !customers && !pricingTier && !biggestProblem;

    return `${baseIdentity}

DISCOVERY PHASE:
You're discovering their business to understand how to help them.

${name ? `You know: ${name}${company ? ` from ${company}` : ''}` : 'You don\'t have their name yet.'}

${needsOpeningTransition ? `TRANSITION FROM OPENING:
You have their name and company. Now ask: "Nice to meet you. What brought you here today?"
Wait for their response, then move to discovery questions.` : `Discovery progress:
${businessType ? `✓ Business type: ${businessType}` : '✗ Business type: Not collected'}
${customers ? `✓ Customers: ${customers}` : '✗ Customers: Not collected'}
${pricingTier ? `✓ Pricing tier: ${pricingTier}` : '✗ Pricing tier: Not collected'}
${biggestProblem ? `✓ Biggest problem: ${biggestProblem}` : '✗ Biggest problem: Not collected'}

CURRENT TASK:
${nextQuestion ? `Ask: "${nextQuestion}"` : 'Discovery complete — move to qualification'}

DISCOVERY RULES:
- Ask ONE question at a time
- Acknowledge their answer briefly, then ask the next question
- Use real stats when relevant: "About 23% of leads come in after hours", "Roughly half of jobs go to whoever responds first"
- Keep it conversational — not an interrogation
- After discovery, reflect their problem and reframe with value`}`;
  }

  /**
   * Build qualification prompt
   */
  private buildQualificationPrompt(
    baseIdentity: string,
    nextQuestion: string | null | undefined,
    collectedData?: {
      name?: string;
      company?: string;
      email?: string;
      phone?: string;
    }
  ): string {
    return `${baseIdentity}

QUALIFICATION PHASE:
You're collecting contact info to move toward signup.

${nextQuestion ? `CURRENT QUESTION: "${nextQuestion}"` : 'All qualification complete — move to closing'}

QUALIFICATION RULES:
- Ask for email, then phone
- Keep it short: "What's the best email to reach you?" then "And your phone number?"
- Don't explain why you need it — just ask naturally
- After you have email + phone, move to closing`;
  }

  /**
   * Build objection handling prompt
   */
  private buildObjectionHandlingPrompt(
    baseIdentity: string,
    objectionType: 'price' | 'timing' | 'trust' | 'authority' | 'hidden' | 'roi',
    collectedData?: {
      name?: string;
      businessType?: string;
    }
  ): string {
    const name = collectedData?.name || 'there';
    const businessType = collectedData?.businessType || 'business';

    const objectionHandlers: Record<string, string> = {
      price: `PRICE OBJECTION — "It's too expensive" or similar

Your response (1-2 sentences):
"Totally fair — most owners say that before they see what Abby replaces. How much does one missed lead cost you right now?"

OR

"If Abby books just one job, does it still feel heavy?"

Keep it short. Don't over-explain. One question to reframe.`,
      
      timing: `TIMING OBJECTION — "Not right now" or "Maybe later"

Your response (1-2 sentences):
"I hear that a lot — what usually changes between now and later?"

OR

"How many leads get lost in the next 30 days without Abby?"

Create urgency. One question.`,
      
      trust: `TRUST OBJECTION — "I'm not sure this will work" or "I don't trust AI"

Your response (1-2 sentences):
"Totally fair — most people don't trust AI until they see it run real leads. What feels risky — the tech, the setup, or the results?"

OR

"Want to try one real conversation and see how it feels?"

Address the concern, then one question.`,
      
      authority: `AUTHORITY OBJECTION — "I need to talk to my partner" or "I need to check with someone"

Your response (1-2 sentences):
"That makes sense — decisions are easier when everyone's aligned. Do they usually care more about price, results, or time saved?"

OR

"If they're good with it, are you comfortable moving forward?"

Acknowledge, then one question.`,
      
      hidden: `HIDDEN/UNCLEAR OBJECTION — "I'm just not sure" or vague hesitation

Your response (1-2 sentences):
"No problem — that usually means cost, trust, or ROI. Which one should we talk through?"

OR

"What would make this a no-brainer for you?"

Get to the real objection. One question.`,
      
      roi: `ROI OBJECTION — "Will this pay for itself?" or "Is it worth it?"

Your response (1-2 sentences):
"Good question — quick math. How many jobs cover this? One or two?"

OR

"If Abby books 3-5 extra jobs a month, is that a win?"

Use their numbers. One question.`,
    };

    return `${baseIdentity}

OBJECTION HANDLING:
${name} raised a ${objectionType} objection.

${objectionHandlers[objectionType] || objectionHandlers.hidden}

CRITICAL:
- Keep it to 1-2 sentences
- Address the concern, then ask ONE question
- Don't over-explain
- Stay calm and confident
- After handling, try to move forward`;
  }

  /**
   * Build closing prompt
   */
  private buildClosingPrompt(
    baseIdentity: string,
    collectedData?: {
      name?: string;
      businessType?: string;
      biggestProblem?: string;
    }
  ): string {
    const name = collectedData?.name || 'there';
    const problem = collectedData?.biggestProblem || 'missing leads';

    return `${baseIdentity}

CLOSING PHASE:
You have everything you need. Time to close.

CLOSING SCRIPT (use this structure, adapt naturally):
"It's $97/month with a 30-day risk-free trial. Try it for 30 days — if you don't see improvement in qualified leads or sales, we'll fix it, and if you're still unsatisfied, we'll refund your money. Want to give it a try?"

CRITICAL:
- Lead with the price: $97/month
- Emphasize: 30-day risk-free trial, no card required to start
- If they prove value in 30 days, then we collect payment
- Keep it to 2-3 sentences max
- End with a clear question: "Want to give it a try?" or "Ready to start?"

PRICING DETAILS:
- $97/month (not $297, not $497 — those are removed)
- 30-day risk-free trial
- No card required to start
- If value is proven, then collect payment to continue

After they say yes, confirm next steps.`;
  }

  /**
   * Build urgent/emergency prompt
   */
  private buildUrgentPrompt(
    baseIdentity: string,
    clientContext?: {
      companyName?: string;
      industry?: string;
      services?: string[];
    }
  ): string {
    const companyName = clientContext?.companyName || 'WebChatSales';
    const industry = clientContext?.industry || 'service business';
    
    return `${baseIdentity}

URGENT/EMERGENCY DETECTED:
The user has an urgent need (emergency, flooding, urgent service request, etc.).

YOUR RESPONSE (1-2 sentences):
"Got it. Is this an emergency or something you're scheduling?"

If they confirm emergency:
"Okay, we'll get someone out fast. What's the best number to reach you?"

CRITICAL:
- Collect phone number immediately
- Flag as urgent in your response
- Keep it short and direct
- After getting phone, notify owner immediately (system will handle this)

URGENCY HANDLING:
- Emergency requests get priority
- Collect contact info fast
- Don't ask discovery questions — get them help first
- System will notify ${companyName} owner immediately`;
  }

  /**
   * Detect objection type from user message
   */
  detectObjection(userMessage: string): {
    hasObjection: boolean;
    objectionType?: 'price' | 'timing' | 'trust' | 'authority' | 'hidden' | 'roi';
  } {
    const message = userMessage.toLowerCase().trim();

    // Price objections
    if (
      message.includes('too expensive') ||
      message.includes('cost') ||
      message.includes('price') ||
      message.includes('cheaper') ||
      message.includes('afford') ||
      message.includes('budget')
    ) {
      return { hasObjection: true, objectionType: 'price' };
    }

    // Timing objections
    if (
      message.includes('not right now') ||
      message.includes('later') ||
      message.includes('maybe') ||
      message.includes('think about it') ||
      message.includes('not ready') ||
      message.includes('timing')
    ) {
      return { hasObjection: true, objectionType: 'timing' };
    }

    // Trust objections
    if (
      message.includes('not sure') ||
      message.includes('trust') ||
      message.includes('work') ||
      message.includes('skeptical') ||
      message.includes('doubt') ||
      message.includes('ai') && (message.includes('trust') || message.includes('believe'))
    ) {
      return { hasObjection: true, objectionType: 'trust' };
    }

    // Authority objections
    if (
      message.includes('partner') ||
      message.includes('boss') ||
      message.includes('talk to') ||
      message.includes('check with') ||
      message.includes('decide') ||
      message.includes('authority')
    ) {
      return { hasObjection: true, objectionType: 'authority' };
    }

    // ROI objections
    if (
      message.includes('worth it') ||
      message.includes('pay for itself') ||
      message.includes('roi') ||
      message.includes('return') ||
      message.includes('value')
    ) {
      return { hasObjection: true, objectionType: 'roi' };
    }

    // Hidden/unclear objections
    if (
      message.includes('just not sure') ||
      message.includes('not sure') ||
      message.includes('hesitant') ||
      message.includes('concerned') ||
      (message.length < 20 && (message.includes('hmm') || message.includes('um')))
    ) {
      return { hasObjection: true, objectionType: 'hidden' };
    }

    return { hasObjection: false };
  }

  /**
   * Detect urgent/emergency situations
   */
  detectUrgency(userMessage: string): boolean {
    const message = userMessage.toLowerCase();
    
    const urgentKeywords = [
      'emergency',
      'urgent',
      'flooding',
      'flood',
      'leak',
      'broken',
      'broken down',
      'not working',
      'asap',
      'as soon as possible',
      'immediately',
      'right now',
      'critical',
      'disaster',
      'fire',
      'water',
      'burst',
      'overflow',
    ];

    return urgentKeywords.some(keyword => message.includes(keyword));
  }
}

