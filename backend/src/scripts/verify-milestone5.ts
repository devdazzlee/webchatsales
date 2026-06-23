import { ClientSchema } from '../schemas/client.schema';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function run(): Promise<void> {
  const paths = ClientSchema.paths;

  const deploymentFields = [
    'jobDescription',
    'servicesOffered',
    'installVerified',
    'lastWidgetPingAt',
    'lastWidgetPingDomain',
    'testActivatedAt',
    'activatedAt',
    'activationLogs',
  ];

  for (const field of deploymentFields) {
    assert(!!paths[field], `Client schema missing deployment field: ${field}`);
  }

  const { TenantService } = await import('../modules/tenant/tenant.service');
  const service = TenantService.prototype;
  const requiredMethods = [
    'activateTest',
    'activateLive',
    'deactivateDeployment',
    'recordWidgetPing',
    'getDeploymentStatus',
    'getActivationLogs',
    'buildWidgetLink',
    'buildWidgetEmbedScript',
    'validateLiveTenantDomain',
  ];

  for (const method of requiredMethods) {
    assert(typeof (service as any)[method] === 'function', `TenantService missing method: ${method}`);
  }

  const frontendBase = 'https://app.webchatsales.com';
  process.env.FRONTEND_URL = frontendBase;

  // Instantiate with mock model for URL builders
  const mockModel = {} as any;
  const tenantService = new TenantService(mockModel);
  const link = tenantService.buildWidgetLink('wcs_test123');
  const embed = tenantService.buildWidgetEmbedScript('wcs_test123');

  assert(link.includes('widgetKey=wcs_test123'), 'Widget link must include widget key');
  assert(link.startsWith(frontendBase), 'Widget link must use FRONTEND_URL');
  assert(embed.includes('abby-widget.js'), 'Embed script must reference abby-widget.js');
  assert(embed.includes('data-widget-key="wcs_test123"'), 'Embed script must include widget key');

  console.log('Milestone 5 verification passed.');
  console.log('- Client schema includes deployment & activation fields.');
  console.log('- TenantService exposes activation, ping, and embed helpers.');
  console.log('- Widget link and embed snippet generation works.');
}

run().catch((error) => {
  console.error('Milestone 5 verification failed:', error.message);
  process.exit(1);
});
