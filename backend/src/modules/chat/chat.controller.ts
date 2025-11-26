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

    try {
      for await (const chunk of this.chatService.streamChatResponse(sessionId, message)) {
        res.write(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ chunk: '', done: true })}\n\n`);
      res.end();
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
      res.end();
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
}

