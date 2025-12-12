# Square Checkout Integration - Complete Guide

## ✅ Integration Status: COMPLETE

The Square Checkout integration is now fully implemented using the official Square SDK.

## 📦 Installed Dependencies

- **Square SDK**: `square@^43.2.1` (installed via yarn)
- The SDK provides both TypeScript types and the official Square API client

## 🔧 Implementation Details

### Backend (`/backend/src/modules/payment/`)

1. **PaymentService** (`payment.service.ts`):
   - Uses Square SDK with fallback to direct API calls
   - Creates payment links via `checkoutApi.createPaymentLink()`
   - Stores payment records in MongoDB
   - Handles webhooks for payment status updates
   - Sends confirmation emails on successful payment

2. **PaymentController** (`payment.controller.ts`):
   - `POST /api/payment/create-link` - Creates Square checkout link
   - `POST /api/payment/webhook` - Handles Square webhooks
   - `GET /api/payment/:paymentId` - Get payment by ID
   - `GET /api/payment/session/:sessionId` - Get payment by session
   - `GET /api/payment/all` - Get all payments

### Frontend (`/frontend/app/components/Pricing.tsx`)

- Pricing buttons call `/api/payment/create-link`
- Redirects to Square checkout page on success
- Shows loading state during API call
- Handles errors gracefully

### Payment Success Page (`/frontend/app/payment-success/page.tsx`)

- Displays success/error status after payment
- Provides return to home button
- Shows confirmation message

## 🔑 Environment Variables

Add these to your `.env` file:

```env
# Square Configuration
SQUARE_ACCESS_TOKEN=EAAAl_R4YHlmuym2pgaQdQqUfy4a57HFZHjxsxi9rfYPYFujOyxOrG0HOnUBgQxK
SQUARE_APPLICATION_ID=sandbox-sq0idb-EzWSCphEv3i3RqREob8OpQ
SQUARE_ENVIRONMENT=sandbox
SQUARE_LOCATION_ID=  # Optional - get from Square Dashboard

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3000
```

## 🚀 How It Works

1. **User clicks pricing button** → Frontend calls `/api/payment/create-link`
2. **Backend creates Square payment link** → Uses Square SDK or direct API
3. **Payment link returned** → Frontend redirects to Square checkout
4. **User completes payment** → Square processes payment
5. **Webhook notification** → Square sends webhook to `/api/payment/webhook`
6. **Payment status updated** → Database updated, confirmation email sent
7. **User redirected** → Returns to `/payment-success` page

## 🧪 Testing

### 1. Test Payment Link Creation

```bash
# Start backend
cd backend
npm run dev

# In another terminal, test the endpoint
curl -X POST http://localhost:9000/api/payment/create-link \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 497,
    "planType": "starter",
    "sessionId": "test_session_123"
  }'
```

Expected response:
```json
{
  "success": true,
  "paymentLink": "https://square.link/...",
  "paymentId": "..."
}
```

### 2. Test Frontend Integration

1. Start both servers:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && yarn dev
   ```

2. Navigate to `http://localhost:3000`
3. Scroll to pricing section
4. Click "Start Starter" or "Choose Growth" button
5. Should redirect to Square checkout page

### 3. Test Webhook (using ngrok)

1. Start ngrok:
   ```bash
   ngrok http 9000
   ```

2. Configure webhook URL in Square Dashboard:
   - Go to Square Developer Dashboard
   - Add webhook URL: `https://your-ngrok-url.ngrok.io/api/payment/webhook`
   - Select events: `payment.created`, `payment.updated`

3. Complete a test payment
4. Check backend logs for webhook processing

## 🔍 Troubleshooting

### Issue: 404 Error on `/api/payment/create-link`

**Solution:**
- Verify PaymentModule is imported in `app.module.ts` ✅
- Check backend is running on port 9000
- Verify route is `@Controller('api/payment')` ✅

### Issue: Square SDK not found

**Solution:**
```bash
cd backend
yarn add square
```

### Issue: Payment link not redirecting

**Solution:**
- Check browser console for errors
- Verify `API_BASE_URL` in Pricing component
- Check network tab for API response
- Ensure `paymentLink` is in response

### Issue: Webhook not working

**Solution:**
- Verify webhook URL is accessible (use ngrok)
- Check Square webhook signature verification
- Review backend logs for webhook errors
- Ensure raw body parsing is enabled in `main.ts`

## 📝 Square Sandbox Test Cards

Use these test cards in Square Sandbox:

- **Success**: `4111 1111 1111 1111`
- **Decline**: `4000 0000 0000 0002`
- **CVV**: Any 3 digits
- **Expiry**: Any future date
- **ZIP**: Any 5 digits

## 🎯 Next Steps

1. ✅ Square SDK installed
2. ✅ Payment link creation implemented
3. ✅ Frontend integration complete
4. ✅ Payment success page created
5. ⏳ Webhook testing (requires ngrok)
6. ⏳ Production credentials setup

## 📚 Resources

- [Square Checkout API Docs](https://developer.squareup.com/docs/checkout-api)
- [Square Node.js SDK](https://github.com/square/square-nodejs-sdk)
- [Square Webhooks Guide](https://developer.squareup.com/docs/webhooks/overview)

