import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TenantModule } from './modules/tenant/tenant.module';
import { TenantMiddleware } from './modules/tenant/tenant.middleware';
import { ChatModule } from './modules/chat/chat.module';
import { EmailModule } from './modules/email/email.module';
import { LeadModule } from './modules/lead/lead.module';
import { SupportModule } from './modules/support/support.module';
import { PaymentModule } from './modules/payment/payment.module';
import { BookingModule } from './modules/booking/booking.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    MongooseModule.forRoot(
      (() => {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
          throw new Error('MONGODB_URI environment variable is required. Please set it in your .env file.');
        }
        return mongoUri;
      })(),
      {
        retryWrites: true,
        w: 'majority',
      }
    ),
    // TenantModule MUST be imported first — it's @Global() and provides
    // TenantService + TenantGuard to all other modules
    TenantModule,
    ChatModule,
    EmailModule,
    LeadModule,
    SupportModule,
    PaymentModule,
    BookingModule,
    DashboardModule,
    AuthModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply TenantMiddleware to ALL routes — resolves tenant context
    // from x-widget-key, x-client-id, query param, or Origin header.
    // Tenant context is optional at middleware level; guards enforce it per-route.
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}