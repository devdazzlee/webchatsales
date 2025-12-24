import { Controller, Post, Get, Body, Param, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('start')
  async startConversation(@Body() body: { sessionId?: string; userEmail?: string; userName?: string }) {
    const sessionId = body.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const conversation = await this.chatService.createConversation(
      sessionId,
      body.userEmail,
      body.userName
    );
    return {
      success: true,
      sessionId: conversation.sessionId,
      conversation,
    };
  }

  @Post('message')
  async sendMessage(
    @Body() body: { sessionId: string; message: string },
    @Res() res: Response,
  ) {
    const { sessionId, message } = body;

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and message are required',
      });
    }

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering

    console.log(`[ChatController] Starting stream for sessionId: ${sessionId}, message: "${message.substring(0, 50)}..."`);

    let chunkCount = 0;
    let hasError = false;

    try {
      for await (const chunk of this.chatService.streamChatResponse(sessionId, message)) {
        chunkCount++;
        if (res.writable) {
          res.write(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
        } else {
          console.error(`[ChatController] Response stream closed prematurely, chunks sent: ${chunkCount}`);
          break;
        }
      }
      
      if (chunkCount > 0 && res.writable) {
        res.write(`data: ${JSON.stringify({ chunk: '', done: true })}\n\n`);
        console.log(`[ChatController] ✅ Stream completed: ${chunkCount} chunks sent for sessionId: ${sessionId}`);
      } else if (chunkCount === 0) {
        hasError = true;
        console.error(`[ChatController] ❌ ERROR: No chunks received from AI for sessionId: ${sessionId}`);
        if (res.writable) {
          res.write(`data: ${JSON.stringify({ error: 'No response from AI. Please try again.', done: true })}\n\n`);
        }
      }
      
      if (res.writable) {
        res.end();
      }
    } catch (error: any) {
      hasError = true;
      console.error(`[ChatController] ❌ ERROR streaming response for sessionId ${sessionId}:`, error);
      console.error(`[ChatController] Error details:`, {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        stack: error?.stack?.substring(0, 200)
      });
      
      const errorMessage = error?.message || 'An error occurred. Please try again.';
      if (res.writable && !res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: errorMessage, done: true })}\n\n`);
        res.end();
      }
    }
  }

  @Post('save-message')
  async saveMessageOnly(@Body() body: { sessionId: string; message: string; role?: 'user' | 'assistant' }) {
    const { sessionId, message, role = 'user' } = body;

    if (!sessionId || !message) {
      return {
        success: false,
        error: 'Session ID and message are required',
      };
    }

    try {
      await this.chatService.addMessage(sessionId, role, message);
      return {
        success: true,
        message: 'Message saved successfully',
      };
    } catch (error: any) {
      console.error(`[ChatController] Error saving message:`, error);
      return {
        success: false,
        error: error?.message || 'Failed to save message',
      };
    }
  }

  @Get('conversation/:sessionId')
  async getConversation(@Param('sessionId') sessionId: string) {
    const conversation = await this.chatService.getConversation(sessionId);
    return {
      success: true,
      conversation,
    };
  }

  @Get('conversations')
  async getAllConversations(@Query('limit') limit?: string) {
    const conversations = await this.chatService.getAllConversations(
      limit ? parseInt(limit) : 50
    );
    return {
      success: true,
      conversations,
    };
  }

  @Post('end')
  async endConversation(@Body() body: { sessionId: string }) {
    await this.chatService.deactivateConversation(body.sessionId);
    return {
      success: true,
      message: 'Conversation ended',
    };
  }

  @Post('book-demo')
  async bookDemo(@Body() body: { sessionId: string; timeSlot: string; notes?: string }) {
    try {
      // Check if we're in demo mode (WebChatSales.com - no bookings allowed)
      const isDemoMode = process.env.DEMO_MODE === 'true' || 
                         process.env.DEMO_MODE === '1' ||
                         (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('webchatsales.com'));
      
      if (isDemoMode) {
        console.log(`[ChatController] ⚠️ Demo booking attempt blocked - demo mode is active`);
        return {
          success: false,
          error: 'Demo booking is not available on WebChatSales.com. Demo booking is only available on client websites where Abby is installed.',
        };
      }

      const { sessionId, timeSlot, notes } = body;
      
      if (!sessionId || !timeSlot) {
        return {
          success: false,
          error: 'Session ID and time slot are required',
        };
      }

      const booking = await this.chatService.handleDemoBooking(
        sessionId,
        new Date(timeSlot),
        notes
      );

      return {
        success: true,
        booking,
        message: 'Demo booking created successfully',
      };
    } catch (error: any) {
      console.error(`[ChatController] Error booking demo:`, error);
      return {
        success: false,
        error: error?.message || 'Failed to book demo',
      };
    }
  }
}

