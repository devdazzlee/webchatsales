import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe, INestApplication } from '@nestjs/common';

let cachedApp: INestApplication;

async function getApp(): Promise<INestApplication> {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });

    const allowedOrigins = [
      'https://www.webchatsales.com',
      'https://webchatsales.com',
      process.env.FRONTEND_URL,
    ].filter(Boolean) as string[];

    app.enableCors({
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        // Widget embed runs on client domains — allow cross-origin API calls
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-widget-key', 'x-client-id'],
    });

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.init();
    cachedApp = app;
  }
  return cachedApp;
}

export default async function handler(req: any, res: any) {
  const app = await getApp();
  const expressApp = app.getHttpAdapter().getInstance();
  return expressApp(req, res);
}
