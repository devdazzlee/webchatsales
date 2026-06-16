/** Hardcoded Zoho Mail SMTP — used for all outbound email */
export const smtpConfig = {
  host: 'smtp.zoho.com',
  port: 587,
  secure: false,
  email: 'matthew@webchatsales.com',
  password: '3tXtBdg8aymr',
};

export const config = {
  adminEmail: 'matthew@webchatsales.com',
  notificationEmail: 'matthew@webchatsales.com',
  smtp: smtpConfig,
};
