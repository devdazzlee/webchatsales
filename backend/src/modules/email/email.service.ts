import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string, text?: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"Abby - WebChat Sales" <${process.env.SMTP_EMAIL}>`,
        to,
        subject,
        text: text || subject,
        html,
      });

      console.log('Email sent:', info.messageId);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Email error:', error);
      throw error;
    }
  }

  async sendBetaInviteConfirmation(email: string, name: string) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: #22c55e; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background: #22c55e; color: #000; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>WebChat Sales</h1>
            </div>
            <div class="content">
              <h2>Welcome to the Founding Beta, ${name}!</h2>
              <p>Thank you for joining the WebChat Sales founding beta program. We're excited to have you on board!</p>
              <p>You'll receive priority onboarding, direct input on features, and founder pricing.</p>
              <p>Our team will reach out to you shortly with next steps.</p>
              <p>In the meantime, feel free to chat with Abby on our website anytime!</p>
              <p>Best regards,<br>The WebChat Sales Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(
      email,
      'Welcome to WebChat Sales Founding Beta!',
      html
    );
  }

  async sendBetaSignupNotification(userEmail: string, userName: string, company?: string, outcomes?: string) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: #22c55e; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .info-box { background: #fff; padding: 15px; margin: 10px 0; border-left: 4px solid #22c55e; }
            .label { font-weight: bold; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 New Beta Signup!</h1>
            </div>
            <div class="content">
              <p>You have a new beta signup request:</p>
              
              <div class="info-box">
                <p><span class="label">Name:</span> ${userName}</p>
                <p><span class="label">Email:</span> ${userEmail}</p>
                ${company ? `<p><span class="label">Company:</span> ${company}</p>` : ''}
                ${outcomes ? `<p><span class="label">Outcomes:</span> ${outcomes}</p>` : ''}
              </div>
              
              <p>Don't forget to reach out to them soon!</p>
              <p>Best regards,<br>WebChat Sales System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send to the admin email (SMTP_EMAIL)
    return this.sendEmail(
      process.env.SMTP_EMAIL || 'metaxoft5@gmail.com',
      `New Beta Signup: ${userName}`,
      html
    );
  }

  async sendConversationTranscript(email: string, conversation: any) {
    const messagesHtml = conversation.messages
      .map((msg: any) => `
        <div style="margin-bottom: 15px; padding: 10px; background: ${msg.role === 'user' ? '#e3f2fd' : '#f5f5f5'}; border-radius: 4px;">
          <strong>${msg.role === 'user' ? 'You' : 'Abby'}:</strong>
          <p style="margin: 5px 0 0 0;">${msg.content.replace(/\n/g, '<br>')}</p>
          <small style="color: #666;">${new Date(msg.timestamp).toLocaleString()}</small>
        </div>
      `)
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: #22c55e; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>WebChat Sales - Conversation Transcript</h1>
            </div>
            <div class="content">
              <p>Here's a transcript of your conversation with Abby:</p>
              ${messagesHtml}
              <p style="margin-top: 20px;">Thank you for using WebChat Sales!</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(
      email,
      'Your conversation transcript with Abby',
      html
    );
  }
}

