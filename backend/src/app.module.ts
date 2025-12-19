import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
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
export class AppModule {}