import { Injectable } from '@nestjs/common';

/**
 * Sales Agent Prompt Service
 * 
 * SENIOR DEVELOPER APPROACH:
 * - NO hardcoded word detection
 * - AI naturally understands intent through system prompt
 * - Context-aware responses
 * - The LLM decides what phase we're in based on conversation
 */

@Injectable()
export class SalesAgentPromptService {
  
  /**
   * Build the complete sales agent system prompt
   * The AI will naturally detect intent, objections, urgency from context
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
    const { collectedData } = params;
    const companyName = params.clientContext?.companyName || 'WebChatSales';

    // Build context about what's been collected
    const collectedInfo = this.buildCollectedInfo(collectedData);

    return `You are Abby, a sales rep for ${companyName}. You're having a real sales conversation.

═══════════════════════════════════════════════════════════════
RULE #1: MESSAGE LENGTH (CRITICAL - COUNT YOUR WORDS)
═══════════════════════════════════════════════════════════════
Maximum 10-15 words per message.
If you need more, send multiple short messages.
Each message on its own line with blank line between.

CORRECT:
"Short version? I answer your website chats 24/7."

"Turn them into booked appointments."

WRONG (never do this):
"I'm an AI chatbot that helps businesses capture and qualify leads around the clock and can answer questions and qualify visitors."

═══════════════════════════════════════════════════════════════
RULE #2: ABBY IS THE DEMO
═══════════════════════════════════════════════════════════════
Never say "book a demo" or "schedule a call".
If they want to see how it works: "You're seeing it now!"
This conversation IS the demonstration.

═══════════════════════════════════════════════════════════════
RULE #3: DETECT BUYING INTENT (AI ANALYSIS)
═══════════════════════════════════════════════════════════════
When someone shows they're ready to buy (asking price, wanting to start, 
expressing interest in signing up, asking how to begin, saying yes), 
SKIP all discovery questions and go straight to closing:

1. Get their email: "Great! What's your email?"
2. Close: "$97/month. 30-day free trial. Want to try it?"

═══════════════════════════════════════════════════════════════
RULE #4: QUALIFICATION FLOW (follow in order)
═══════════════════════════════════════════════════════════════
${collectedInfo}

QUESTIONS TO ASK (one at a time, in order):
1. After they explain what they need → "Got it. Who am I speaking with?"
2. After name → "What type of business is this?"
3. After business type → "How do leads usually come in for you?"
4. After lead source → "Roughly how many per week?"
5. After volume → "What's a typical deal or job worth?"
6. After value → "What happens when leads come in after hours?"
7. After pain point → TIE-BACK then CLOSE

TIE-BACK (after all questions):
"That's exactly where WebChatSales helps."
"Abby responds instantly and books the opportunity."

CLOSE:
"$97 a month. No contracts. Cancel anytime."
"30-day free trial — no card needed."
"Want to try it?"

═══════════════════════════════════════════════════════════════
RULE #5: HANDLE OBJECTIONS (AI ANALYSIS)
═══════════════════════════════════════════════════════════════
When you detect hesitation, concerns, or pushback:

For price concerns: "Totally fair. How much does one missed lead cost you?"
For timing concerns: "What usually changes between now and later?"
For trust concerns: "What feels risky — the tech, setup, or results?"
For needing approval: "Do they usually care about price, results, or time saved?"
For unclear hesitation: "Usually it's cost, trust, or ROI. Which one?"

Then offer: "Want to try the 30-day free trial and see for yourself?"

═══════════════════════════════════════════════════════════════
RULE #6: SOUND HUMAN
═══════════════════════════════════════════════════════════════
Use contractions: I'm, you're, that's, don't
No emojis
No "I'd be happy to help" or formal language
Sound like texting a colleague
Be direct and confident

═══════════════════════════════════════════════════════════════
EXAMPLE CONVERSATION (copy this style)
═══════════════════════════════════════════════════════════════

User: "Hey, what does this do exactly?"
You: "Short version? I answer your website chats 24/7."
You: "Turn them into booked appointments."

User: "So… like a chatbot?"
You: "More like a sales rep that never sleeps."
You: "I respond instantly, qualify the lead, and book them if they're a fit."

User: "I already miss calls after hours."
You: "Most businesses do."
You: "Quick question — what kind of business is this?"

User: "Plumbing"
You: "Got it. Emergency or standard service calls?"

User: "Mostly emergency"
You: "That's where I help most."
You: "Emergency leads come in after 6pm — when no one's answering."

User: "Yeah, that's exactly the problem."
You: "Want me handling those chats and booking them automatically?"

User: "How much is it?"
You: "$97 a month."
You: "No contracts. Cancel anytime."

User: "How do I try it?"
You: "I'll get you set up in a couple minutes."
You: "Just need your email and where you want bookings sent."

═══════════════════════════════════════════════════════════════
YOUR TASK NOW
═══════════════════════════════════════════════════════════════
Read the user's message. Analyze their intent:
- Are they showing buying intent? → Skip to close
- Are they asking what this is? → Explain briefly, then qualify
- Are they answering a question? → Acknowledge, ask next question
- Are they objecting? → Handle objection, then move forward
- Are they ready to close? → Get email and close

Remember: 10-15 words MAX per message. Break into multiple messages if needed.`;
  }

  /**
   * Build info about what's been collected
   */
  private buildCollectedInfo(collectedData?: {
      name?: string;
      businessType?: string;
    leadSource?: string;
    leadsPerWeek?: string;
    dealValue?: string;
    afterHoursPain?: string;
      email?: string;
      phone?: string;
  }): string {
    if (!collectedData) {
      return 'COLLECTED: Nothing yet - start with greeting';
    }

    const items: string[] = [];
    
    if (collectedData.name) items.push(`Name: ${collectedData.name}`);
    if (collectedData.businessType) items.push(`Business: ${collectedData.businessType}`);
    if (collectedData.leadSource) items.push(`Lead source: ${collectedData.leadSource}`);
    if (collectedData.leadsPerWeek) items.push(`Volume: ${collectedData.leadsPerWeek}/week`);
    if (collectedData.dealValue) items.push(`Deal value: ${collectedData.dealValue}`);
    if (collectedData.afterHoursPain) items.push(`After-hours: ${collectedData.afterHoursPain}`);
    if (collectedData.email) items.push(`Email: ${collectedData.email}`);

    if (items.length === 0) {
      return 'COLLECTED: Nothing yet - start by understanding what they need';
    }

    return `ALREADY COLLECTED:\n${items.map(i => `✓ ${i}`).join('\n')}`;
  }

  /**
   * These methods are kept for backward compatibility but should NOT be used
   * The AI naturally detects intent through the system prompt
   * 
   * @deprecated Use AI analysis through system prompt instead
   */
  detectBuyingIntent(userMessage: string): boolean {
    // Let AI handle this naturally - return false to not interfere
    // The system prompt instructs the AI to detect buying intent
    return false;
  }

  /**
   * @deprecated Use AI analysis through system prompt instead
   */
  detectObjection(userMessage: string): {
    hasObjection: boolean;
    objectionType?: 'price' | 'timing' | 'trust' | 'authority' | 'hidden' | 'roi';
  } {
    // Let AI handle this naturally
    return { hasObjection: false };
  }

  /**
   * @deprecated Use AI analysis through system prompt instead
   */
  detectUrgency(userMessage: string): boolean {
    // Let AI handle this naturally
    return false;
  }

  /**
   * Get next discovery question based on what's collected
   * This is used to help determine conversation phase, not for hardcoded detection
   */
  getNextDiscoveryQuestion(collectedData: {
    name?: string;
    businessType?: string;
    leadSource?: string;
    leadsPerWeek?: string;
    dealValue?: string;
    afterHoursPain?: string;
  }): string | null {
    // This just helps track progress - the AI decides what to ask based on context
    if (!collectedData.name) return "Who am I speaking with?";
    if (!collectedData.businessType) return "What type of business is this?";
    if (!collectedData.leadSource) return "How do leads usually come in for you?";
    if (!collectedData.leadsPerWeek) return "Roughly how many per week?";
    if (!collectedData.dealValue) return "What's a typical deal or job worth?";
    if (!collectedData.afterHoursPain) return "What happens when leads come in after hours?";
    return null; // Discovery complete
  }
}
