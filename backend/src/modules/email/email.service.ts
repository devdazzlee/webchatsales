import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpEmail = process.env.SMTP_EMAIL;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!smtpEmail || !smtpPassword) {
      throw new Error('SMTP_EMAIL and SMTP_PASSWORD environment variables are required');
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost || 'smtp.gmail.com',
      port: parseInt(smtpPort || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: smtpEmail,
        pass: smtpPassword,
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string, text?: string) {
    const smtpEmail = process.env.SMTP_EMAIL;
    if (!smtpEmail) {
      throw new Error('SMTP_EMAIL environment variable is required');
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"Abby - WebChat Sales" <${smtpEmail}>`,
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
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_EMAIL;
    if (!adminEmail) {
      throw new Error('ADMIN_EMAIL or SMTP_EMAIL environment variable is required');
    }
    return this.sendEmail(
      adminEmail,
      `New Beta Signup: ${userName}`,
      html
    );
  }

  async sendBusinessInquiryNotification(formData: any) {
    const inquiryTypesText = formData.inquiryTypes.join(', ') + 
      (formData.otherInquiry ? ` (Other: ${formData.otherInquiry})` : '');
    
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
            .label { font-weight: bold; color: #666; margin-right: 10px; }
            .section { margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 New Business Inquiry</h1>
            </div>
            <div class="content">
              <p>You have received a new business inquiry:</p>
              
              <div class="info-box">
                <div class="section">
                  <p><span class="label">Name:</span> ${formData.name}</p>
                  <p><span class="label">Email:</span> ${formData.email}</p>
                  <p><span class="label">Phone:</span> ${formData.phone}</p>
                  <p><span class="label">Company:</span> ${formData.company}</p>
                </div>
                
                <div class="section">
                  <p><span class="label">Inquiry Types:</span> ${inquiryTypesText}</p>
                </div>
                
                <div class="section">
                  <p><span class="label">Description:</span></p>
                  <p>${formData.description.replace(/\n/g, '<br>')}</p>
                </div>
                
                <div class="section">
                  <p><span class="label">Preferred Contact:</span> ${formData.contactMethod}</p>
                  ${formData.bestTime ? `<p><span class="label">Best Time:</span> ${formData.bestTime}</p>` : ''}
                </div>
                
                ${formData.comments ? `
                <div class="section">
                  <p><span class="label">Additional Comments:</span></p>
                  <p>${formData.comments.replace(/\n/g, '<br>')}</p>
                </div>
                ` : ''}
              </div>
              
              <p>Please follow up with them soon!</p>
              <p>Best regards,<br>WebChat Sales System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_EMAIL;
    if (!adminEmail) {
      throw new Error('ADMIN_EMAIL or SMTP_EMAIL environment variable is required');
    }
    
    return this.sendEmail(
      adminEmail,
      `New Business Inquiry from ${formData.name} - ${formData.company}`,
      html
    );
  }

  async sendBusinessInquiryConfirmation(email: string, name: string) {
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
              <h1>WebChat Sales</h1>
            </div>
            <div class="content">
              <h2>Thank You for Your Inquiry, ${name}!</h2>
              <p>We've received your business inquiry and our team will get back to you shortly.</p>
              <p>We typically respond within 1-2 business days.</p>
              <p>In the meantime, feel free to chat with Abby on our website if you have any questions!</p>
              <p>Best regards,<br>The WebChat Sales Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(
      email,
      'Thank You for Your Business Inquiry',
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

  async sendPaymentConfirmation(email: string, name: string, amount: number, planType: string) {
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
              <h1>Payment Confirmation - WebChat Sales</h1>
            </div>
            <div class="content">
              <h2>Thank You for Your Payment, ${name}!</h2>
              <p>Your payment has been successfully processed.</p>
              
              <div class="info-box">
                <p><span class="label">Amount:</span> $${amount.toFixed(2)}</p>
                <p><span class="label">Plan:</span> ${planType}</p>
                <p><span class="label">Date:</span> ${new Date().toLocaleDateString()}</p>
              </div>
              
              <p>Your account has been activated and you can now start using WebChat Sales!</p>
              <p>If you have any questions, feel free to chat with Abby on our website.</p>
              <p>Best regards,<br>The WebChat Sales Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(
      email,
      'Payment Confirmation - WebChat Sales',
      html
    );
  }
}

