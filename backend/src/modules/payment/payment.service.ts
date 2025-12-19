import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from '../../schemas/payment.schema';
import { EmailService } from '../email/email.service';

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
    
    // Location ID can be set directly in env vars to avoid API calls
    // If not set, will attempt to fetch from Square API
    // Previously retrieved: LWHJ1BYBBQMF0 (if token issues occur, set this directly)
    this.squareLocationId = 
      this.configService.get<string>('SQUARE_LOCATION_ID') || 
      process.env.SQUARE_LOCATION_ID || 
      '';
    
    this.squareEnvironment = 
      this.configService.get<string>('SQUARE_ENVIRONMENT') || 
      process.env.SQUARE_ENVIRONMENT || 
      'sandbox';

    // Initialize Square client - required, no fallback
    // Following Square's official documentation format
    if (!SquareClient || !SquareEnvironment) {
      throw new Error('Square SDK not available. Install with: npm install square');
    }

    // Square SDK initialization - matches official documentation
    this.client = new SquareClient({
      token: this.squareAccessToken,
      environment: this.squareEnvironment === 'production' 
        ? SquareEnvironment.Production 
        : SquareEnvironment.Sandbox,
    });
    
    console.log(`[PaymentService] ✅ Square SDK initialized (${this.squareEnvironment})`);
  }

  /**
   * Get location ID from Square API if not configured
   * Uses Square SDK locations API
   */
  private async getLocationId(): Promise<string> {
    // If location ID is already configured, return it
    if (this.squareLocationId) {
      return this.squareLocationId;
    }

    try {
      // Use Square SDK locations API - correct method: locations.list()
      const response = await this.client.locations.list();

      if (response.result && response.result.locations && response.result.locations.length > 0) {
        const locationId = response.result.locations[0].id;
        // Cache it for future use
        this.squareLocationId = locationId;
        console.log(`[PaymentService] ✅ Retrieved location ID: ${locationId}`);
        return locationId;
      }

      throw new Error('No locations found in Square account');
    } catch (error: any) {
      // Check if it's an authentication error
      if (error.statusCode === 401 || (error.errors && error.errors[0]?.code === 'UNAUTHORIZED')) {
        console.error('[PaymentService] Authentication error fetching location ID:', error.errors?.[0]?.detail || error.message);
        throw new Error(
          'Square access token authentication failed. ' +
          'Please verify your SQUARE_ACCESS_TOKEN is valid and has not expired. ' +
          'You can also set SQUARE_LOCATION_ID directly in environment variables. ' +
          'Get your location ID from: https://developer.squareup.com/apps (Sandbox > Locations)'
        );
      }
      
      console.error('[PaymentService] Error fetching location ID:', error);
      throw new Error(
        'Unable to fetch Square location ID. ' +
        'Please set SQUARE_LOCATION_ID in environment variables. ' +
        'Get your location ID from: https://developer.squareup.com/apps (Sandbox > Locations)'
      );
    }
  }

  /**
   * Create payment link using Square SDK
   * Follows Square's official documentation structure
   */
  async createPaymentLink(amount: number, planType: string, sessionId: string, userEmail?: string, userName?: string) {
    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount: amount must be greater than 0');
    }

    // Get location ID (required by Square API)
    const locationId = await this.getLocationId();
    
    // Generate unique idempotency key
    const idempotencyKey = `payment_${sessionId}_${Date.now()}`;
    
    // Convert amount to cents (Square requires amount in smallest currency unit)
    const amountInCents = Math.round(amount * 100);
    
    // Build request body according to Square SDK documentation
    const requestBody: any = {
      idempotencyKey,
      quickPay: {
        name: `WebChatSales - ${planType}`,
        priceMoney: {
          amount: BigInt(amountInCents), // Square SDK requires BigInt
          currency: 'USD',
        },
        locationId: locationId, // Required by Square API
      },
      checkoutOptions: {
        allowTipping: false,
        askForShippingAddress: false,
        redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success`,
      },
    };

    // Add pre-populated data if email is available
    if (userEmail) {
      requestBody.prePopulatedData = {
        buyerEmail: userEmail,
      };
    }

    try {
      // Use Square SDK checkout API - correct method: checkout.paymentLinks.create()
      const response = await this.client.checkout.paymentLinks.create(requestBody);

      if (!response.result || !response.result.paymentLink) {
        throw new Error('No payment link in Square response');
      }

      const paymentLink = response.result.paymentLink;
      
      // Extract payment URL
      const paymentUrl = paymentLink.url || paymentLink.longUrl || '';
      
      if (!paymentUrl) {
        throw new Error('Payment link created but no URL returned');
      }

      // Store payment record in database
      const payment = new this.paymentModel({
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
      
      // Extract meaningful error message
      let errorMessage = 'Failed to create payment link';
      
      // Handle 404 errors specifically - Checkout API might not be enabled
      if (error.statusCode === 404 || (error.errors && error.errors[0]?.code === 'NOT_FOUND')) {
        errorMessage = 
          'Square Checkout API endpoint not found. ' +
          'Please ensure the Checkout API is enabled in your Square application. ' +
          'Go to: https://developer.squareup.com/apps > Your App > API Access > Enable Checkout API';
      } else if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        errorMessage = error.errors[0].detail || error.errors[0].message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
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

  /**
   * Process payment using Square Payments API with tokenized card
   */
  async processPayment(
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
    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount: amount must be greater than 0');
    }

    // Get location ID (required by Square API)
    const locationId = await this.getLocationId();
    
    // Generate unique idempotency key (max 45 characters for Square)
    // Use hash of sessionId + timestamp to ensure uniqueness while staying under limit
    const timestamp = Date.now().toString();
    const sessionHash = sessionId.slice(-10); // Use last 10 chars of sessionId
    const idempotencyKey = `pay_${sessionHash}_${timestamp}`.slice(0, 45);
    
    // Convert amount to cents (Square requires amount in smallest currency unit)
    const amountInCents = BigInt(Math.round(amount * 100));

    try {
      // Build payment request
      const paymentRequest: any = {
        idempotencyKey,
        sourceId, // Token from Square Web Payments SDK
        amountMoney: {
          amount: amountInCents,
          currency: 'USD',
        },
        locationId,
        note: `WebChatSales - ${planType} Plan`,
      };

      // Add buyer information if available
      if (billingContact) {
        paymentRequest.buyerEmailAddress = billingContact.email || userEmail;
        if (billingContact.givenName || billingContact.familyName) {
          paymentRequest.billingAddress = billingContact.address;
        }
      } else if (userEmail) {
        paymentRequest.buyerEmailAddress = userEmail;
      }

      // Process payment using Square Payments API
      // In Square SDK v43, the method is 'create', not 'createPayment'
      const response = await this.client.payments.create(paymentRequest);

      // Log response for debugging (handle BigInt serialization)
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

      // Check response structure - Square SDK v43 may return payment directly in result
      let payment;
      if (response.result?.payment) {
        payment = response.result.payment;
      } else if (response.result && typeof response.result === 'object' && 'id' in response.result) {
        // Payment might be directly in result
        payment = response.result;
      } else if (response.payment) {
        // Payment might be at top level
        payment = response.payment;
      } else {
        console.error('[PaymentService] Unexpected response structure:', logResponse(response));
        throw new Error('No payment in Square response. Response structure: ' + JSON.stringify(logResponse(response)));
      }
      
      // Determine payment status
      let status = 'pending';
      if (payment.status === 'COMPLETED') {
        status = 'completed';
      } else if (payment.status === 'FAILED' || payment.status === 'CANCELED') {
        status = 'failed';
      }

      // Store payment record in database
      const paymentRecord = new this.paymentModel({
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

      // Send confirmation email if payment is completed
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
      
      // Log full error details for debugging
      if (error.body) {
        console.error('[PaymentService] Square API error body:', JSON.stringify(error.body, null, 2));
      }
      if (error.errors) {
        console.error('[PaymentService] Square API errors:', JSON.stringify(error.errors, null, 2));
      }
      if (error.rawResponse) {
        console.error('[PaymentService] Square API raw response:', JSON.stringify(error.rawResponse, null, 2));
      }
      
      // Extract meaningful error message
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
