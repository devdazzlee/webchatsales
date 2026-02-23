import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from '../../schemas/payment.schema';
import { EmailService } from '../email/email.service';
import { TenantService } from '../tenant/tenant.service';

// Square SDK imports
let SquareClient: any = null;
let SquareEnvironment: any = null;
try {
  const square = require('square');
  SquareClient = square.SquareClient;
  SquareEnvironment = square.SquareEnvironment;
} catch (e) {
  throw new Error('Square SDK not installed. Run: npm install square');
}

@Injectable()
export class PaymentService {
  private squareAccessToken: string;
  private squareApplicationId: string;
  private squareSecret: string;
  private squareLocationId: string;
  private squareEnvironment: string;
  private client: any;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private configService: ConfigService,
    private emailService: EmailService,
    private tenantService: TenantService,
  ) {
    this.squareAccessToken = 
      this.configService.get<string>('SQUARE_ACCESS_TOKEN') || 
      process.env.SQUARE_ACCESS_TOKEN || 
      'EAAAl_R4YHlmuym2pgaQdQqUfy4a57HFZHjxsxi9rfYPYFujOyxOrG0HOnUBgQxK';
    
    this.squareApplicationId = 
      this.configService.get<string>('SQUARE_APPLICATION_ID') || 
      process.env.SQUARE_APPLICATION_ID || 
      'sandbox-sq0idb-EzWSCphEv3i3RqREob8OpQ';
    
    this.squareSecret = 
      this.configService.get<string>('SQUARE_SECRET') || 
      process.env.SQUARE_SECRET || 
      'sandbox-sq0csb-eKP70ZIFH54iq-kpnOD8pZhtrkZFMj0x7ENB5GrRJc8x';
    
    this.squareLocationId = 
      this.configService.get<string>('SQUARE_LOCATION_ID') || 
      process.env.SQUARE_LOCATION_ID || 
      '';
    
    this.squareEnvironment = 
      this.configService.get<string>('SQUARE_ENVIRONMENT') || 
      process.env.SQUARE_ENVIRONMENT || 
      'sandbox';

    if (!SquareClient || !SquareEnvironment) {
      throw new Error('Square SDK not available. Install with: npm install square');
    }

    this.client = new SquareClient({
      token: this.squareAccessToken,
      environment: this.squareEnvironment === 'production' 
        ? SquareEnvironment.Production 
        : SquareEnvironment.Sandbox,
    });
    
    console.log(`[PaymentService] ✅ Square SDK initialized (${this.squareEnvironment})`);
  }

  /**
   * Get Square client for a specific tenant.
   * Falls back to global credentials if tenant has none configured.
   */
  private async getSquareClientForTenant(clientId: string): Promise<any> {
    const tenant = await this.tenantService.findById(clientId);
    if (tenant?.squareAccessToken) {
      return new SquareClient({
        token: tenant.squareAccessToken,
        environment: (tenant.squareEnvironment || this.squareEnvironment) === 'production'
          ? SquareEnvironment.Production
          : SquareEnvironment.Sandbox,
      });
    }
    return this.client;
  }

  /**
   * Get location ID — per-tenant or global fallback
   */
  private async getLocationId(clientId?: string): Promise<string> {
    // Check per-tenant location first
    if (clientId) {
      const tenant = await this.tenantService.findById(clientId);
      if (tenant?.squareLocationId) {
        return tenant.squareLocationId;
      }
    }

    if (this.squareLocationId) {
      return this.squareLocationId;
    }

    try {
      const squareClient = clientId ? await this.getSquareClientForTenant(clientId) : this.client;
      const response = await squareClient.locations.list();

      if (response.result && response.result.locations && response.result.locations.length > 0) {
        const locationId = response.result.locations[0].id;
        this.squareLocationId = locationId;
        console.log(`[PaymentService] ✅ Retrieved location ID: ${locationId}`);
        return locationId;
      }

      throw new Error('No locations found in Square account');
    } catch (error: any) {
      if (error.statusCode === 401 || (error.errors && error.errors[0]?.code === 'UNAUTHORIZED')) {
        console.error('[PaymentService] Authentication error fetching location ID:', error.errors?.[0]?.detail || error.message);
        throw new Error(
          'Square access token authentication failed. ' +
          'Please verify your SQUARE_ACCESS_TOKEN is valid and has not expired. ' +
          'You can also set SQUARE_LOCATION_ID directly in environment variables.'
        );
      }
      
      console.error('[PaymentService] Error fetching location ID:', error);
      throw new Error(
        'Unable to fetch Square location ID. ' +
        'Please set SQUARE_LOCATION_ID in environment variables.'
      );
    }
  }

  /**
   * Create payment link using Square SDK
   */
  async createPaymentLink(clientId: string, amount: number, planType: string, sessionId: string, userEmail?: string, userName?: string) {
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount: amount must be greater than 0');
    }

    const locationId = await this.getLocationId(clientId);
    const squareClient = await this.getSquareClientForTenant(clientId);
    const idempotencyKey = `payment_${sessionId}_${Date.now()}`;
    const amountInCents = Math.round(amount * 100);
    
    const requestBody: any = {
      idempotencyKey,
      quickPay: {
        name: `WebChatSales - ${planType}`,
        priceMoney: {
          amount: BigInt(amountInCents),
          currency: 'USD',
        },
        locationId,
      },
      checkoutOptions: {
        allowTipping: false,
        askForShippingAddress: false,
        redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success`,
      },
    };

    if (userEmail) {
      requestBody.prePopulatedData = {
        buyerEmail: userEmail,
      };
    }

    try {
      const response = await squareClient.checkout.paymentLinks.create(requestBody);

      if (!response.result || !response.result.paymentLink) {
        throw new Error('No payment link in Square response');
      }

      const paymentLink = response.result.paymentLink;
      const paymentUrl = paymentLink.url || paymentLink.longUrl || '';
      
      if (!paymentUrl) {
        throw new Error('Payment link created but no URL returned');
      }

      const payment = new this.paymentModel({
        clientId,
        squarePaymentId: paymentLink.id || `pending_${Date.now()}`,
        squareOrderId: paymentLink.orderId || '',
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

      console.log(`[PaymentService] ✅ Payment link created: ${paymentUrl}`);

      return {
        success: true,
        paymentLink: paymentUrl,
        paymentId: payment._id.toString(),
      };
    } catch (error: any) {
      console.error('[PaymentService] Error creating payment link:', error);
      
      let errorMessage = 'Failed to create payment link';
      
      if (error.statusCode === 404 || (error.errors && error.errors[0]?.code === 'NOT_FOUND')) {
        errorMessage = 
          'Square Checkout API endpoint not found. ' +
          'Please ensure the Checkout API is enabled in your Square application.';
      } else if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        errorMessage = error.errors[0].detail || error.errors[0].message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  async verifyWebhook(signature: string, payload: string, url: string) {
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

        payment.status = status === 'COMPLETED' ? 'completed' : 
                        status === 'FAILED' ? 'failed' : 'pending';
        payment.squareWebhookData = webhookData;
        
        if (payment.status === 'completed' && !payment.confirmationEmailSent) {
          payment.paidAt = new Date();
          payment.confirmationEmailSent = true;
          
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

  async getPaymentById(clientId: string, paymentId: string) {
    return this.paymentModel.findOne({ _id: paymentId, clientId }).exec();
  }

  async getPaymentBySessionId(clientId: string, sessionId: string) {
    return this.paymentModel.findOne({ clientId, sessionId }).sort({ createdAt: -1 }).exec();
  }

  async getAllPayments(clientId: string, limit = 50) {
    return this.paymentModel
      .find({ clientId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Process payment using Square Payments API with tokenized card
   */
  async processPayment(
    clientId: string,
    sourceId: string,
    amount: number,
    planType: string,
    sessionId: string,
    userEmail?: string,
    userName?: string,
    billingContact?: {
      givenName?: string;
      familyName?: string;
      email?: string;
      address?: {
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        countryCode?: string;
        postalCode?: string;
      };
    }
  ) {
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount: amount must be greater than 0');
    }

    const locationId = await this.getLocationId(clientId);
    const squareClient = await this.getSquareClientForTenant(clientId);
    
    const timestamp = Date.now().toString();
    const sessionHash = sessionId.slice(-10);
    const idempotencyKey = `pay_${sessionHash}_${timestamp}`.slice(0, 45);
    const amountInCents = BigInt(Math.round(amount * 100));

    try {
      const paymentRequest: any = {
        idempotencyKey,
        sourceId,
        amountMoney: {
          amount: amountInCents,
          currency: 'USD',
        },
        locationId,
        note: `WebChatSales - ${planType} Plan`,
      };

      if (billingContact) {
        paymentRequest.buyerEmailAddress = billingContact.email || userEmail;
        if (billingContact.givenName || billingContact.familyName) {
          paymentRequest.billingAddress = billingContact.address;
        }
      } else if (userEmail) {
        paymentRequest.buyerEmailAddress = userEmail;
      }

      const response = await squareClient.payments.create(paymentRequest);

      const logResponse = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'bigint') return obj.toString();
        if (Array.isArray(obj)) return obj.map(logResponse);
        if (typeof obj === 'object') {
          const result: any = {};
          for (const key in obj) {
            result[key] = logResponse(obj[key]);
          }
          return result;
        }
        return obj;
      };
      console.log('[PaymentService] Square API response:', JSON.stringify(logResponse(response), null, 2));

      let payment;
      if (response.result?.payment) {
        payment = response.result.payment;
      } else if (response.result && typeof response.result === 'object' && 'id' in response.result) {
        payment = response.result;
      } else if (response.payment) {
        payment = response.payment;
      } else {
        console.error('[PaymentService] Unexpected response structure:', logResponse(response));
        throw new Error('No payment in Square response. Response structure: ' + JSON.stringify(logResponse(response)));
      }
      
      let status = 'pending';
      if (payment.status === 'COMPLETED') {
        status = 'completed';
      } else if (payment.status === 'FAILED' || payment.status === 'CANCELED') {
        status = 'failed';
      }

      const paymentRecord = new this.paymentModel({
        clientId,
        squarePaymentId: payment.id || `pending_${Date.now()}`,
        squareOrderId: payment.orderId || '',
        sessionId,
        userEmail: userEmail || billingContact?.email,
        userName,
        amount,
        currency: 'USD',
        planType,
        status,
        confirmationEmailSent: false,
        paidAt: status === 'completed' ? new Date() : undefined,
      });
      await paymentRecord.save();

      if (status === 'completed' && (userEmail || billingContact?.email)) {
        try {
          await this.emailService.sendPaymentConfirmation(
            userEmail || billingContact?.email || '',
            userName || `${billingContact?.givenName || ''} ${billingContact?.familyName || ''}`.trim() || 'Customer',
            amount,
            planType
          );
          paymentRecord.confirmationEmailSent = true;
          await paymentRecord.save();
        } catch (emailError) {
          console.error('[PaymentService] Error sending confirmation email:', emailError);
        }
      }

      console.log(`[PaymentService] ✅ Payment processed: ${payment.id} - Status: ${status}`);

      return {
        success: true,
        paymentId: paymentRecord._id.toString(),
        squarePaymentId: payment.id,
        status,
        payment: paymentRecord,
      };
    } catch (error: any) {
      console.error('[PaymentService] Error processing payment:', error);
      
      if (error.body) {
        console.error('[PaymentService] Square API error body:', JSON.stringify(error.body, null, 2));
      }
      if (error.errors) {
        console.error('[PaymentService] Square API errors:', JSON.stringify(error.errors, null, 2));
      }
      if (error.rawResponse) {
        console.error('[PaymentService] Square API raw response:', JSON.stringify(error.rawResponse, null, 2));
      }
      
      let errorMessage = 'Failed to process payment';
      
      if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        errorMessage = error.errors[0].detail || error.errors[0].message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }
}
