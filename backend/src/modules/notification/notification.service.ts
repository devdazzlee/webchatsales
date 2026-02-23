import { Injectable } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { TenantService } from '../tenant/tenant.service';
import { config } from '../../config/config';

/**
 * NotificationService - Handles real-time email notifications for client sites
 * 
 * Multi-tenant aware: resolves notification email per-client.
 * Falls back to global config if no per-tenant email is set.
 * 
 * Triggers:
 * 1. New Conversation - When a visitor starts chatting (first user message)
 * 2. Qualified Lead - When a lead has all required fields collected
 * 3. Missed Question - When the AI can't answer or detects a support issue
 * 4. New Lead - When a visitor first shares contact info
 */
@Injectable()
export class NotificationService {
  constructor(
    private readonly emailService: EmailService,
    private readonly tenantService: TenantService,
  ) {
    console.log(`[NotificationService] ✅ Initialized - global fallback email: ${config.notificationEmail}`);
  }

  /**
   * Get the notification email for a specific client.
   * Falls back to global config if tenant has no notification email.
   */
  private async getNotificationEmail(clientId?: string): Promise<string> {
    if (clientId) {
      try {
        const client = await this.tenantService.findById(clientId);
        if (client?.notificationEmail) {
          return client.notificationEmail;
        }
        if (client?.ownerEmail) {
          return client.ownerEmail;
        }
      } catch (err) {
        console.warn(`[NotificationService] Could not resolve tenant email for ${clientId}:`, err);
      }
    }
    return config.notificationEmail;
  }

  /**
   * Notify when a new conversation starts (first user message)
   */
  async notifyNewConversation(data: {
    clientId?: string;
    sessionId: string;
    firstMessage: string;
    userName?: string;
    userEmail?: string;
    timestamp: Date;
  }) {
    const notificationEmail = await this.getNotificationEmail(data.clientId);
    if (!notificationEmail) {
      console.warn('[NotificationService] ⚠️ No notification email configured');
      return;
    }

    const timeStr = data.timestamp.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #000; color: #22c55e; padding: 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; }
            .badge { display: inline-block; background: #22c55e; color: #000; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-top: 8px; }
            .content { padding: 24px; background: #f9fafb; }
            .info-box { background: #fff; padding: 16px; margin: 12px 0; border-left: 4px solid #22c55e; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .label { font-weight: bold; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
            .value { color: #111; font-size: 15px; margin-top: 2px; }
            .message-preview { background: #e5e7eb; padding: 12px 16px; border-radius: 8px; font-style: italic; color: #374151; margin: 12px 0; }
            .footer { padding: 16px 24px; background: #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af; }
            .cta-button { display: inline-block; padding: 12px 28px; background: #22c55e; color: #000; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💬 New Conversation Started</h1>
              <div class="badge">LIVE NOW</div>
            </div>
            <div class="content">
              <p style="margin-top: 0;">A new visitor has started a conversation on your website.</p>
              
              <div class="info-box">
                <p><span class="label">Time:</span></p>
                <p class="value">${timeStr}</p>
              </div>

              <div class="info-box">
                <p><span class="label">Session ID:</span></p>
                <p class="value" style="font-family: monospace; font-size: 13px;">${data.sessionId}</p>
              </div>

              ${data.userName ? `
              <div class="info-box">
                <p><span class="label">Visitor Name:</span></p>
                <p class="value">${data.userName}</p>
              </div>
              ` : ''}

              ${data.userEmail ? `
              <div class="info-box">
                <p><span class="label">Visitor Email:</span></p>
                <p class="value">${data.userEmail}</p>
              </div>
              ` : ''}

              <p><span class="label">First Message:</span></p>
              <div class="message-preview">
                "${data.firstMessage.length > 200 ? data.firstMessage.substring(0, 200) + '...' : data.firstMessage}"
              </div>

              <p style="font-size: 13px; color: #6b7280;">You can view this conversation in your dashboard.</p>
            </div>
            <div class="footer">
              <p>WebChatSales — Real-time Lead Notifications</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const result = await this.emailService.sendEmail(
        notificationEmail,
        `💬 New Conversation: "${data.firstMessage.substring(0, 50)}${data.firstMessage.length > 50 ? '...' : ''}"`,
        html,
      );
      console.log(`[NotificationService] ✅ New conversation notification sent to ${notificationEmail}`);
      return result;
    } catch (error) {
      console.error(`[NotificationService] ❌ Failed to send new conversation notification:`, error);
    }
  }

  /**
   * Notify when a lead is qualified (has all key fields)
   */
  async notifyQualifiedLead(data: {
    clientId?: string;
    sessionId: string;
    name: string;
    email?: string;
    phone?: string;
    businessType?: string;
    leadSource?: string;
    leadsPerWeek?: string;
    dealValue?: string;
    afterHoursPain?: string;
    serviceNeed?: string;
    timing?: string;
    budget?: string;
    summary?: string;
    conversationTranscript?: string;
    timestamp: Date;
  }) {
    const notificationEmail = await this.getNotificationEmail(data.clientId);
    if (!notificationEmail) return;

    const timeStr = data.timestamp.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    });

    // Build lead details rows
    const fields = [
      { label: 'Name', value: data.name },
      { label: 'Email', value: data.email },
      { label: 'Phone', value: data.phone },
      { label: 'Business Type', value: data.businessType },
      { label: 'Lead Source', value: data.leadSource },
      { label: 'Leads/Week', value: data.leadsPerWeek },
      { label: 'Deal Value', value: data.dealValue },
      { label: 'After-Hours Pain', value: data.afterHoursPain },
      { label: 'Service Need', value: data.serviceNeed },
      { label: 'Timing', value: data.timing },
      { label: 'Budget', value: data.budget },
    ].filter(f => f.value);

    const fieldsHtml = fields.map(f => `
      <tr>
        <td style="padding: 8px 12px; font-weight: bold; color: #6b7280; font-size: 13px; border-bottom: 1px solid #f3f4f6; width: 140px;">${f.label}</td>
        <td style="padding: 8px 12px; color: #111; font-size: 14px; border-bottom: 1px solid #f3f4f6;">${f.value}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #000; color: #22c55e; padding: 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; }
            .badge { display: inline-block; background: #f59e0b; color: #000; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-top: 8px; }
            .content { padding: 24px; background: #f9fafb; }
            .lead-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin: 16px 0; }
            .transcript-box { background: #fff; padding: 16px; margin: 16px 0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-height: 400px; overflow-y: auto; }
            .footer { padding: 16px 24px; background: #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔥 Qualified Lead Captured!</h1>
              <div class="badge">HOT LEAD</div>
            </div>
            <div class="content">
              <p style="margin-top: 0; font-size: 16px;">Great news! A new qualified lead has been captured on your website.</p>
              <p style="font-size: 13px; color: #6b7280;">Qualified at: ${timeStr}</p>
              
              <table class="lead-table">
                ${fieldsHtml}
              </table>

              ${data.summary ? `
              <div style="background: #fff; padding: 16px; margin: 16px 0; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; font-weight: bold; color: #6b7280; font-size: 13px;">SUMMARY</p>
                <p style="margin: 4px 0 0 0; color: #111;">${data.summary}</p>
              </div>
              ` : ''}

              ${data.conversationTranscript ? `
              <details style="margin: 16px 0;">
                <summary style="cursor: pointer; font-weight: bold; color: #374151; padding: 8px 0;">📝 View Conversation Transcript</summary>
                <div class="transcript-box">
                  ${data.conversationTranscript}
                </div>
              </details>
              ` : ''}

              <p style="font-size: 14px; color: #374151; background: #fef3c7; padding: 12px; border-radius: 6px; margin-top: 16px;">
                ⚡ <strong>Tip:</strong> Follow up with this lead within 5 minutes for the best conversion rate!
              </p>
            </div>
            <div class="footer">
              <p>WebChatSales — Real-time Lead Notifications</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const result = await this.emailService.sendEmail(
        notificationEmail,
        `🔥 Qualified Lead: ${data.name}${data.email ? ` (${data.email})` : ''}`,
        html,
      );
      console.log(`[NotificationService] ✅ Qualified lead notification sent to ${notificationEmail}`);
      return result;
    } catch (error) {
      console.error(`[NotificationService] ❌ Failed to send qualified lead notification:`, error);
    }
  }

  /**
   * Notify when a question is missed / support issue detected
   */
  async notifyMissedQuestion(data: {
    clientId?: string;
    sessionId: string;
    userMessage: string;
    userName?: string;
    userEmail?: string;
    ticketId?: string;
    summary?: string;
    sentiment?: string;
    timestamp: Date;
  }) {
    const notificationEmail = await this.getNotificationEmail(data.clientId);
    if (!notificationEmail) return;

    const timeStr = data.timestamp.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    });

    const sentimentColor = data.sentiment === 'negative' ? '#ef4444' : 
                          data.sentiment === 'neutral' ? '#f59e0b' : '#22c55e';
    const sentimentEmoji = data.sentiment === 'negative' ? '😠' : 
                          data.sentiment === 'neutral' ? '😐' : '🙂';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #000; color: #ef4444; padding: 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; }
            .badge { display: inline-block; background: #ef4444; color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-top: 8px; }
            .content { padding: 24px; background: #f9fafb; }
            .info-box { background: #fff; padding: 16px; margin: 12px 0; border-left: 4px solid #ef4444; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .label { font-weight: bold; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
            .message-preview { background: #fef2f2; padding: 12px 16px; border-radius: 8px; color: #991b1b; margin: 12px 0; border: 1px solid #fecaca; }
            .footer { padding: 16px 24px; background: #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Missed Question / Support Issue</h1>
              <div class="badge">NEEDS ATTENTION</div>
            </div>
            <div class="content">
              <p style="margin-top: 0;">A visitor has a question or issue that may need your personal attention.</p>
              
              <div class="info-box">
                <p><span class="label">Time:</span> ${timeStr}</p>
                ${data.userName ? `<p><span class="label">Visitor:</span> ${data.userName}</p>` : ''}
                ${data.userEmail ? `<p><span class="label">Email:</span> ${data.userEmail}</p>` : ''}
                ${data.ticketId ? `<p><span class="label">Ticket ID:</span> ${data.ticketId}</p>` : ''}
                ${data.sentiment ? `<p><span class="label">Sentiment:</span> <span style="color: ${sentimentColor};">${sentimentEmoji} ${data.sentiment}</span></p>` : ''}
              </div>

              <p><span class="label">Visitor's Message:</span></p>
              <div class="message-preview">
                "${data.userMessage.length > 300 ? data.userMessage.substring(0, 300) + '...' : data.userMessage}"
              </div>

              ${data.summary ? `
              <div style="background: #fff; padding: 16px; margin: 12px 0; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; font-weight: bold; color: #6b7280; font-size: 13px;">AI SUMMARY</p>
                <p style="margin: 4px 0 0 0; color: #111;">${data.summary}</p>
              </div>
              ` : ''}

              <p style="font-size: 13px; color: #6b7280;">Session ID: <code>${data.sessionId}</code></p>
              
              <p style="font-size: 14px; color: #374151; background: #fef2f2; padding: 12px; border-radius: 6px; margin-top: 16px;">
                🚨 <strong>Action needed:</strong> This visitor may need a human response. Check your dashboard to review the full conversation and respond.
              </p>
            </div>
            <div class="footer">
              <p>WebChatSales — Real-time Lead Notifications</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const result = await this.emailService.sendEmail(
        notificationEmail,
        `⚠️ Missed Question${data.userName ? ` from ${data.userName}` : ''}: "${data.userMessage.substring(0, 60)}${data.userMessage.length > 60 ? '...' : ''}"`,
        html,
      );
      console.log(`[NotificationService] ✅ Missed question notification sent to ${notificationEmail}`);
      return result;
    } catch (error) {
      console.error(`[NotificationService] ❌ Failed to send missed question notification:`, error);
    }
  }

  /**
   * Notify when a new lead is created (even before fully qualified - has at least name or email)
   */
  async notifyNewLead(data: {
    clientId?: string;
    sessionId: string;
    name?: string;
    email?: string;
    phone?: string;
    serviceNeed?: string;
    timestamp: Date;
  }) {
    const notificationEmail = await this.getNotificationEmail(data.clientId);
    if (!notificationEmail) return;

    // Only notify if we have at least a name or email
    if (!data.name && !data.email) return;

    const timeStr = data.timestamp.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #000; color: #3b82f6; padding: 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; }
            .badge { display: inline-block; background: #3b82f6; color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-top: 8px; }
            .content { padding: 24px; background: #f9fafb; }
            .info-box { background: #fff; padding: 16px; margin: 12px 0; border-left: 4px solid #3b82f6; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .label { font-weight: bold; color: #6b7280; font-size: 13px; }
            .footer { padding: 16px 24px; background: #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>👤 New Lead Captured</h1>
              <div class="badge">NEW LEAD</div>
            </div>
            <div class="content">
              <p style="margin-top: 0;">A visitor has shared their contact information.</p>
              
              <div class="info-box">
                <p><span class="label">Time:</span> ${timeStr}</p>
                ${data.name ? `<p><span class="label">Name:</span> ${data.name}</p>` : ''}
                ${data.email ? `<p><span class="label">Email:</span> ${data.email}</p>` : ''}
                ${data.phone ? `<p><span class="label">Phone:</span> ${data.phone}</p>` : ''}
                ${data.serviceNeed ? `<p><span class="label">Interest:</span> ${data.serviceNeed}</p>` : ''}
              </div>

              <p style="font-size: 13px; color: #6b7280;">Session ID: <code>${data.sessionId}</code></p>
              <p style="font-size: 13px; color: #6b7280;">This lead is still being qualified by Abby. You'll receive another notification when all details are collected.</p>
            </div>
            <div class="footer">
              <p>WebChatSales — Real-time Lead Notifications</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const result = await this.emailService.sendEmail(
        notificationEmail,
        `👤 New Lead: ${data.name || data.email || 'Unknown'}`,
        html,
      );
      console.log(`[NotificationService] ✅ New lead notification sent to ${notificationEmail}`);
      return result;
    } catch (error) {
      console.error(`[NotificationService] ❌ Failed to send new lead notification:`, error);
    }
  }
}
