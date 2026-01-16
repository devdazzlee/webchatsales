import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { config } from '../../config/config';

/**
 * Email Service
 * 
 * IMPORTANT: Gmail requires App Passwords (not regular passwords)
 * - Enable 2FA on Gmail account
 * - Generate App Password: https://myaccount.google.com/apppasswords
 * - Use App Password in SMTP_PASSWORD, not your Gmail login password
 * 
 * Error 535-5.7.8 means: Wrong credentials (usually using regular password instead of App Password)
 */
@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;
  private configError: string | null = null;

  constructor() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpEmail = process.env.SMTP_EMAIL;
    const smtpPassword = process.env.SMTP_PASSWORD;

    // Don't crash if email is not configured - just log warning and disable email
    if (!smtpEmail || !smtpPassword) {
      console.warn('[EmailService] ⚠️ SMTP_EMAIL and SMTP_PASSWORD not configured - email sending disabled');
      console.warn('[EmailService] 📧 To enable email, set SMTP_EMAIL and SMTP_PASSWORD in your .env file');
      console.warn('[EmailService] 🔑 For Gmail, use an App Password (not your regular password):');
      console.warn('[EmailService]    1. Enable 2FA on your Gmail account');
      console.warn('[EmailService]    2. Go to https://myaccount.google.com/apppasswords');
      console.warn('[EmailService]    3. Generate an App Password for "Mail"');
      console.warn('[EmailService]    4. Use that 16-character password in SMTP_PASSWORD');
      this.configError = 'SMTP credentials not configured';
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost || 'smtp.gmail.com',
        port: parseInt(smtpPort || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: smtpEmail,
          pass: smtpPassword,
        },
      });
      this.isConfigured = true;
      console.log(`[EmailService] ✅ Email service initialized with ${smtpEmail}`);
    } catch (error: any) {
      console.error('[EmailService] ❌ Failed to initialize email transporter:', error.message);
      this.configError = error.message;
    }
  }

  async sendEmail(to: string, subject: string, html: string, text?: string) {
    // Check if email is configured
    if (!this.isConfigured || !this.transporter) {
      console.warn(`[EmailService] ⚠️ Email not sent (not configured): ${subject} → ${to}`);
      console.warn(`[EmailService] 📋 Reason: ${this.configError || 'Transporter not initialized'}`);
      // Return success: false instead of throwing - don't break the app for email issues
      return {
        success: false,
        error: this.configError || 'Email service not configured',
        recipient: to,
        subject: subject,
      };
    }

    const smtpEmail = process.env.SMTP_EMAIL;

    try {
      const info = await this.transporter.sendMail({
        from: `"Abby - WebChatSales" <${smtpEmail}>`,
        to,
        subject,
        text: text || subject,
        html,
      });

      console.log(`[EmailService] ✅ Email sent successfully to: ${to}`);
      console.log(`[EmailService] 📧 Message ID: ${info.messageId}`);
      console.log(`[EmailService] 📨 Subject: ${subject}`);
      return {
        success: true,
        messageId: info.messageId,
        recipient: to,
      };
    } catch (error: any) {
      // Handle specific Gmail errors with helpful messages
      const errorMessage = error.message || String(error);
      
      if (errorMessage.includes('535-5.7.8') || errorMessage.includes('BadCredentials')) {
        console.error(`[EmailService] ❌ Gmail authentication failed for ${to}`);
        console.error('[EmailService] 🔑 FIX: You need to use a Gmail App Password, not your regular password:');
        console.error('[EmailService]    1. Go to https://myaccount.google.com/security');
        console.error('[EmailService]    2. Enable 2-Step Verification');
        console.error('[EmailService]    3. Go to https://myaccount.google.com/apppasswords');
        console.error('[EmailService]    4. Create an App Password for "Mail"');
        console.error('[EmailService]    5. Update SMTP_PASSWORD in your .env with the 16-character App Password');
      } else {
        console.error(`[EmailService] ❌ Error sending email to ${to}:`, errorMessage);
      }
      
      // Return error instead of throwing - don't crash the app for email failures
      return {
        success: false,
        error: errorMessage,
        recipient: to,
        subject: subject,
      };
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
              <h1>WebChatSales</h1>
            </div>
            <div class="content">
              <h2>Welcome to the Founding Beta, ${name}!</h2>
              <p>Thank you for joining the WebChatSales founding beta program. We're excited to have you on board!</p>
              <p>You'll receive priority onboarding, direct input on features, and founder pricing.</p>
              <p>Our team will reach out to you shortly with next steps.</p>
              <p>In the meantime, feel free to chat with Abby on our website anytime!</p>
              <p>Best regards,<br>The WebChatSales Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(
      email,
      'Welcome to WebChatSales Founding Beta!',
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
              <p>Best regards,<br>WebChatSales System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send to the admin email
    const adminEmail = config.adminEmail;
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
              <p>Best regards,<br>WebChatSales System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const adminEmail = config.adminEmail;
    
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
              <h1>WebChatSales</h1>
            </div>
            <div class="content">
              <h2>Thank You for Your Inquiry, ${name}!</h2>
              <p>We've received your business inquiry and our team will get back to you shortly.</p>
              <p>We typically respond within 1-2 business days.</p>
              <p>In the meantime, feel free to chat with Abby on our website if you have any questions!</p>
              <p>Best regards,<br>The WebChatSales Team</p>
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
              <h1>WebChatSales - Conversation Transcript</h1>
            </div>
            <div class="content">
              <p>Here's a transcript of your conversation with Abby:</p>
              ${messagesHtml}
              <p style="margin-top: 20px;">Thank you for using WebChatSales!</p>
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
              <h1>Payment Confirmation - WebChatSales</h1>
            </div>
            <div class="content">
              <h2>Thank You for Your Payment, ${name}!</h2>
              <p>Your payment has been successfully processed.</p>
              
              <div class="info-box">
                <p><span class="label">Amount:</span> $${amount.toFixed(2)}</p>
                <p><span class="label">Plan:</span> ${planType}</p>
                <p><span class="label">Date:</span> ${new Date().toLocaleDateString()}</p>
              </div>
              
              <p>Your account has been activated and you can now start using WebChatSales!</p>
              <p>If you have any questions, feel free to chat with Abby on our website.</p>
              <p>Best regards,<br>The WebChatSales Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(
      email,
      'Payment Confirmation - WebChatSales',
      html
    );
  }

  async sendDemoBookingConfirmation(email: string, name: string, timeSlot: Date, serviceNeed?: string) {
    const formattedDate = new Date(timeSlot).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = new Date(timeSlot).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

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
              <h1>Demo Booking Confirmed! 🎉</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Your demo booking has been confirmed. We're excited to show you how WebChatSales can help your business!</p>
              
              <div class="info-box">
                <p><span class="label">Date:</span> ${formattedDate}</p>
                <p><span class="label">Time:</span> ${formattedTime}</p>
                ${serviceNeed ? `<p><span class="label">Service:</span> ${serviceNeed}</p>` : ''}
              </div>
              
              <p>We'll send you a reminder closer to the demo date. If you need to reschedule or have any questions, please reply to this email.</p>
              
              <p>Looking forward to speaking with you!</p>
              <p>Best regards,<br>The WebChatSales Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log(`[EmailService] 📧 Sending demo booking confirmation to user: ${email}`);
    return this.sendEmail(
      email,
      'Demo Booking Confirmed - WebChatSales',
      html
    );
  }

  async sendDemoBookingNotification(userEmail: string, userName: string, timeSlot: Date, serviceNeed?: string, userPhone?: string) {
    const formattedDate = new Date(timeSlot).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = new Date(timeSlot).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

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
              <h1>📅 New Demo Booking</h1>
            </div>
            <div class="content">
              <p>A new demo booking has been scheduled:</p>
              
              <div class="info-box">
                <p><span class="label">Customer Name:</span> ${userName}</p>
                <p><span class="label">Email:</span> ${userEmail}</p>
                ${userPhone ? `<p><span class="label">Phone:</span> ${userPhone}</p>` : ''}
                <p><span class="label">Date:</span> ${formattedDate}</p>
                <p><span class="label">Time:</span> ${formattedTime}</p>
                ${serviceNeed ? `<p><span class="label">Service Interest:</span> ${serviceNeed}</p>` : ''}
              </div>
              
              <p>Please prepare for the demo and confirm the appointment with the customer.</p>
              <p>Best regards,<br>WebChatSales System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const adminEmail = config.adminEmail;
    
    console.log(`[EmailService] 📧 Sending demo booking notification to admin: ${adminEmail}`);
    return this.sendEmail(
      adminEmail,
      `New Demo Booking: ${userName} - ${formattedDate} at ${formattedTime}`,
      html
    );
  }

  async sendLeadQualificationConfirmation(email: string, name: string, serviceNeed?: string, timing?: string, budget?: string) {
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
              <h1>Thank You, ${name}! 🙏</h1>
            </div>
            <div class="content">
              <h2>We've Received Your Information</h2>
              <p>Thank you for providing your details. We've successfully saved your information:</p>
              
              <div class="info-box">
                ${serviceNeed ? `<p><span class="label">Service Need:</span> ${serviceNeed}</p>` : ''}
                ${timing ? `<p><span class="label">Timing:</span> ${timing}</p>` : ''}
                ${budget ? `<p><span class="label">Budget:</span> ${budget}</p>` : ''}
              </div>
              
              <p>Our team will review your information and get back to you soon. In the meantime, feel free to schedule a demo or chat with Abby if you have any questions!</p>
              
              <p>Best regards,<br>The WebChatSales Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log(`[EmailService] 📧 Sending lead qualification confirmation to user: ${email}`);
    return this.sendEmail(
      email,
      'Thank You for Your Interest - WebChatSales',
      html
    );
  }

  async sendTicketCreationConfirmation(email: string, name: string, ticketId: string) {
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
              <h1>Support Ticket Created ✅</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>We've received your support request and created a ticket for you.</p>
              
              <div class="info-box">
                <p><span class="label">Ticket ID:</span> ${ticketId}</p>
                <p><span class="label">Status:</span> Open</p>
                <p><span class="label">Created:</span> ${new Date().toLocaleString()}</p>
              </div>
              
              <p>Our support team will review your ticket and get back to you soon. You'll receive email updates as we work on resolving your issue.</p>
              
              <p>If you have any urgent concerns, please don't hesitate to reach out!</p>
              <p>Best regards,<br>The WebChatSales Support Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log(`[EmailService] 📧 Sending ticket creation confirmation to user: ${email}`);
    return this.sendEmail(
      email,
      `Support Ticket Created: ${ticketId}`,
      html
    );
  }

  async sendTicketCreationNotification(userEmail: string, userName: string, ticketId: string, summary?: string, sentiment?: string) {
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
              <h1>🎫 New Support Ticket</h1>
            </div>
            <div class="content">
              <p>A new support ticket has been created:</p>
              
              <div class="info-box">
                <p><span class="label">Ticket ID:</span> ${ticketId}</p>
                <p><span class="label">Customer Name:</span> ${userName}</p>
                <p><span class="label">Email:</span> ${userEmail}</p>
                ${summary ? `<p><span class="label">Summary:</span> ${summary}</p>` : ''}
                ${sentiment ? `<p><span class="label">Sentiment:</span> ${sentiment}</p>` : ''}
                <p><span class="label">Created:</span> ${new Date().toLocaleString()}</p>
              </div>
              
              <p>Please review and respond to this ticket promptly.</p>
              <p>Best regards,<br>WebChatSales System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const adminEmail = config.adminEmail;
    
    console.log(`[EmailService] 📧 Sending ticket creation notification to admin: ${adminEmail}`);
    return this.sendEmail(
      adminEmail,
      `New Support Ticket: ${ticketId} from ${userName}`,
      html
    );
  }
}

