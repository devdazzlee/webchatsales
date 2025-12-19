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
      // Send confirmation email to the user
      await this.emailService.sendBetaInviteConfirmation(body.email, body.name);
      
      // Send notification email to admin/business owner
      await this.emailService.sendBetaSignupNotification(body.email, body.name, body.company, body.outcomes);
      
      return {
        success: true,
        message: 'Beta invite email sent successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
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

      // Send notification email to admin
      await this.emailService.sendBusinessInquiryNotification(body);
      
      // Send confirmation email to the user
      await this.emailService.sendBusinessInquiryConfirmation(body.email, body.name);
      
      return {
        success: true,
        message: 'Business inquiry submitted successfully',
      };
    } catch (error: any) {
      console.error('Error handling business inquiry:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit inquiry. Please try again.',
      };
    }
  }
}

