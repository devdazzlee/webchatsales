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
    ];

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const existing = await tenantService.findBySlug(slug);

    if (!existing) {
      const created = await tenantService.createClient({
        name,
        ownerEmail,
        notificationEmail,
        allowedDomains: requiredDomains,
        plan: 'trial',
      });

      console.log('[seed:tenants] Created tenant:', {
        id: created._id?.toString(),
        name: created.name,
        slug: created.slug,
        widgetKey: created.widgetKey,
        allowedDomains: created.allowedDomains,
      });
      return;
    }

    const mergedDomains = Array.from(
      new Set([...(existing.allowedDomains || []), ...requiredDomains]),
    );

    const updated = await tenantService.updateClient(existing._id, {
      ownerEmail,
      allowedDomains: mergedDomains,
      notificationEmail,
      isActive: true,
    });

    console.log('[seed:tenants] Updated existing tenant:', {
      id: updated._id?.toString(),
      name: updated.name,
      slug: updated.slug,
      widgetKey: updated.widgetKey,
      allowedDomains: updated.allowedDomains,
    });
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('[seed:tenants] Failed:', error);
  process.exit(1);
});
