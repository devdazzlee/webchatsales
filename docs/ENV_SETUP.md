# Environment Variables Setup Guide

This guide explains how to set up environment variables for both the frontend and backend applications.

## 📁 File Structure

```
webchatsales/
├── backend/
│   ├── .env.example          # Template for backend environment variables
│   └── .env                   # Your actual backend environment variables (create this)
├── frontend/
│   ├── .env.example           # Template for frontend environment variables
│   └── .env.local             # Your actual frontend environment variables (create this)
└── ENV_SETUP.md               # This file
```

## 🔧 Backend Setup

### Step 1: Create Backend .env File

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Copy the example file:
   ```bash
   cp .env.example .env
   ```

3. Open `.env` and fill in your actual values (see below for details)

### Backend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | ✅ Yes | Your OpenAI API key | `sk-...` |
| `OPENAI_MODEL` | ✅ Yes | OpenAI model to use | `gpt-4o-mini` |
| `MONGODB_URI` | ✅ Yes | MongoDB connection string | `mongodb://...` |
| `SMTP_HOST` | ✅ Yes | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | ✅ Yes | SMTP server port | `587` |
| `SMTP_EMAIL` | ✅ Yes | Email address for sending emails | `your@email.com` |
| `SMTP_PASSWORD` | ✅ Yes | SMTP password/app password | `your_password` |
| `ADMIN_EMAIL` | ❌ No | Admin email (falls back to SMTP_EMAIL) | `admin@email.com` |
| `PORT` | ❌ No | Server port (default: 9000) | `9000` |
| `NODE_ENV` | ❌ No | Environment (development/production) | `development` |
| `FRONTEND_URL` | ❌ No | Frontend URL for CORS | `http://localhost:3000` |
| `SERVER_URL` | ❌ No | Backend server URL | `http://localhost:9000` |
| `SQUARE_ACCESS_TOKEN` | ✅ Yes | Square API access token | `EAAAl_...` |
| `SQUARE_APPLICATION_ID` | ✅ Yes | Square application ID | `sandbox-sq0idb-...` |
| `SQUARE_ENVIRONMENT` | ✅ Yes | Square environment (sandbox/production) | `sandbox` |
| `SQUARE_SECRET` | ✅ Yes | Square webhook secret | `sandbox-sq0csb-...` |
| `SQUARE_LOCATION_ID` | ❌ No | Square location ID (auto-fetched if not set) | `LWHJ1BYBBQMF0` |

### Getting Backend Credentials

#### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy and paste into `OPENAI_API_KEY`

#### MongoDB Connection String
- **Local MongoDB**: `mongodb://localhost:27017/webchatsales`
- **MongoDB Atlas**: 
  1. Go to https://www.mongodb.com/cloud/atlas
  2. Create a cluster
  3. Get connection string from "Connect" button
  4. Format: `mongodb+srv://username:password@cluster.mongodb.net/database`

#### SMTP Credentials (Gmail Example)
1. Enable 2-Step Verification on your Google Account
2. Go to Google Account > Security > App passwords
3. Generate an app password for "Mail"
4. Use that password in `SMTP_PASSWORD`

#### Square Credentials
1. Go to https://developer.squareup.com/apps
2. Create or select your application
3. Get credentials from the application dashboard:
   - **Sandbox**: Use sandbox credentials for testing
   - **Production**: Use production credentials for live payments

## 🎨 Frontend Setup

### Step 1: Create Frontend .env.local File

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

3. Open `.env.local` and fill in your actual values

### Frontend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | ✅ Yes | Backend API URL | `http://localhost:9000` |
| `NEXT_PUBLIC_SQUARE_APPLICATION_ID` | ✅ Yes | Square application ID (public) | `sandbox-sq0idb-...` |
| `NEXT_PUBLIC_SQUARE_LOCATION_ID` | ✅ Yes | Square location ID (public) | `LWHJ1BYBBQMF0` |

### Important Notes for Frontend

⚠️ **Security Warning**: 
- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Only use `NEXT_PUBLIC_` for values that are safe to expose publicly
- Never put sensitive keys (like access tokens) in `NEXT_PUBLIC_` variables
- Square Application ID and Location ID are safe to expose (they're public keys)

## 🚀 Quick Start

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your credentials
npm install
npm run dev
```

## 🔒 Security Best Practices

1. **Never commit `.env` or `.env.local` files to Git**
   - They are already in `.gitignore`
   - Double-check before committing

2. **Use different credentials for development and production**
   - Development: Use sandbox/test credentials
   - Production: Use production credentials

3. **Rotate credentials regularly**
   - Especially if they're exposed or compromised

4. **Use environment variable management in production**
   - Vercel: Project Settings > Environment Variables
   - Netlify: Site Settings > Environment Variables
   - AWS: Use Secrets Manager or Parameter Store
   - Heroku: Use Config Vars

## 🧪 Testing Your Setup

### Backend
```bash
cd backend
npm run dev
# Should see: "🚀 Backend server running on http://localhost:9000"
```

### Frontend
```bash
cd frontend
npm run dev
# Should see: "Ready on http://localhost:3000"
```

## 📝 Current Default Values (Sandbox)

### Backend
- Square Access Token: `EAAAl_R4YHlmuym2pgaQdQqUfy4a57HFZHjxsxi9rfYPYFujOyxOrG0HOnUBgQxK`
- Square Application ID: `sandbox-sq0idb-EzWSCphEv3i3RqREob8OpQ`
- Square Location ID: `LWHJ1BYBBQMF0`
- Square Environment: `sandbox`

### Frontend
- API URL: `http://localhost:9000`
- Square Application ID: `sandbox-sq0idb-EzWSCphEv3i3RqREob8OpQ`
- Square Location ID: `LWHJ1BYBBQMF0`

## ❓ Troubleshooting

### Backend won't start
- Check that all required environment variables are set
- Verify MongoDB connection string is correct
- Ensure OpenAI API key is valid
- Check that PORT is not already in use

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` matches your backend URL
- Check CORS settings in backend
- Ensure backend is running

### Payment not working
- Verify Square credentials are correct
- Check Square environment (sandbox vs production)
- Ensure Location ID is correct
- Check browser console for errors

## 📚 Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Square Developer Documentation](https://developer.squareup.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [MongoDB Connection Strings](https://www.mongodb.com/docs/manual/reference/connection-string/)

