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
}

