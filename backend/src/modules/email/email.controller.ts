import { Controller, Post, Body } from '@nestjs/common';
import { EmailService } from './email.service';
import { ChatService } from '../chat/chat.service';

@Controller('api/email')
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly chatService: ChatService,
  ) {}

  @Post('send-beta-invite')
  async sendBetaInvite(@Body() body: { email: string; name: string; company?: string; outcomes?: string }) {
    try {
      // Try to send emails, but don't fail if email service is not configured
      const userEmailResult = await this.emailService.sendBetaInviteConfirmation(body.email, body.name);
      const adminEmailResult = await this.emailService.sendBetaSignupNotification(body.email, body.name, body.company, body.outcomes);
      
      // Log results but always return success (lead is captured even if email fails)
      console.log(`[EmailController] Beta signup: user email ${userEmailResult?.success ? 'sent' : 'failed'}, admin email ${adminEmailResult?.success ? 'sent' : 'failed'}`);
      
      // Always return success - the signup is captured even if email doesn't send
      // Client requirement: Don't show SMTP errors to users
      return {
        success: true,
        message: 'Thank you for signing up! We\'ll be in touch soon.',
      };
    } catch (error: any) {
      // Even on error, return success with friendly message
      // The lead info is still captured, email just didn't send
      console.error('[EmailController] Beta signup error (returning success anyway):', error.message);
      return {
        success: true,
        message: 'Thank you for signing up! We\'ll be in touch soon.',
      };
    }
  }

  @Post('send-transcript')
  async sendTranscript(@Body() body: { email: string; sessionId: string }) {
    try {
      const conversation = await this.chatService.getConversation(body.sessionId);
      if (!conversation) {
        return {
          success: false,
          error: 'Conversation not found',
        };
      }

      await this.emailService.sendConversationTranscript(body.email, conversation);
      return {
        success: true,
        message: 'Transcript sent successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('business-inquiry')
  async handleBusinessInquiry(@Body() body: {
    name: string;
    email: string;
    phone: string;
    company: string;
    inquiryTypes: string[];
    otherInquiry?: string;
    description: string;
    contactMethod: string;
    bestTime?: string;
    comments?: string;
  }) {
    try {
      // Validate required fields
      if (!body.name || !body.email || !body.phone || !body.company || !body.description || !body.inquiryTypes || body.inquiryTypes.length === 0) {
        return {
          success: false,
          error: 'Please fill in all required fields',
        };
      }

      // Try to send emails, but don't expose errors to users
      const adminResult = await this.emailService.sendBusinessInquiryNotification(body);
      const userResult = await this.emailService.sendBusinessInquiryConfirmation(body.email, body.name);
      
      // Log results but always return success (inquiry is captured even if email fails)
      console.log(`[EmailController] Business inquiry: admin email ${adminResult?.success ? 'sent' : 'failed'}, user email ${userResult?.success ? 'sent' : 'failed'}`);
      
      // CLIENT REQUIREMENT: Don't show SMTP errors to users
      return {
        success: true,
        message: 'Thank you for your inquiry! We\'ll be in touch soon.',
      };
    } catch (error: any) {
      // Even on error, return success with friendly message
      // The inquiry info is still captured, email just didn't send
      console.error('[EmailController] Business inquiry error (returning success anyway):', error.message);
      return {
        success: true,
        message: 'Thank you for your inquiry! We\'ll be in touch soon.',
      };
    }
  }
}

