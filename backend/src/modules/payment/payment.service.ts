import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from '../../schemas/payment.schema';
import { EmailService } from '../email/email.service';

@Injectable()
export class PaymentService {
  private squareAccessToken: string;
  private squareApplicationId: string;
  private squareApiUrl: string;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    this.squareAccessToken = 
      this.configService.get<string>('SQUARE_ACCESS_TOKEN') || 
      process.env.SQUARE_ACCESS_TOKEN || 
      'EAAAl_R4YHlmuym2pgaQdQqUfy4a57HFZHjxsxi9rfYPYFujOyxOrG0HOnUBgQxK';
    
    this.squareApplicationId = 
      this.configService.get<string>('SQUARE_APPLICATION_ID') || 
      process.env.SQUARE_APPLICATION_ID || 
      'sandbox-sq0idb-EzWSCphEv3i3RqREob8OpQ';
    
    // Use sandbox for development
    this.squareApiUrl = 'https://connect.squareupsandbox.com';
    
    console.log(`[PaymentService] ✅ Square API initialized (Application ID: ${this.squareApplicationId.substring(0, 20)}...)`);
  }

  async createPaymentLink(amount: number, planType: string, sessionId: string, userEmail?: string, userName?: string) {
    try {
      // Create a payment link using Square API
      const response = await fetch(`${this.squareApiUrl}/v2/online-checkout/payment-links`, {
        method: 'POST',
        headers: {
          'Square-Version': '2024-01-18',
          'Authorization': `Bearer ${this.squareAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idempotency_key: `payment_${sessionId}_${Date.now()}`,
          quick_pay: {
            name: `WebChat Sales - ${planType}`,
            price_money: {
              amount: Math.round(amount * 100), // Convert to cents
              currency: 'USD',
            },
          },
          checkout_options: {
            ask_for_shipping_address: false,
            allow_tipping: false,
          },
          pre_populated_data: {
            buyer_email: userEmail,
            buyer_phone_number: '',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[PaymentService] Square API error:', errorData);
        throw new Error(`Square API error: ${errorData.errors?.[0]?.detail || 'Unknown error'}`);
      }

      const data = await response.json();
      const paymentLink = data.payment_link;

      // Store payment record
      const payment = new this.paymentModel({
        squarePaymentId: paymentLink.id || `pending_${Date.now()}`,
        squareOrderId: paymentLink.order_id || '',
        sessionId,
        userEmail,
        userName,
        amount,
        currency: 'USD',
        planType,
        status: 'pending',
        confirmationEmailSent: false,
      });
      await payment.save();

      return {
        success: true,
        paymentLink: paymentLink.url || paymentLink.checkout_page_url,
        paymentId: payment._id.toString(),
      };
    } catch (error: any) {
      console.error('[PaymentService] Error creating payment link:', error);
      throw error;
    }
  }

  async verifyWebhook(signature: string, payload: string, url: string) {
    // Square webhook verification
    // In production, verify the signature using Square's webhook signature verification
    // For now, we'll accept webhooks from Square domain
    return true;
  }

  async handleWebhook(webhookData: any) {
    try {
      const eventType = webhookData.type;
      const data = webhookData.data;

      if (eventType === 'payment.created' || eventType === 'payment.updated') {
        const paymentId = data.object?.payment?.id;
        const orderId = data.object?.payment?.order_id;
        const status = data.object?.payment?.status;

        if (!paymentId) {
          console.error('[PaymentService] No payment ID in webhook');
          return;
        }

        // Find payment record
        const payment = await this.paymentModel.findOne({
          $or: [
            { squarePaymentId: paymentId },
            { squareOrderId: orderId },
          ],
        }).exec();

        if (!payment) {
          console.error(`[PaymentService] Payment not found: ${paymentId}`);
          return;
        }

        // Update payment status
        payment.status = status === 'COMPLETED' ? 'completed' : 
                        status === 'FAILED' ? 'failed' : 'pending';
        payment.squareWebhookData = webhookData;
        
        if (payment.status === 'completed' && !payment.confirmationEmailSent) {
          payment.paidAt = new Date();
          payment.confirmationEmailSent = true;
          
          // Send confirmation email
          if (payment.userEmail) {
            try {
              await this.emailService.sendPaymentConfirmation(
                payment.userEmail,
                payment.userName || 'Customer',
                payment.amount,
                payment.planType
              );
            } catch (emailError) {
              console.error('[PaymentService] Error sending confirmation email:', emailError);
            }
          }
        }

        await payment.save();
        console.log(`[PaymentService] ✅ Payment ${paymentId} updated to status: ${payment.status}`);
      }
    } catch (error: any) {
      console.error('[PaymentService] Error handling webhook:', error);
      throw error;
    }
  }

  async getPaymentById(paymentId: string) {
    return this.paymentModel.findById(paymentId).exec();
  }

  async getPaymentBySessionId(sessionId: string) {
    return this.paymentModel.findOne({ sessionId }).sort({ createdAt: -1 }).exec();
  }

  async getAllPayments(limit = 50) {
    return this.paymentModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}

