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
  ];
  
  if (frontendUrl) {
    allowedOrigins.push(frontendUrl);
    // Also add without trailing slash if it has one
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
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // In development, allow all origins
      if (process.env.NODE_ENV === 'development' && !frontendUrl) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
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
  await app.listen(port);
  const serverUrl = process.env.SERVER_URL || (process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).origin.replace(':3000', `:${port}`) : `http://localhost:${port}`);
  console.log(`🚀 Backend server running on ${serverUrl}`);
}
bootstrap();

