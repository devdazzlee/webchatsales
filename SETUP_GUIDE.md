# WebChat Sales - Complete Setup Guide

## Project Structure

```
webchatsales/
├── backend/          # NestJS Backend API
├── webchatsales/     # Next.js Frontend
```

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create .env file (copy from .env.example or create manually)
cat > .env << EOF
# OpenAI Configuration (REQUIRED)
OPENAI_API_KEY=your_openai_api_key_here

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
FRONTEND_URL=http://localhost:3000
SERVER_URL=http://localhost:9000
EOF

# Install dependencies
npm install

# Start backend server
npm run start:dev
```

Backend will run on `http://localhost:3001`

### 2. Frontend Setup

```bash
cd webchatsales

# Install dependencies (if not already installed)
yarn install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:9000" > .env.local

# Start frontend server
yarn dev
```

Frontend will run on `http://localhost:3000`

## Features Implemented

✅ **OpenAI Integration**
- GPT-4 streaming responses
- Real-time chat experience
- Context-aware conversations

✅ **MongoDB Integration**
- Conversation storage
- Session management
- Message history

✅ **Nodemailer Integration**
- Beta invite confirmation emails
- Conversation transcript emails
- HTML email templates

✅ **Frontend Chatbot**
- Neon-green "Chat with Abby" button
- Streaming responses
- Mobile responsive
- Dark theme matching

## API Endpoints

### Chat API
- `POST /api/chat/start` - Initialize conversation
- `POST /api/chat/message` - Send message (streaming)
- `GET /api/chat/conversation/:sessionId` - Get conversation

### Email API
- `POST /api/email/send-beta-invite` - Send beta confirmation
- `POST /api/email/send-transcript` - Send conversation transcript

## Testing

1. Open `http://localhost:3000`
2. Click the green "Chat with Abby" button (bottom-right)
3. Start chatting - responses stream in real-time
4. Submit beta form - check email inbox for confirmation

## Troubleshooting

### Backend won't start
- Check `.env` file exists and has all required variables
- Verify `MONGODB_URI` is set correctly (required)
- Verify `OPENAI_API_KEY` is set (required)
- Verify `SMTP_EMAIL` and `SMTP_PASSWORD` are set (required)
- Check port 9000 is not in use (or update PORT env var)

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` in `.env.local` matches backend port
- Check backend is running (default port 9000)
- Check browser console for CORS errors

### Emails not sending
- Verify SMTP credentials in `.env`
- Check Gmail app password is correct
- Check spam folder

## Production Deployment

1. Set `NODE_ENV=production` in backend `.env`
2. Update `FRONTEND_URL` to production domain
3. Build frontend: `yarn build`
4. Build backend: `npm run build`
5. Start with PM2 or similar process manager

