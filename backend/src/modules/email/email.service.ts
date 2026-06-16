import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { config, smtpConfig } from '../../config/config';

/**
 * Email Service — all mail sent via hardcoded Zoho SMTP (see config.ts).
 */
@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly fromEmail = smtpConfig.email;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      requireTLS: true,
      auth: {
        user: smtpConfig.email,
        pass: smtpConfig.password,
      },
    });
    console.log(`[EmailService] ✅ Email service initialized with ${smtpConfig.email} via ${smtpConfig.host}:${smtpConfig.port}`);
  }

  async sendEmail(to: string, subject: string, html: string, text?: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"Abby - WebChatSales" <${this.fromEmail}>`,
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
      const errorMessage = error.message || String(error);

      if (errorMessage.includes('535') || errorMessage.includes('BadCredentials') || errorMessage.includes('Authentication Failed')) {
        console.error(`[EmailService] ❌ SMTP authentication failed for ${to}`);
        console.error('[EmailService] 🔑 Check hardcoded Zoho credentials in config.ts');
      } else {
        console.error(`[EmailService] ❌ Error sending email to ${to}:`, errorMessage);
      }

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

  async sendIntakeConfirmation(email: string, name: string, businessName: string, isNewClient: boolean) {
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
              <h1>🎉 You're All Set!</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Thank you for submitting your business information for <strong>${businessName}</strong>.</p>
              <p>Abby is being configured for your business. Our team will review your details and be in touch soon with next steps.</p>
              <p>In the meantime, if you have any questions, feel free to reply to this email.</p>
              <p>Best regards,<br>The WebChatSales Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(
      email,
      `Abby is being configured for ${businessName}`,
      html,
    );
  }

  async sendIntakeAdminNotification(adminEmail: string, payload: any, isNewClient: boolean) {
    const services = (payload.servicesOffered || []).join(', ');
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
              <h1>📋 New Intake Submission</h1>
            </div>
            <div class="content">
              <p>${isNewClient ? 'A new client signed up via the intake form.' : 'An existing client updated their intake form.'}</p>
              <div class="info-box">
                <p><span class="label">Business:</span> ${payload.businessName}</p>
                <p><span class="label">Owner:</span> ${payload.ownerName}</p>
                <p><span class="label">Email:</span> ${payload.ownerEmail}</p>
                ${payload.ownerPhone ? `<p><span class="label">Phone:</span> ${payload.ownerPhone}</p>` : ''}
                ${payload.companyWebsite ? `<p><span class="label">Website:</span> ${payload.companyWebsite}</p>` : ''}
                ${payload.industry ? `<p><span class="label">Industry:</span> ${payload.industry}</p>` : ''}
                <p><span class="label">Services:</span> ${services}</p>
                <p><span class="label">Hours:</span> ${payload.businessHours}</p>
                <p><span class="label">Timezone:</span> ${payload.timezone}</p>
              </div>
              <p>Review and configure this client in the admin dashboard.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(
      adminEmail,
      `${isNewClient ? 'New' : 'Updated'} Intake: ${payload.businessName}`,
      html,
    );
  }
}

