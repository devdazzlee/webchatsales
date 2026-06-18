/** Hardcoded Zoho Mail SMTP — used for all outbound email */
export const smtpConfig = {
  host: 'smtp.zoho.com',
  port: 587,
  secure: false,
  email: 'matthew@webchatsales.com',
  password: '3tXtBdg8aymr',
};

/** Default tenant for webchatsales.com marketing site + local dev */
export const siteConfig = {
  defaultWidgetKey: 'wcs_2e5df4e7e3d97d8fd7c366a8c81223d571b43aca631bfae8',
  platformSlug: 'webchatsales-default',
  marketingDomains: ['localhost', 'webchatsales.com', 'www.webchatsales.com'],
};

export const config = {
  adminEmail: 'matthew@webchatsales.com',
  notificationEmail: 'matthew@webchatsales.com',
  smtp: smtpConfig,
  site: siteConfig,
};
