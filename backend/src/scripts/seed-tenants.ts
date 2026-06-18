import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TenantService } from '../modules/tenant/tenant.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const tenantService = app.get(TenantService);

    const name = process.env.SEED_TENANT_NAME || 'WebChatSales Default';
    const ownerEmail = process.env.SEED_TENANT_OWNER_EMAIL || 'matthew@webchatsales.com';
    const notificationEmail = process.env.SEED_TENANT_NOTIFICATION_EMAIL || ownerEmail;

    const requiredDomains = [
      'http://localhost:3000/',
      'https://webchatsales.com/',
      'https://www.webchatsales.com/',
    ];

    const platform = await tenantService.ensurePlatformTenant({
      name,
      ownerEmail,
      notificationEmail,
      allowedDomains: requiredDomains,
    });

    console.log('[seed:tenants] Platform tenant ready:', {
      id: platform._id?.toString(),
      name: platform.name,
      slug: platform.slug,
      widgetKey: platform.widgetKey,
      isPlatformTenant: platform.isPlatformTenant,
      status: platform.status,
      allowedDomains: platform.allowedDomains,
    });
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('[seed:tenants] Failed:', error);
  process.exit(1);
});
