# Admin Dashboard Login Credentials

## 🔐 Default Admin Credentials

### Development Environment
- **Username**: `admin`
- **Password**: `admin123`

### How to Login

1. Navigate to: `http://localhost:3000/login`
2. Enter credentials:
   - Username: `admin`
   - Password: `admin123`
3. Click "Login"
4. You'll be redirected to the dashboard

---

## 🔒 Change Credentials for Production

### Option 1: Environment Variables (Recommended)

Add to `backend/.env`:
```env
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
```

### Option 2: Hashed Password (More Secure)

1. Generate password hash:
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('your_password', 10).then(hash => console.log(hash));"
```

2. Add to `backend/.env`:
```env
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD_HASH=$2b$10$generated_hash_here
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
```

---

## 📝 Environment Variables

Add these to your `backend/.env` file:

```env
# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# JWT Secret (change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Optional: Use hashed password instead
# ADMIN_PASSWORD_HASH=$2b$10$...
```

---

## 🚨 Security Notes

1. **Change Default Password**: The default `admin123` is for development only
2. **Strong JWT Secret**: Use a long, random string (minimum 32 characters)
3. **Hashed Passwords**: For production, use `ADMIN_PASSWORD_HASH` with bcrypt
4. **HTTPS**: Always use HTTPS in production
5. **Token Expiration**: Tokens expire after 24 hours

---

## 🔄 Reset Password

If you need to reset the password:

1. Update `ADMIN_PASSWORD` in `.env` file
2. Restart the backend server
3. Login with new password

---

## ✅ Quick Test

Test login via API:
```bash
curl -X POST http://localhost:9000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

Expected response:
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

---

**Default Credentials**: `admin` / `admin123`  
**Login URL**: `/login`  
**Dashboard URL**: `/dashboard`

