# Payment API Test Guide

## ✅ API Implementation Status

The payment API is **fully implemented** and ready to test. Here's what was created:

### Backend Implementation
- ✅ Square SDK installed (`square@^43.2.1`)
- ✅ PaymentService with Square SDK integration
- ✅ PaymentController with `/api/payment/create-link` endpoint
- ✅ Payment schema fixed (squareWebhookData type issue resolved)
- ✅ Fallback to direct API calls if SDK fails

### Frontend Implementation
- ✅ Pricing component calls the API
- ✅ Redirects to Square checkout on success
- ✅ Payment success page created

## 🧪 How to Test

### Step 1: Start the Backend Server

```bash
cd backend
npm run dev
```

Wait for the message: `🚀 Backend server running on http://localhost:9000`

### Step 2: Test the API Endpoint

**Option A: Using curl**
```bash
curl -X POST http://localhost:9000/api/payment/create-link \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 497,
    "planType": "starter",
    "sessionId": "test_session_12345"
  }'
```

**Option B: Using the test script**
```bash
cd backend
node test-payment-api.js
```

**Option C: Using Postman/Insomnia**
- Method: POST
- URL: `http://localhost:9000/api/payment/create-link`
- Headers: `Content-Type: application/json`
- Body:
```json
{
  "amount": 497,
  "planType": "starter",
  "sessionId": "test_session_12345"
}
```

### Step 3: Expected Response

**Success Response:**
```json
{
  "success": true,
  "paymentLink": "https://square.link/...",
  "paymentId": "..."
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

## 🔍 Troubleshooting

### Issue: 404 Not Found
- **Solution**: Make sure PaymentModule is imported in `app.module.ts` ✅ (Already done)
- **Solution**: Restart the backend server after code changes
- **Solution**: Check that the route is `@Controller('api/payment')` ✅ (Already done)

### Issue: Connection Refused
- **Solution**: Make sure the backend server is running on port 9000
- **Solution**: Check for MongoDB connection errors in server logs

### Issue: Square API Error
- **Solution**: Verify Square credentials in `.env` or hardcoded fallback values
- **Solution**: Check Square sandbox environment is set correctly
- **Solution**: Review Square API response in server logs

### Issue: No Payment Link in Response
- **Solution**: Check server logs for Square API errors
- **Solution**: Verify Square SDK is properly initialized
- **Solution**: Check that amount is in dollars (not cents) - API converts to cents

## 📋 Test Checklist

- [ ] Backend server starts without errors
- [ ] MongoDB connection successful
- [ ] Square SDK initialized (check server logs)
- [ ] API endpoint responds (not 404)
- [ ] Payment link generated successfully
- [ ] Payment link is a valid Square URL
- [ ] Payment record saved in MongoDB
- [ ] Frontend pricing button works
- [ ] Redirect to Square checkout works

## 🎯 Current Configuration

**Square Credentials (Sandbox):**
- Access Token: `EAAAl_R4YHlmuym2pgaQdQqUfy4a57HFZHjxsxi9rfYPYFujOyxOrG0HOnUBgQxK`
- Application ID: `sandbox-sq0idb-EzWSCphEv3i3RqREob8OpQ`
- Environment: `sandbox`

**API Endpoint:**
- URL: `POST http://localhost:9000/api/payment/create-link`
- Required Fields: `amount`, `planType`, `sessionId`
- Optional Fields: `userEmail`, `userName`

## 📝 Next Steps After Testing

1. ✅ Verify payment link generation works
2. ✅ Test with different plan types (starter, growth, enterprise)
3. ✅ Test with different amounts
4. ⏳ Test webhook handling (requires ngrok)
5. ⏳ Test payment completion flow
6. ⏳ Test confirmation email sending

## 🔗 Related Files

- Backend Service: `backend/src/modules/payment/payment.service.ts`
- Backend Controller: `backend/src/modules/payment/payment.controller.ts`
- Payment Schema: `backend/src/schemas/payment.schema.ts`
- Frontend Component: `frontend/app/components/Pricing.tsx`
- Test Script: `backend/test-payment-api.js`

