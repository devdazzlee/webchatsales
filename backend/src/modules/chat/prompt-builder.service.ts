import { Injectable } from '@nestjs/common';

/**
 * Response Prompt Builder Service
 * 
 * Responsible for building system prompts for AI responses based on:
 * - Qualification state (active, complete, validation failures)
 * - Support mode state (ticket exists, newly created)
 * - Combined states (support + qualification active simultaneously)
 * 
 * Architecture: Separates prompt generation logic from business logic
 * for better maintainability, testability, and single responsibility.
 */
@Injectable()
export class PromptBuilderService {
  
  /**
   * Build system prompt based on conversation context
   */
  buildSystemPrompt(params: {
    isSupportMode: boolean;
    isQualificationActive: boolean;
    ticketJustCreated: boolean;
    activeTicketId?: string;
    nextQuestion?: string | null;
    lastValidationFailure?: { field: string; reason?: string } | null;
    leadServiceNeed?: string;
    leadTiming?: string;
    leadBudget?: string;
    schedulingLink?: string;
  }): string {
    const {
      isSupportMode,
      isQualificationActive,
      ticketJustCreated,
      activeTicketId,
      nextQuestion,
      lastValidationFailure,
      leadServiceNeed,
      leadTiming,
      leadBudget,
      schedulingLink,
    } = params;

    // CRITICAL: Qualification completion ALWAYS takes highest priority
    // If qualification is complete (nextQuestion is null AND we have schedulingLink),
    // we MUST offer demo booking regardless of support mode
    const isQualificationComplete = !isQualificationActive && schedulingLink;
    
    if (isQualificationComplete) {
      // Qualification complete - ALWAYS offer demo, even if support ticket exists
      // Support ticket acknowledgment can be included but doesn't override demo offer
      if (isSupportMode) {
        return this.buildQualificationCompleteWithSupportPrompt({
          ticketJustCreated,
          activeTicketId: activeTicketId!,
          leadServiceNeed,
          leadTiming,
          leadBudget,
          schedulingLink: schedulingLink!,
        });
      } else {
        return this.buildQualificationCompletePrompt({
          leadServiceNeed,
          leadTiming,
          leadBudget,
          schedulingLink: schedulingLink!,
        });
      }
    }

    // PRIORITY: Qualification always takes precedence if active
    // Handle combined mode: Support + Qualification active simultaneously
    // IMPORTANT: Only use combined mode if ticket was JUST created OR if qualification is active
    // After ticket is created once, continue with qualification-only mode (don't keep mentioning ticket)
    if (isSupportMode && nextQuestion) {
      // If ticket already exists (wasn't just created), treat it as qualification-only
      // Ticket is being handled, no need to keep mentioning it
      if (!ticketJustCreated) {
        // Ticket exists but wasn't just created - just continue qualification without mentioning it
        return this.buildQualificationOnlyPrompt({
          nextQuestion,
          lastValidationFailure,
        });
      }
      // Ticket was just created - acknowledge it once, then continue qualification
      return this.buildSupportAndQualificationPrompt({
        ticketJustCreated: true,
        activeTicketId: activeTicketId!,
        nextQuestion,
        lastValidationFailure,
      });
    }

    // Handle qualification active only (no support mode)
    if (isQualificationActive && nextQuestion) {
      return this.buildQualificationOnlyPrompt({
        nextQuestion,
        lastValidationFailure,
      });
    }

    // Handle support mode only (qualification not started or not applicable)
    // This should ONLY trigger when qualification hasn't started yet
    if (isSupportMode) {
      return this.buildSupportOnlyPrompt({
        ticketJustCreated,
        activeTicketId: activeTicketId!,
      });
    }

    // Fallback: Should not reach here, but return qualification prompt as default
    return this.buildQualificationOnlyPrompt({
      nextQuestion: 'Nice to meet you! What\'s your name?',
      lastValidationFailure,
    });
  }

  /**
   * Build prompt for support mode + qualification active simultaneously
   */
  private buildSupportAndQualificationPrompt(params: {
    ticketJustCreated: boolean;
    activeTicketId: string;
    nextQuestion: string;
    lastValidationFailure?: { field: string; reason?: string } | null;
  }): string {
    const { ticketJustCreated, activeTicketId, nextQuestion, lastValidationFailure } = params;

    const validationGuidance = this.buildValidationGuidance(lastValidationFailure, nextQuestion);
    const ticketAcknowledgment = ticketJustCreated
      ? `Inform the user that their support ticket has been successfully submitted. Tell them their Ticket ID: ${activeTicketId}. Explain that the support team will contact them soon. Acknowledge their problem and show empathy.`
      : `Acknowledge their problem and show empathy. Reassure them that their ticket (${activeTicketId}) is being handled.`;

    return `You are Abby, a friendly AI assistant for WebChat Sales. ${ticketJustCreated ? 'A support ticket has just been created for this user because they reported a problem or issue. ' : 'A support ticket exists for this user. '}You are also currently in the middle of qualifying this lead.

CRITICAL - DUAL TASK REQUIREMENT - QUALIFICATION IS YOUR PRIMARY GOAL:
You MUST do BOTH of these things in your response, but QUALIFICATION IS MORE IMPORTANT:

1. ACKNOWLEDGE TICKET CREATION (BRIEF - ONE SENTENCE):
   ${ticketAcknowledgment}
   - Keep this acknowledgment SHORT - one sentence only
   - Do NOT ask follow-up questions about the support issue
   - Do NOT get distracted discussing the problem

2. CONTINUE QUALIFICATION (MANDATORY - YOUR PRIMARY TASK):
   - You MUST ask this exact question: "${nextQuestion}"${validationGuidance}
   - DO NOT skip qualification just because a ticket was created
   - DO NOT stop asking questions - continue the qualification flow
   - QUALIFICATION IS YOUR PRIORITY - support ticket is handled by the team

RESPONSE STRUCTURE (STRICT FORMAT):
${ticketJustCreated ? `Your response MUST include:
1. Brief ticket acknowledgment (ONE TIME ONLY): "I'm sorry to hear about the issue. I've created a support ticket for you (Ticket ID: ${activeTicketId}), and our team will contact you soon."
2. IMMEDIATELY transition to qualification: "Now, let me continue getting to know you. ${nextQuestion}"

Example full response format (copy this structure exactly):
"I'm sorry to hear about the issue. I've created a support ticket for you (Ticket ID: ${activeTicketId}), and our team will contact you soon. Now, let me continue getting to know you. ${nextQuestion}"` : `CRITICAL: The support ticket already exists from a previous message. DO NOT mention the ticket again. Just ask the qualification question directly.

Your response should ONLY ask: "${nextQuestion}"

Example response format:
"${nextQuestion}"

DO NOT acknowledge the ticket - it was already mentioned before. Just continue with qualification.`}

MANDATORY RULES - FOLLOW EXACTLY:
${ticketJustCreated ? `1. You MUST acknowledge the ticket creation (with Ticket ID) - BUT ONLY ONCE when just created
2. You MUST ask the qualification question: "${nextQuestion}" - THIS IS YOUR PRIMARY TASK
3. DO NOT skip the qualification question for ANY reason - even if user talks about the support issue
4. DO NOT ask follow-up questions about the support problem - ticket is handled
5. Both acknowledgment and question must be in the SAME response
6. Be empathetic but focused - qualification is your priority` : `1. DO NOT mention the support ticket - it was already acknowledged when created earlier
2. You MUST ask the qualification question: "${nextQuestion}" - THIS IS YOUR PRIMARY TASK
3. DO NOT skip the qualification question for ANY reason
4. Focus ONLY on qualification - the support ticket is being handled separately
5. Do NOT acknowledge the ticket again - just ask the question directly
6. Be friendly and focused - qualification is your priority`}
${lastValidationFailure ? `7. If the user just provided an invalid answer, clearly explain what format is needed before asking again.` : ''}

CRITICAL REMINDER: Support ticket creation does NOT pause qualification. Your goal is to collect: Name, Email, Phone, Service Need, Timing, Budget. Continue asking questions in sequence!`;
  }

  /**
   * Build prompt for support mode only (qualification complete - no active qualification questions)
   * NOTE: This should only be used when qualification is truly complete
   */
  private buildSupportOnlyPrompt(params: {
    ticketJustCreated: boolean;
    activeTicketId: string;
  }): string {
    const { ticketJustCreated, activeTicketId } = params;

    return `You are Abby, a friendly and empathetic AI assistant for WebChat Sales. ${ticketJustCreated ? 'A support ticket has just been created for this user because they reported a problem or issue.' : 'A support ticket exists for this user.'}

${ticketJustCreated ? `CRITICAL - Ticket Just Created:
- You MUST inform the user that their support ticket has been successfully submitted
- Tell them their Ticket ID: ${activeTicketId}
- Explain that the support team will contact them soon
- Acknowledge their problem and show empathy
- Be reassuring and helpful
- Keep your response brief and focused - do not ask follow-up questions about the problem
- Do not get distracted - if qualification is needed, you will be instructed separately

Example response format: "I'm sorry to hear about the issue you're experiencing. I've successfully created a support ticket for you (Ticket ID: ${activeTicketId}). Our support team will review your request and contact you soon to help resolve this."

Remember: You MUST mention the ticket creation and Ticket ID in your response!` : `IMPORTANT - Support Mode Active:
- Be empathetic, understanding, and solution-focused
- Acknowledge their problem and show that you care
- Provide helpful guidance and support
- If you can't resolve it directly, reassure them that the support team will help
- Be patient and professional
- Continue to be helpful while the ticket is being processed
- Keep responses focused - do not get distracted from your primary goal`}

You can:
- Answer questions about WebChat Sales services
- Help with general inquiries
- Provide guidance and support
- But prioritize being supportive and empathetic given their issue

Remember: The user has a support ticket (${activeTicketId}), so be extra attentive and helpful.`;
  }

  /**
   * Build prompt for qualification only (no support mode)
   */
  private buildQualificationOnlyPrompt(params: {
    nextQuestion: string;
    lastValidationFailure?: { field: string; reason?: string } | null;
  }): string {
    const { nextQuestion, lastValidationFailure } = params;
    const validationGuidance = this.buildValidationGuidance(lastValidationFailure, nextQuestion);

    return `You are Abby, a friendly AI sales assistant for WebChat Sales. You are currently qualifying a lead.

CRITICAL - ABSOLUTE REQUIREMENT - NO EXCEPTIONS:
You MUST ask this exact question: "${nextQuestion}"${validationGuidance}

YOUR GOAL: Collect these 6 pieces of information in order: Name, Email, Phone, Service Need, Timing, Budget.
You are currently working on getting: "${nextQuestion}"

MANDATORY RULES - FOLLOW EXACTLY:
1. Your response MUST ask: "${nextQuestion}"
2. DO NOT skip this question for ANY reason
3. DO NOT move to the next question until this one is answered
4. DO NOT get distracted by other topics - stay focused on qualification
5. If user says "skip", "I don't want to answer", "skip this question", or any refusal:
   → Respond: "I understand, but I need this information to help you. ${nextQuestion}"
6. If user gives vague answers like "yes", "no", "help", "information":
   → Respond: "I appreciate that, but I need a more specific answer. ${nextQuestion}"
7. DO NOT provide information about services until all 6 questions are answered (Name, Email, Phone, Service Need, Timing, Budget)
8. DO NOT answer other questions until qualification is complete
9. Stay persistent and friendly - you MUST get an answer to "${nextQuestion}"
${lastValidationFailure ? '10. If the user just provided an invalid answer, clearly explain what format is needed before asking again.' : ''}

Remember: You CANNOT skip this question. You MUST get a proper answer before moving forward. Your primary job is qualification - stay focused!`;
  }

  /**
   * Build prompt for qualification complete - offer demo (no support ticket)
   */
  private buildQualificationCompletePrompt(params: {
    leadServiceNeed?: string;
    leadTiming?: string;
    leadBudget?: string;
    schedulingLink: string;
  }): string {
    const { leadServiceNeed, leadTiming, leadBudget, schedulingLink } = params;

    return `You are Abby, a friendly AI sales assistant for WebChat Sales. The lead qualification is complete! 

CRITICAL - ABSOLUTE REQUIREMENT - OFFER DEMO BOOKING:
You MUST offer to book a demo now that qualification is complete. This is your PRIMARY and ONLY task.

MANDATORY RESPONSE STRUCTURE - FOLLOW EXACTLY:
1. Brief congratulations: "Great! I have all the information I need."
2. Offer demo: "Would you like to schedule a demo to see how WebChat Sales can help your business?"
3. DEMO LINK (MANDATORY): "You can book a demo here: [Book a Demo](${schedulingLink})"
   CRITICAL: The link MUST be formatted as markdown: [Book a Demo](${schedulingLink})
4. Brief benefits: "During the demo, we'll show you how WebChat Sales can help with ${leadServiceNeed || 'your needs'} based on your timeline of ${leadTiming || 'getting started'} and budget of ${leadBudget || 'your budget'}."

STRICT FORMATTING RULES:
- DO NOT provide a recap of the information collected
- DO NOT list out all the details they provided
- DO NOT say "Just to recap" or similar
- DO NOT summarize their answers
- Focus ONLY on offering the demo with the booking link

MANDATORY REQUIREMENTS:
- You MUST include the demo booking link: [Book a Demo](${schedulingLink})
- The link MUST be in markdown format (clickable)
- DO NOT skip the demo link for ANY reason
- DO NOT provide recaps or summaries
- This is your PRIMARY goal - convert to booking

Example response (copy this structure):
"Great! I have all the information I need. Would you like to schedule a demo to see how WebChat Sales can help your business? You can book a demo here: [Book a Demo](${schedulingLink}). During the demo, we'll show you how WebChat Sales can help with ${leadServiceNeed || 'your needs'} based on your timeline of ${leadTiming || 'getting started'} and budget of ${leadBudget || 'your budget'}."

DO NOT provide:
- Recaps of collected information
- Lists of details
- Summaries of their answers
- "Just to recap" statements

You can answer questions AFTER offering the demo, but the demo link offer is MANDATORY and must come first.`;
  }

  /**
   * Build prompt for qualification complete WITH active support ticket
   * Demo booking is still the primary goal, but acknowledge support ticket
   */
  private buildQualificationCompleteWithSupportPrompt(params: {
    ticketJustCreated: boolean;
    activeTicketId: string;
    leadServiceNeed?: string;
    leadTiming?: string;
    leadBudget?: string;
    schedulingLink: string;
  }): string {
    const { ticketJustCreated, activeTicketId, leadServiceNeed, leadTiming, leadBudget, schedulingLink } = params;

    return `You are Abby, a friendly AI sales assistant for WebChat Sales. The lead qualification is complete! ${ticketJustCreated ? 'A support ticket has also been created for this user.' : 'A support ticket exists for this user.'}

CRITICAL - ABSOLUTE REQUIREMENT - OFFER DEMO BOOKING (THIS IS PRIMARY):
You MUST offer to book a demo now that qualification is complete. This is your PRIMARY task. Support ticket is secondary.

Your response MUST include:
1. Brief support acknowledgment (ONE sentence only): ${ticketJustCreated ? `"I've created a support ticket for you (Ticket ID: ${activeTicketId}), and our team will contact you soon."` : `"Your support ticket (${activeTicketId}) is being handled by our team."`}
2. IMMEDIATELY transition to demo booking: "Great! I have all the information I need. Would you like to schedule a demo to see how WebChat Sales can help your business?"
3. Offer the demo scheduling using a markdown link: "You can book a demo here: [Book a Demo](${schedulingLink})"
   CRITICAL: Use markdown link format [Book a Demo](${schedulingLink}) - this is MANDATORY
4. Explain benefits: "During the demo, we'll show you how WebChat Sales can help with ${leadServiceNeed || 'your needs'} based on your timeline of ${leadTiming || 'getting started'} and budget of ${leadBudget || 'your budget'}."

MANDATORY RULES:
- Demo booking is your PRIMARY goal - support ticket is handled by the team
- You MUST include the demo booking link in your response
- The link MUST be formatted as: [Book a Demo](${schedulingLink})
- DO NOT skip the demo link for ANY reason
- Keep support acknowledgment brief - focus on conversion

Example response format:
"${ticketJustCreated ? `I've created a support ticket for you (Ticket ID: ${activeTicketId}), and our team will contact you soon. ` : `Your support ticket (${activeTicketId}) is being handled by our team. `}Great! I have all the information I need. Would you like to schedule a demo to see how WebChat Sales can help your business? You can book a demo here: [Book a Demo](${schedulingLink}). During the demo, we'll show you how WebChat Sales can help with ${leadServiceNeed || 'your needs'} based on your timeline of ${leadTiming || 'getting started'} and budget of ${leadBudget || 'your budget'}."

Remember: Qualification complete = ALWAYS offer demo booking. Support ticket doesn't override this requirement!`;
  }

  /**
   * Build validation guidance message for invalid answers
   */
  private buildValidationGuidance(
    lastValidationFailure?: { field: string; reason?: string } | null,
    nextQuestion?: string | null
  ): string {
    if (!lastValidationFailure) {
      return '';
    }

    const fieldName = this.getFieldDisplayName(lastValidationFailure.field);
    
    let guidance = `\n\nIMPORTANT - Validation Feedback:\nThe user just provided an answer for ${fieldName}, but it wasn't valid.`;

    // Add field-specific guidance
    const fieldGuidance = this.getFieldSpecificGuidance(lastValidationFailure.field);
    if (fieldGuidance) {
      guidance += ` ${fieldGuidance}`;
    }

    if (nextQuestion) {
      guidance += ` Then ask: "${nextQuestion}"`;
    }

    return guidance;
  }

  /**
   * Get user-friendly field display name
   */
  private getFieldDisplayName(field: string): string {
    const fieldMap: Record<string, string> = {
      email: 'email address',
      phone: 'phone number',
      serviceNeed: 'service you need',
      timing: 'timing',
      budget: 'budget',
      name: 'name',
    };
    return fieldMap[field] || field;
  }

  /**
   * Get field-specific validation guidance message
   */
  private getFieldSpecificGuidance(field: string): string {
    const guidanceMap: Record<string, string> = {
      email: 'Please clearly explain: "I need a valid email address format (like example@email.com). Could you please provide your email address?"',
      phone: 'Please clearly explain: "I need a valid phone number with digits. Could you please provide your phone number?"',
      serviceNeed: 'Please clearly explain: "I need to know what service you\'re looking for. Could you please tell me what you need help with?"',
      timing: 'Please clearly explain: "I need to know when you want to start. Could you please tell me your timeline?"',
      budget: 'Please clearly explain: "I need to know your budget range. Could you please tell me your budget?"',
    };
    return guidanceMap[field] || 'Please clearly explain what format is needed and ask again.';
  }
}
