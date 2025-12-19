# WebChatSales Backend API

NestJS backend with OpenAI streaming, MongoDB, and Nodemailer integration.

## Environment Setup

Create a `.env` file in the backend directory with:

```env
# OpenAI Configuration (REQUIRED)
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# MongoDB Configuration (REQUIRED)
MONGODB_URI=your_mongodb_connection_string_here

# Email Configuration (SMTP) - REQUIRED
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here

# Admin Email (Optional - falls back to SMTP_EMAIL)
ADMIN_EMAIL=your_admin_email@gmail.com

# Server Configuration
PORT=9000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Server URL (Optional)
SERVER_URL=http://localhost:9000
```

**⚠️ IMPORTANT:** Never commit your `.env` file to git. It contains sensitive API keys and credentials.

## Installation

```bash
cd backend
npm install
```

## Running the Server

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will run on `http://localhost:9000` (or the port specified in PORT env var)

## API Endpoints

### Chat Endpoints

- `POST /api/chat/start` - Start a new conversation
- `POST /api/chat/message` - Send a message (streaming response)
- `GET /api/chat/conversation/:sessionId` - Get conversation history
- `GET /api/chat/conversations` - Get all conversations
- `POST /api/chat/end` - End a conversation

### Email Endpoints

- `POST /api/email/send-beta-invite` - Send beta invite confirmation
- `POST /api/email/send-transcript` - Send conversation transcript

## Features

✅ OpenAI API integration (GPT-4o-mini or custom model)
✅ Real-time streaming responses
✅ MongoDB conversation storage
✅ Nodemailer email integration
✅ CORS enabled for frontend
✅ Session management
✅ Environment variable configuration (no hardcoded secrets)

