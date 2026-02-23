import { Controller, Post, Get, Body, Param, Query, Req, Headers, RawBodyRequest, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { ClientId, SkipTenant } from '../tenant/tenant.decorator';
import { TenantGuard } from '../tenant/tenant.guard';

@Controller('api/payment')
@UseGuards(TenantGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-link')
  async createPaymentLink(
    @ClientId() clientId: string,
    @Body() body: {
      amount: number;
      planType: string;
      sessionId: string;
      userEmail?: string;
      userName?: string;
    },
  ) {
    try {
      const result = await this.paymentService.createPaymentLink(
        clientId,
        body.amount,
        body.planType,
        body.sessionId,
        body.userEmail,
        body.userName,
      );
      return result;
    } catch (error: any) {
      console.error('[PaymentController] Error creating payment link:', error);
      return {
        success: false,
        error: error.message || 'Failed to create payment link',
      };
    }
  }

  @Post('webhook')
  @SkipTenant() // Webhooks come from Square, no tenant context in headers
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-square-signature') signature: string,
    @Body() body: any,
  ) {
    try {
      const webhookData = body || req.body;
      const payload = JSON.stringify(webhookData);
      const url = req.url;
      
      const isValid = await this.paymentService.verifyWebhook(signature, payload, url);
      
      if (!isValid) {
        console.warn('[PaymentController] Webhook signature verification failed');
      }

      await this.paymentService.handleWebhook(webhookData);
      return { success: true };
    } catch (error: any) {
      console.error('[PaymentController] Webhook error:', error);
      return { success: false, error: error.message };
    }
  }

  @Get(':paymentId')
  async getPayment(
    @ClientId() clientId: string,
    @Param('paymentId') paymentId: string,
  ) {
    const payment = await this.paymentService.getPaymentById(clientId, paymentId);
    return {
      success: true,
      payment,
    };
  }

  @Get('session/:sessionId')
  async getPaymentBySession(
    @ClientId() clientId: string,
    @Param('sessionId') sessionId: string,
  ) {
    const payment = await this.paymentService.getPaymentBySessionId(clientId, sessionId);
    return {
      success: true,
      payment,
    };
  }

  @Get('all')
  async getAllPayments(
    @ClientId() clientId: string,
    @Query('limit') limit?: string,
  ) {
    const payments = await this.paymentService.getAllPayments(
      clientId,
      limit ? parseInt(limit) : 50,
    );
    return {
      success: true,
      payments,
    };
  }

  @Post('process')
  async processPayment(
    @ClientId() clientId: string,
    @Body() body: {
      sourceId: string;
      amount: number;
      planType: string;
      sessionId: string;
      userEmail?: string;
      userName?: string;
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
      };
    },
  ) {
    try {
      const result = await this.paymentService.processPayment(
        clientId,
        body.sourceId,
        body.amount,
        body.planType,
        body.sessionId,
        body.userEmail,
        body.userName,
        body.billingContact,
      );
      return result;
    } catch (error: any) {
      console.error('[PaymentController] Error processing payment:', error);
      return {
        success: false,
        error: error.message || 'Failed to process payment',
      };
    }
  }
}
