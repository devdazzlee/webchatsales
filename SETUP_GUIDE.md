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

# Create .env file (copy from env.config.ts or create manually)
cat > .env << EOF
OPENAI_API_KEY=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
MONGODB_URI=mongodb+srv://ahmed:ahmed@megajump.wlbdfxd.mongodb.net/webchatsales?retryWrites=true&w=majority
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=metaxoft5@gmail.com
SMTP_PASSWORD=kazuyskebbgupnbh
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
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
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

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
- Verify MongoDB connection string is correct
- Check port 3001 is not in use

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Check backend is running on port 3001
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

