import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatModule } from './modules/chat/chat.module';
import { EmailModule } from './modules/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb+srv://ahmed:ahmed@megajump.wlbdfxd.mongodb.net/webchatsales?retryWrites=true&w=majority'),
    ChatModule,
    EmailModule,
  ],
})
export class AppModule {}

