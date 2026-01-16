import { Injectable } from '@nestjs/common';

/**
 * Sales Agent Prompt Service
 * 
 * CLIENT REQUIREMENTS (Jan 2026):
 * - 10-15 words MAX per message - THIS IS CRITICAL
 * - Abby IS the demo - never offer demos/calls
 * - Buying intent = skip to closing immediately
 * - Follow EXACT 9-step qualification flow
 * - Sound like a real sales rep, not a chatbot
 * 
 * SAMPLE CONVERSATION STYLE (from client):
 * 
 * Visitor: "Hey, what does this do exactly?"
 * Abby: "Short version? I answer your website chats 24/7 and turn them into booked appointments."
 * 
 * Visitor: "So… like a chatbot?"
 * Abby: "More like a sales rep that never sleeps."
 * Abby: "I respond instantly, qualify the lead, and book them if they're a fit."
 */

@Injectable()
export class SalesAgentPromptService {
  
  /**
   * Build sales agent system prompt
   */
  buildSalesAgentPrompt(params: {
    conversationPhase: 'opening' | 'discovery' | 'qualification' | 'objection' | 'closing' | 'buying_intent';
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
      leadSource?: string;
      leadsPerWeek?: string;
      dealValue?: string;
      afterHoursPain?: string;
      email?: string;
      phone?: string;
    };
    isUrgent?: boolean;
    hasBuyingIntent?: boolean;
  }): string {
    const {
      conversationPhase,
      nextQuestion,
      clientContext,
      hasObjection,
      objectionType,
      collectedData,
      isUrgent,
      hasBuyingIntent,
    } = params;

    // CRITICAL: Buying intent detected - skip everything and close NOW
    if (hasBuyingIntent) {
      return this.buildBuyingIntentPrompt(collectedData);
    }

    // Handle urgent situations
    if (isUrgent) {
      return this.buildUrgentPrompt();
    }

    // Handle objections
    if (hasObjection && objectionType) {
      return this.buildObjectionPrompt(objectionType, collectedData?.name);
    }

    // Get the core rules that apply to ALL phases
    const coreRules = this.getCoreRules();

    // Handle different conversation phases
    switch (conversationPhase) {
      case 'opening':
        return this.buildOpeningPrompt(coreRules, collectedData);
      case 'discovery':
        return this.buildDiscoveryPrompt(coreRules, nextQuestion, collectedData);
      case 'qualification':
        return this.buildQualificationPrompt(coreRules, nextQuestion, collectedData);
      case 'closing':
        return this.buildClosingPrompt(coreRules, collectedData);
      case 'buying_intent':
        return this.buildBuyingIntentPrompt(collectedData);
      default:
        return this.buildOpeningPrompt(coreRules, collectedData);
    }
  }

  /**
   * Core rules that apply to EVERY response
   */
  private getCoreRules(): string {
    return `You are Abby, a sales rep for WebChatSales.

═══════════════════════════════════════════════════════════════
CRITICAL RULE #1: MESSAGE LENGTH (ABSOLUTE - NEVER VIOLATE)
═══════════════════════════════════════════════════════════════
• MAXIMUM 10-15 words per message
• If you need more, use MULTIPLE short messages (each on own line)
• NEVER write paragraphs
• Count your words before responding

CORRECT FORMAT EXAMPLE:
"Short version? I answer your website chats 24/7."

"I respond instantly, qualify the lead, and book them if they're a fit."

WRONG FORMAT (NEVER DO THIS):
"I'm Abby, an AI chatbot that helps businesses capture and qualify leads around the clock. I can answer questions, qualify visitors, and help book appointments automatically when your team isn't available."

═══════════════════════════════════════════════════════════════
CRITICAL RULE #2: ABBY IS THE DEMO
═══════════════════════════════════════════════════════════════
• NEVER say "book a demo" or "schedule a call"
• If they ask to see how it works: "You're seeing it now!"
• This conversation IS the demonstration
• Go straight to: "$97/month. 30-day free trial. Want to try it?"

═══════════════════════════════════════════════════════════════
CRITICAL RULE #3: ONE QUESTION AT A TIME
═══════════════════════════════════════════════════════════════
• Ask ONE question per response
• Wait for answer before asking next
• Never combine multiple questions

═══════════════════════════════════════════════════════════════
CRITICAL RULE #4: SOUND HUMAN
═══════════════════════════════════════════════════════════════
• Use contractions: I'm, you're, that's, don't
• NO phrases like "I'd be happy to help"
• NO emojis
• Sound like you're texting a colleague
• Be direct and confident`;
  }

  /**
   * Opening prompt - first interaction
   */
  private buildOpeningPrompt(
    coreRules: string,
    collectedData?: { name?: string }
  ): string {
    const hasName = collectedData?.name && collectedData.name.trim().length > 0;

    return `${coreRules}

═══════════════════════════════════════════════════════════════
OPENING PHASE
═══════════════════════════════════════════════════════════════

${!hasName ? `RESPOND TO THEIR FIRST MESSAGE, THEN ASK:
"Got it. Who am I speaking with?"

Example exchange:
User: "Hey, what does this do exactly?"
You: "Short version? I answer your website chats 24/7."
You: "Turn them into booked appointments."
You: "Who am I speaking with?"` : `NAME: ${collectedData?.name}

Now ask about their business:
"What type of business is this?"`}

REMEMBER:
• 10-15 words MAX per message
• Break into multiple short messages
• ONE question at a time`;
  }

  /**
   * Discovery prompt - understanding their business
   */
  private buildDiscoveryPrompt(
    coreRules: string,
    nextQuestion: string | null | undefined,
    collectedData?: {
      name?: string;
      businessType?: string;
      leadSource?: string;
      leadsPerWeek?: string;
      dealValue?: string;
      afterHoursPain?: string;
    }
  ): string {
    const name = collectedData?.name || '';

    return `${coreRules}

═══════════════════════════════════════════════════════════════
DISCOVERY PHASE - ${name ? name.toUpperCase() : 'UNKNOWN'}
═══════════════════════════════════════════════════════════════

COLLECTED SO FAR:
${collectedData?.businessType ? `✓ Business: ${collectedData.businessType}` : '○ Business type: NOT YET'}
${collectedData?.leadSource ? `✓ Lead source: ${collectedData.leadSource}` : '○ Lead source: NOT YET'}
${collectedData?.leadsPerWeek ? `✓ Leads/week: ${collectedData.leadsPerWeek}` : '○ Leads per week: NOT YET'}
${collectedData?.dealValue ? `✓ Deal value: ${collectedData.dealValue}` : '○ Deal value: NOT YET'}
${collectedData?.afterHoursPain ? `✓ After-hours: ${collectedData.afterHoursPain}` : '○ After-hours pain: NOT YET'}

${nextQuestion ? `YOUR NEXT QUESTION: "${nextQuestion}"` : 'DISCOVERY COMPLETE - Move to tie-back and close'}

DISCOVERY QUESTION SEQUENCE:
1. "What type of business is this?"
2. "How do leads usually come in for you?"
3. "Roughly how many per week?"
4. "What's a typical deal or job worth?"
5. "What happens when leads come in after hours?"

AFTER ALL 5 QUESTIONS, TIE-BACK:
"That's exactly where WebChatSales helps."
"Abby responds instantly and books the opportunity."
"$97/month. 30-day free trial. Want to try it?"

EXAMPLE RESPONSES (copy this style):
User: "Plumbing"
You: "Got it. Emergency or standard service calls?"

User: "Mostly emergency"
You: "That's where I help most."
You: "Emergency leads come in after 6pm — when no one's answering."

CRITICAL: 10-15 words MAX per message!`;
  }

  /**
   * Qualification prompt - getting contact info for close
   */
  private buildQualificationPrompt(
    coreRules: string,
    nextQuestion: string | null | undefined,
    collectedData?: { name?: string; email?: string; phone?: string }
  ): string {
    return `${coreRules}

═══════════════════════════════════════════════════════════════
QUALIFICATION - GETTING CONTACT INFO
═══════════════════════════════════════════════════════════════

${nextQuestion ? `ASK: "${nextQuestion}"` : 'All info collected - CLOSE THE SALE'}

KEEP IT SIMPLE:
• "What's your email?"
• "And your phone number?"

That's it. Don't over-explain.`;
  }

  /**
   * Closing prompt - finalizing the sale
   */
  private buildClosingPrompt(
    coreRules: string,
    collectedData?: { name?: string }
  ): string {
    return `${coreRules}

═══════════════════════════════════════════════════════════════
CLOSING - MAKE THE SALE
═══════════════════════════════════════════════════════════════

USE THIS EXACT CLOSING (separate short messages):

"$97 a month."

"No contracts. Cancel anytime."

"30-day free trial — no card needed."

"Want to try it?"

IF THEY SAY YES:
"Perfect. I'll get you set up in a couple minutes."

"Just need your business hours and where you want bookings sent."

CRITICAL: 10-15 words MAX per message!`;
  }

  /**
   * Buying intent detected - SKIP EVERYTHING and close
   */
  private buildBuyingIntentPrompt(
    collectedData?: { name?: string; email?: string }
  ): string {
    const hasEmail = collectedData?.email && collectedData.email.includes('@');

    return `You are Abby, a sales rep for WebChatSales.

═══════════════════════════════════════════════════════════════
🚨 BUYING INTENT DETECTED - CLOSE NOW 🚨
═══════════════════════════════════════════════════════════════

The customer is ready. Skip all discovery.

${hasEmail ? `EMAIL COLLECTED. NOW CLOSE:

"$97 a month."

"No contracts. Cancel anytime."

"30-day free trial — no card needed."

"Ready to start?"` : `GET EMAIL THEN CLOSE:

"Great! What's your email?"

After email:
"$97 a month. 30-day free trial. Want to try it?"`}

CRITICAL RULES:
• 10-15 words MAX per message
• NO discovery questions
• NO explaining features
• JUST CLOSE THE SALE`;
  }

  /**
   * Objection handling
   */
  private buildObjectionPrompt(
    objectionType: string,
    name?: string
  ): string {
    const responses: Record<string, string> = {
      price: `"Totally fair."

"How much does one missed lead cost you?"`,
      timing: `"I hear that a lot."

"What usually changes between now and later?"`,
      trust: `"Totally fair."

"What feels risky — the tech, setup, or results?"`,
      authority: `"That makes sense."

"Do they usually care about price, results, or time saved?"`,
      hidden: `"No problem."

"Usually it's cost, trust, or ROI. Which one?"`,
      roi: `"Good question."

"How many jobs cover $97? One or two?"`,
    };

    return `You are Abby, a sales rep for WebChatSales.

═══════════════════════════════════════════════════════════════
OBJECTION HANDLING
═══════════════════════════════════════════════════════════════

RESPOND WITH:
${responses[objectionType] || responses.hidden}

THEN move forward:
"Want to try the 30-day free trial and see for yourself?"

CRITICAL: 10-15 words MAX per message!`;
  }

  /**
   * Urgent situation
   */
  private buildUrgentPrompt(): string {
    return `You are Abby, a sales rep for WebChatSales.

URGENT REQUEST DETECTED

"Got it. Is this an emergency or scheduled?"

IF EMERGENCY:
"What's the best number to reach you?"

Get phone, then system notifies owner.

CRITICAL: 10-15 words MAX!`;
  }

  /**
   * Detect buying intent
   */
  detectBuyingIntent(userMessage: string): boolean {
    const message = userMessage.toLowerCase().trim();
    
    const buyingSignals = [
      'sign up', 'sign me up', 'i want to sign up',
      'how do i start', 'how do i get started', 'let\'s start', 'lets start',
      'how much', 'what\'s the price', 'pricing', 'cost',
      'i\'m ready', 'im ready', 'ready to start',
      'let\'s do it', 'lets do it', 'i\'m in', 'im in',
      'sounds good', 'that works', 'perfect', 'deal', 'sold',
      'i\'ll take it', 'ill take it', 'yes please',
      'how do i try it', 'want to try', 'try it',
    ];

    // Don't trigger on negative context
    const negativeContext = ['not ready', 'not sure', 'don\'t want', 'dont want', 'not interested'];
    if (negativeContext.some(neg => message.includes(neg))) {
      return false;
    }

    return buyingSignals.some(signal => message.includes(signal));
  }

  /**
   * Detect objection type
   */
  detectObjection(userMessage: string): {
    hasObjection: boolean;
    objectionType?: 'price' | 'timing' | 'trust' | 'authority' | 'hidden' | 'roi';
  } {
    const message = userMessage.toLowerCase().trim();

    if (message.includes('expensive') || message.includes('too much') || message.includes('can\'t afford') || message.includes('cheaper')) {
      return { hasObjection: true, objectionType: 'price' };
    }
    if (message.includes('not right now') || message.includes('later') || message.includes('think about it') || message.includes('not ready')) {
      return { hasObjection: true, objectionType: 'timing' };
    }
    if (message.includes('don\'t trust') || message.includes('skeptical') || message.includes('will this work')) {
      return { hasObjection: true, objectionType: 'trust' };
    }
    if (message.includes('talk to my') || message.includes('check with') || message.includes('partner') || message.includes('boss')) {
      return { hasObjection: true, objectionType: 'authority' };
    }
    if (message.includes('worth it') || message.includes('pay for itself') || message.includes('roi')) {
      return { hasObjection: true, objectionType: 'roi' };
    }
    if (message.includes('not sure') || message.includes('i don\'t know') || message.includes('maybe')) {
      return { hasObjection: true, objectionType: 'hidden' };
    }

    return { hasObjection: false };
  }

  /**
   * Detect urgency
   */
  detectUrgency(userMessage: string): boolean {
    const message = userMessage.toLowerCase();
    const urgentKeywords = ['emergency', 'urgent', 'flooding', 'leak', 'broken', 'asap', 'immediately', 'right now'];
    return urgentKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Get next discovery question based on what's collected
   */
  getNextDiscoveryQuestion(collectedData: {
    name?: string;
    businessType?: string;
    leadSource?: string;
    leadsPerWeek?: string;
    dealValue?: string;
    afterHoursPain?: string;
  }): string | null {
    if (!collectedData.name) {
      return "Who am I speaking with?";
    }
    if (!collectedData.businessType) {
      return "What type of business is this?";
    }
    if (!collectedData.leadSource) {
      return "How do leads usually come in for you?";
    }
    if (!collectedData.leadsPerWeek) {
      return "Roughly how many per week?";
    }
    if (!collectedData.dealValue) {
      return "What's a typical deal or job worth?";
    }
    if (!collectedData.afterHoursPain) {
      return "What happens when leads come in after hours?";
    }
    return null; // Discovery complete
  }
}
