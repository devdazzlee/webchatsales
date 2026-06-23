import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  const frontendUrl = process.env.FRONTEND_URL;
  const allowedOrigins = [
    'https://www.webchatsales.com',
    'https://www.webchatsales.com/',
    'https://webchatsales.com',
    'https://webchatsales.com/',
  ];

  if (frontendUrl) {
    allowedOrigins.push(frontendUrl);
    if (frontendUrl.endsWith('/')) {
      allowedOrigins.push(frontendUrl.slice(0, -1));
    } else {
      allowedOrigins.push(`${frontendUrl}/`);
    }
  }

  // In development, allow localhost origins
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000', 'http://localhost:3001');
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-side)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Embedded widget install pings and chat run from client domains
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }

      // Production: allow cross-origin for widget embed on client sites
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-widget-key', 'x-client-id'],
  });

  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  const port = process.env.PORT || 9000;
  if (!process.env.PORT) {
    console.warn('⚠️  PORT environment variable not set. Using default port 9000.');
  }

  // Check if demo mode is enabled
  const isDemoMode = process.env.DEMO_MODE === 'true' ||
                     process.env.DEMO_MODE === '1' ||
                     (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('webchatsales.com'));
  if (isDemoMode) {
    console.log('🎭 Demo mode enabled - WebChatSales.com chatbot (no lead qualification/booking)');
  }

  await app.listen(port);
  const serverUrl = process.env.SERVER_URL || (process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).origin.replace(':3000', `:${port}`) : `http://localhost:${port}`);
  console.log(`🚀 Backend server running on ${serverUrl}`);
}
bootstrap();
