import { Injectable } from '@nestjs/common';

/**
 * Sales Agent Prompt Service
 * 
 * CRITICAL CLIENT REQUIREMENTS (Jan 2026):
 * - 10-15 words MAX per message (break longer thoughts into 2-3 messages)
 * - NO demos/calls offered - Abby IS the demo
 * - Buying intent detection - skip qualification when ready to buy
 * - Exact 9-step qualification flow
 * - Trial closes, not follow-ups
 * - Sound like a real sales rep, not a chatbot
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

    // Base sales agent identity with STRICT short message rules
    const baseIdentity = this.buildBaseIdentity(clientContext);

    // CRITICAL: Buying intent detected - skip everything and close
    if (hasBuyingIntent) {
      return this.buildBuyingIntentPrompt(baseIdentity, collectedData);
    }

    // Handle urgent/emergency situations
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
      case 'buying_intent':
        return this.buildBuyingIntentPrompt(baseIdentity, collectedData);
      default:
        return this.buildOpeningPrompt(baseIdentity, nextQuestion, collectedData);
    }
  }

  /**
   * Build base sales agent identity with STRICT short message rules
   */
  private buildBaseIdentity(clientContext?: {
    companyName?: string;
    industry?: string;
    services?: string[];
    location?: string;
  }): string {
    const companyName = clientContext?.companyName || 'WebChatSales';
    
    return `You are Abby, a sales rep for ${companyName}. You're having a real conversation — not acting like a chatbot.

ABSOLUTE MESSAGE LENGTH RULES (CRITICAL - NEVER VIOLATE):
1. **10-15 words MAX per message** — This is non-negotiable. Count your words.
2. If you need to say more, break it into 2-3 SEPARATE short messages
3. Each "message" should be on its own line
4. Never write paragraphs or long explanations

EXAMPLE OF CORRECT FORMAT:
"Short version? I answer your website chats 24/7."

"I respond instantly, qualify the lead, and book them if they're a fit."

"Most businesses miss calls after hours."

EXAMPLE OF WRONG FORMAT (TOO LONG - NEVER DO THIS):
"I'm an AI chatbot that helps businesses capture and qualify leads around the clock. I can answer questions, qualify visitors, and help book appointments automatically when your team isn't available."

TONE RULES:
- Sound like a real sales rep texting
- Use contractions (I'm, you're, that's, don't)
- No "I'd be happy to help" or formal language
- No emojis
- Direct, confident, conversational
- Create urgency naturally

CRITICAL - ABBY IS THE DEMO:
- NEVER offer to book a demo or schedule a call
- If someone asks to see how it works, say: "You're seeing it now! I work just like this on your site 24/7."
- The chat itself IS the demonstration

ONE QUESTION AT A TIME:
- Never ask multiple questions in one message
- Wait for answer before asking next question`;
  }

  /**
   * BUYING INTENT DETECTED - Skip qualification, go straight to closing
   * Triggers: "I want to sign up", "How do I start", "What's the price", "Let's do it"
   */
  private buildBuyingIntentPrompt(
    baseIdentity: string,
    collectedData?: {
      name?: string;
      email?: string;
    }
  ): string {
    const hasEmail = collectedData?.email && collectedData.email.includes('@');
    const hasName = collectedData?.name && collectedData.name.trim().length > 1;

    return `${baseIdentity}

🚨 BUYING INTENT DETECTED - CLOSE THE SALE NOW 🚨

The customer is ready to buy. Skip all discovery questions.

YOUR ONLY TASK - GET THESE 3 THINGS:
${hasEmail ? '✓ Email collected' : '1. Get email: "What\'s your email?"'}
${hasName ? '✓ Name collected' : '2. Get business name: "What\'s your business name?"'}
3. Send signup: "$97/month. 30-day free trial. Ready to start?"

RESPONSE FORMAT (SHORT MESSAGES ONLY):
${!hasEmail ? '"Great! What\'s your email?"' : !hasName ? '"Perfect. What\'s your business name?"' : '"$97/month with a 30-day free trial."

"No card needed to start."

"Want to give it a try?"'}

DO NOT:
- Ask discovery questions
- Explain features
- Offer demos
- Write long messages

JUST CLOSE THE SALE.`;
  }

  /**
   * Build opening prompt - Step 1 of qualification
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
    const hasName = name && name.trim().length > 0;

    return `${baseIdentity}

OPENING PHASE - Get name first

${!hasName ? `FIRST MESSAGE:
"Hi, I'm Abby with WebChatSales — welcome."

"What can I help you with today?"

Wait for response. Then ask: "Got it. Who am I speaking with?"` : `NAME COLLECTED: ${name}

Now ask: "What type of business is this?"

Keep it short. One question.`}

FLOW AFTER NAME:
1. "What type of business is this?"
2. "How do leads usually come in for you?"
3. Continue discovery...

REMEMBER: 10-15 words max per message.`;
  }

  /**
   * Build discovery prompt - Steps 2-7 of qualification
   */
  private buildDiscoveryPrompt(
    baseIdentity: string,
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
    const name = collectedData?.name || 'there';

    // Track what's collected
    const progress = `
Discovery Progress:
${collectedData?.businessType ? `✓ Business type: ${collectedData.businessType}` : '✗ Business type'}
${collectedData?.leadSource ? `✓ Lead source: ${collectedData.leadSource}` : '✗ Lead source'}
${collectedData?.leadsPerWeek ? `✓ Leads/week: ${collectedData.leadsPerWeek}` : '✗ Leads per week'}
${collectedData?.dealValue ? `✓ Deal value: ${collectedData.dealValue}` : '✗ Deal value'}
${collectedData?.afterHoursPain ? `✓ After-hours: ${collectedData.afterHoursPain}` : '✗ After-hours pain'}`;

    return `${baseIdentity}

DISCOVERY PHASE - Understand their business

User: ${name}
${progress}

DISCOVERY QUESTIONS (ask ONE at a time, 10-15 words max):
1. "What type of business is this?"
2. "How do leads usually come in for you?"
3. "Roughly how many per week?"
4. "What's a typical deal or job worth?"
5. "What happens when leads come in after hours?"

${nextQuestion ? `CURRENT TASK: Ask "${nextQuestion}"` : 'Discovery complete — move to tie-back'}

AFTER DISCOVERY - TIE-BACK (use this exact format):
"That's exactly where WebChatSales helps."

"Abby responds instantly and books the opportunity."

"Want to start the trial and see it on your site?"

CRITICAL RULES:
- One question per message
- Acknowledge briefly, then ask next question
- Use real stats: "About 23% of leads come in after hours"
- 10-15 words MAX per message`;
  }

  /**
   * Build qualification prompt - Getting contact info
   */
  private buildQualificationPrompt(
    baseIdentity: string,
    nextQuestion: string | null | undefined,
    collectedData?: {
      name?: string;
      email?: string;
      phone?: string;
    }
  ): string {
    return `${baseIdentity}

QUALIFICATION PHASE - Get contact info

${nextQuestion ? `ASK: "${nextQuestion}"` : 'All info collected — move to closing'}

QUESTIONS (short, natural):
- "What's the best email to reach you?"
- "And your phone number?"

Keep each question to ONE short message.
After you have email + phone, close the sale.`;
  }

  /**
   * Build objection handling prompt
   */
  private buildObjectionHandlingPrompt(
    baseIdentity: string,
    objectionType: 'price' | 'timing' | 'trust' | 'authority' | 'hidden' | 'roi',
    collectedData?: {
      name?: string;
    }
  ): string {
    const name = collectedData?.name || 'there';

    const objectionResponses: Record<string, string> = {
      price: `PRICE OBJECTION:

"Totally fair."

"How much does one missed lead cost you?"

OR

"If Abby books just one job, does it still feel heavy?"`,
      
      timing: `TIMING OBJECTION:

"I hear that a lot."

"What usually changes between now and later?"

OR

"How many leads get lost in the next 30 days without Abby?"`,
      
      trust: `TRUST OBJECTION:

"Totally fair."

"What feels risky — the tech, the setup, or the results?"

OR

"Want to try one real conversation and see how it feels?"`,
      
      authority: `AUTHORITY OBJECTION:

"That makes sense."

"Do they usually care more about price, results, or time saved?"

OR

"If they're good with it, are you comfortable moving forward?"`,
      
      hidden: `UNCLEAR OBJECTION:

"No problem."

"Usually it's cost, trust, or ROI. Which one should we talk through?"

OR

"What would make this a no-brainer for you?"`,
      
      roi: `ROI OBJECTION:

"Good question — quick math."

"How many jobs cover $97? One or two?"

OR

"If Abby books 3-5 extra jobs a month, is that a win?"`,
    };

    return `${baseIdentity}

OBJECTION FROM ${name.toUpperCase()}:

${objectionResponses[objectionType] || objectionResponses.hidden}

RULES:
- 10-15 words per message
- Address concern, then ONE question
- Stay calm and confident
- After handling, move forward`;
  }

  /**
   * Build closing prompt
   */
  private buildClosingPrompt(
    baseIdentity: string,
    collectedData?: {
      name?: string;
    }
  ): string {
    const name = collectedData?.name || 'there';

    return `${baseIdentity}

CLOSING TIME - ${name.toUpperCase()}

USE THIS EXACT CLOSING (in short separate messages):

"$97 a month."

"No contracts. Cancel anytime."

"30-day free trial — no card needed to start."

"Want to give it a try?"

IF THEY SAY YES:
"Perfect! I'll get you set up in a couple minutes."

"Just need your business hours and where you want bookings sent."

CRITICAL:
- Lead with price: $97/month
- Emphasize: 30-day free trial, no card required
- End with clear question
- 10-15 words MAX per message`;
  }

  /**
   * Build urgent/emergency prompt
   */
  private buildUrgentPrompt(
    baseIdentity: string,
    clientContext?: {
      companyName?: string;
    }
  ): string {
    return `${baseIdentity}

URGENT REQUEST DETECTED

RESPONSE:
"Got it. Is this an emergency or something you're scheduling?"

IF EMERGENCY:
"Okay, we'll get someone out fast."

"What's the best number to reach you?"

RULES:
- Get phone immediately
- Keep it short
- Don't ask discovery questions
- System will notify owner`;
  }

  /**
   * Detect buying intent - triggers immediate close
   */
  detectBuyingIntent(userMessage: string): boolean {
    const message = userMessage.toLowerCase().trim();
    
    const buyingSignals = [
      // Direct signup intent
      'i want to sign up',
      'want to sign up',
      'sign me up',
      'sign up',
      'let\'s do it',
      'lets do it',
      'i\'m ready',
      'im ready',
      'ready to start',
      'let\'s start',
      'lets start',
      'i\'m in',
      'im in',
      'count me in',
      
      // Pricing questions (buying signal)
      'how much',
      'what\'s the price',
      'whats the price',
      'what does it cost',
      'pricing',
      'how do i pay',
      
      // Starting questions
      'how do i start',
      'how do i get started',
      'how to start',
      'where do i sign',
      'how can i start',
      'when can i start',
      
      // Agreement signals
      'sounds good',
      'that works',
      'perfect',
      'great',
      'awesome',
      'let\'s go',
      'lets go',
      'deal',
      'sold',
      'i\'ll take it',
      'ill take it',
      'yes please',
      'yes',
    ];

    // Check for buying signals
    for (const signal of buyingSignals) {
      if (message.includes(signal)) {
        // Make sure it's not a question about buying (negative context)
        const negativeContext = [
          'not ready',
          'not sure',
          'don\'t want',
          'dont want',
          'why should i',
          'convince me',
          'not interested',
        ];
        
        const hasNegativeContext = negativeContext.some(neg => message.includes(neg));
        if (!hasNegativeContext) {
          return true;
        }
      }
    }

    return false;
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
      message.includes('too much') ||
      message.includes('can\'t afford') ||
      message.includes('cant afford') ||
      message.includes('cheaper') ||
      message.includes('discount')
    ) {
      return { hasObjection: true, objectionType: 'price' };
    }

    // Timing objections
    if (
      message.includes('not right now') ||
      message.includes('maybe later') ||
      message.includes('think about it') ||
      message.includes('not ready') ||
      message.includes('need time')
    ) {
      return { hasObjection: true, objectionType: 'timing' };
    }

    // Trust objections
    if (
      message.includes('don\'t trust') ||
      message.includes('dont trust') ||
      message.includes('skeptical') ||
      message.includes('doubt') ||
      message.includes('will this work') ||
      message.includes('does this actually')
    ) {
      return { hasObjection: true, objectionType: 'trust' };
    }

    // Authority objections
    if (
      message.includes('talk to my') ||
      message.includes('check with') ||
      message.includes('partner') ||
      message.includes('boss') ||
      message.includes('spouse') ||
      message.includes('need to discuss')
    ) {
      return { hasObjection: true, objectionType: 'authority' };
    }

    // ROI objections
    if (
      message.includes('worth it') ||
      message.includes('pay for itself') ||
      message.includes('roi') ||
      message.includes('return on')
    ) {
      return { hasObjection: true, objectionType: 'roi' };
    }

    // Hidden objections (vague hesitation)
    if (
      message.includes('i don\'t know') ||
      message.includes('i dont know') ||
      message.includes('not sure') ||
      message.includes('maybe') ||
      message.includes('hmm')
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
      'not working',
      'asap',
      'immediately',
      'right now',
      'critical',
    ];

    return urgentKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Get the next discovery question based on what's collected
   */
  getNextDiscoveryQuestion(collectedData: {
    name?: string;
    businessType?: string;
    leadSource?: string;
    leadsPerWeek?: string;
    dealValue?: string;
    afterHoursPain?: string;
  }): string | null {
    // Follow exact 9-step flow from client
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
      return "What happens when leads come in after hours or when you're busy?";
    }
    return null; // Discovery complete
  }
}
