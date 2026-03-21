import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';

let cachedApp: INestApplication;

function setupCors(app: INestApplication) {
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

  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000', 'http://localhost:3001');
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (process.env.NODE_ENV === 'development' && !frontendUrl) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });
}

function setupPipes(app: INestApplication) {
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
}

async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  setupCors(app);
  setupPipes(app);
  return app;
}

// --- Vercel serverless handler ---
export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    cachedApp = await createApp();
    await cachedApp.init();
  }
  const expressApp = cachedApp.getHttpAdapter().getInstance();
  return expressApp(req, res);
}

// --- Local development server ---
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  (async () => {
    const app = await createApp();

    const port = process.env.PORT || 9000;
    if (!process.env.PORT) {
      console.warn('⚠️  PORT environment variable not set. Using default port 9000.');
    }

    const isDemoMode = process.env.DEMO_MODE === 'true' ||
                       process.env.DEMO_MODE === '1' ||
                       (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('webchatsales.com'));
    if (isDemoMode) {
      console.log('🎭 Demo mode enabled - WebChatSales.com chatbot (no lead qualification/booking)');
    }

    await app.listen(port);
    const serverUrl = process.env.SERVER_URL || (process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).origin.replace(':3000', `:${port}`) : `http://localhost:${port}`);
    console.log(`🚀 Backend server running on ${serverUrl}`);
  })();
}
