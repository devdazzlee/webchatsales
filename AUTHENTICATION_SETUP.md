# Dashboard Authentication Setup

## ✅ Authentication Implemented

The dashboard now requires admin credentials to access. Here's what was implemented:

---

## 🔐 Backend Authentication

### Auth Module Created
- **Location**: `backend/src/modules/auth/`
- **Files**:
  - `auth.service.ts` - Handles login, token generation, verification
  - `auth.controller.ts` - Login and verify endpoints
  - `auth.guard.ts` - Protects dashboard routes
  - `auth.module.ts` - Module configuration

### Protected Routes
All `/api/dashboard/*` routes are now protected with `@UseGuards(AuthGuard)`

### Auth Endpoints

#### `POST /api/auth/login`
**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

#### `POST /api/auth/verify`
**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "valid": true
}
```

---

## 🎨 Frontend Authentication

### Login Page
- **Route**: `/login`
- **Location**: `frontend/app/login/page.tsx`
- **Features**:
  - Username/password form
  - Token storage in localStorage
  - Automatic redirect to dashboard on success
  - Error handling

### Protected Dashboard
- **Route**: `/dashboard`
- **Protection**: Checks for token on load
- **Behavior**:
  - If no token → redirects to `/login`
  - If invalid token → redirects to `/login`
  - If valid token → shows dashboard

### Auth Utility
- **Location**: `frontend/app/utils/auth.ts`
- **Functions**:
  - `getAuthHeaders()` - Adds Authorization header to requests
  - `handleAuthError()` - Handles 401 errors and redirects

### All Dashboard Components Updated
All dashboard components now include authentication headers:
- DashboardStats
- ConversationsList
- LeadsList
- TicketsList
- PaymentsList
- BookingsList
- ConversationDetail

---

## ⚙️ Environment Variables

Add these to your `.env` file in the backend directory:

```env
# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# For production, use hashed password:
# ADMIN_PASSWORD_HASH=$2b$10$hashed_password_here

# JWT Secret (change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

**⚠️ IMPORTANT**: 
- Change `ADMIN_PASSWORD` in production
- Use `ADMIN_PASSWORD_HASH` for production (generate with bcrypt)
- Change `JWT_SECRET` to a strong random string in production

---

## 📦 Dependencies Required

Install these in the backend:

```bash
cd backend
npm install jsonwebtoken bcrypt @types/jsonwebtoken @types/bcrypt
```

Or they're already added to `package.json` - just run:
```bash
npm install
```

---

## 🚀 Usage

### 1. Set Environment Variables
Add to `backend/.env`:
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key
```

### 2. Install Dependencies
```bash
cd backend
npm install
```

### 3. Start Backend
```bash
npm run start:dev
```

### 4. Access Dashboard
1. Navigate to `/dashboard` - will redirect to `/login`
2. Enter admin credentials
3. After login, redirected to dashboard
4. Token stored in localStorage (valid for 24 hours)

---

## 🔒 Security Features

1. **JWT Tokens**: Secure token-based authentication
2. **Token Expiration**: Tokens expire after 24 hours
3. **Protected Routes**: All dashboard API routes require valid token
4. **Automatic Redirect**: Invalid/expired tokens redirect to login
5. **Password Hashing**: Supports bcrypt hashed passwords (production)

---

## 🧪 Testing

### Test Login
```bash
curl -X POST http://localhost:9000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

### Test Protected Route (with token)
```bash
curl http://localhost:9000/api/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Without Token (should fail)
```bash
curl http://localhost:9000/api/dashboard/stats
# Expected: 401 Unauthorized
```

---

## 📝 Default Credentials

**Development Defaults:**
- Username: `admin`
- Password: `admin123`

**⚠️ CHANGE THESE IN PRODUCTION!**

---

## ✅ Status

- ✅ Backend authentication implemented
- ✅ Frontend login page created
- ✅ Dashboard protected
- ✅ All API calls include auth headers
- ✅ Automatic redirect on auth failure
- ✅ Token storage and management
- ✅ Logout functionality

**Ready for Production** (after changing default credentials)

---

**Last Updated**: December 2025

