// Environment Configuration Example
// DO NOT COMMIT ACTUAL SECRETS TO GIT
// Copy this template to .env in the backend directory and fill in your actual values

export const envConfigExample = {
  // OpenAI Configuration (REQUIRED)
  OPENAI_API_KEY: 'your_openai_api_key_here',
  OPENAI_MODEL: 'gpt-4o-mini',
  
  // MongoDB Configuration (REQUIRED)
  MONGODB_URI: 'your_mongodb_connection_string_here',
  
  // Email Configuration (SMTP) - REQUIRED
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_EMAIL: 'your_email@gmail.com',
  SMTP_PASSWORD: 'your_app_password_here',
  
  // Admin Email (Optional - falls back to SMTP_EMAIL)
  ADMIN_EMAIL: 'your_admin_email@gmail.com',
  
  // Server Configuration
  PORT: '9000',
  NODE_ENV: 'development',
  FRONTEND_URL: 'http://localhost:3000',
  SERVER_URL: 'http://localhost:9000',
};

// Create .env file with these values (replace placeholders with actual secrets)
// IMPORTANT: Never commit .env file to git - it contains sensitive information

