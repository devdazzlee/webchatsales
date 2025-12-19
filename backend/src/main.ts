import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    console.warn('⚠️  FRONTEND_URL environment variable not set. CORS may not work correctly.');
  }
  app.enableCors({
    origin: frontendUrl || '*', // Allow all origins if not set (for development)
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

