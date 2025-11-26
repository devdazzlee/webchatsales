# WebChat Sales Backend API

NestJS backend with OpenAI streaming, MongoDB, and Nodemailer integration.

## Environment Setup

Create a `.env` file in the backend directory with:

```env
# OpenAI Configuration
OPENAI_API_KEY=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

# MongoDB Configuration
MONGODB_URI=mongodb+srv://ahmed:ahmed@megajump.wlbdfxd.mongodb.net/webchatsales?retryWrites=true&w=majority

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=metaxoft5@gmail.com
SMTP_PASSWORD=kazuyskebbgupnbh

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

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

The server will run on `http://localhost:3001`

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

✅ OpenAI GPT-4 streaming responses
✅ MongoDB conversation storage
✅ Nodemailer email integration
✅ CORS enabled for frontend
✅ Session management

