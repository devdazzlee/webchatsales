# End-to-End Testing Guide - Milestone 2

## ✅ Verification Checklist

### 1. Message Saving Verification
**Status**: ✅ CONFIRMED
- All user messages are saved via `addMessage(sessionId, 'user', userMessage)` at line 110
- All assistant responses are saved via `addMessage(sessionId, 'assistant', fullResponse)` at line 197
- Every message includes: role, content, timestamp
- Messages are stored in MongoDB `conversations` collection
- All messages are available for analytics, training, and referral system

### 2. Lead Handling Testing

#### Test 1: Basic Lead Qualification
1. Open chat widget (bottom-right)
2. Start conversation: "Hi, I'm interested in your service"
3. Provide information when asked:
   - Name: "John Doe"
   - Email: "john@example.com"
   - Phone: "+1234567890"
   - Service need: "Customer service chatbot"
   - Timing: "ASAP"
   - Budget: "$500-1000"

**Expected Results:**
- ✅ Lead automatically created in MongoDB
- ✅ Admin receives email notification
- ✅ Lead appears in dashboard `/dashboard?tab=leads`
- ✅ Lead status is "qualified" when all info provided

#### Test 2: Partial Lead Information
1. Start conversation
2. Provide only name and email
3. Don't provide phone or service need

**Expected Results:**
- ✅ Lead created with available information
- ✅ Status remains "new" until fully qualified
- ✅ Lead still appears in dashboard

### 3. Support Ticket Testing

#### Test 1: Automatic Ticket Creation
1. Open chat
2. Express a problem: "I'm having an issue with the login" or "This is broken" or "I'm frustrated"
3. Continue conversation about the problem

**Expected Results:**
- ✅ Support ticket automatically created
- ✅ Ticket ID generated (format: TKT-{timestamp}-{random})
- ✅ Sentiment analyzed (negative/very_negative)
- ✅ Priority set based on keywords (high if urgent keywords detected)
- ✅ Full transcript saved
- ✅ Ticket appears in dashboard `/dashboard?tab=tickets`
- ✅ Ticket status is "open"

#### Test 2: Multiple Issues
1. Start new conversation
2. Express different types of problems
3. Check ticket creation

**Expected Results:**
- ✅ Only one ticket per session (prevents duplicates)
- ✅ Ticket includes all conversation context

### 4. Payment Integration Testing

#### Test 1: Create Payment Link
```bash
curl -X POST http://localhost:9000/api/payment/create-link \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 279.00,
    "planType": "founder_special",
    "sessionId": "test_session_123",
    "userEmail": "test@example.com",
    "userName": "Test User"
  }'
```

**Expected Results:**
- ✅ Payment link returned
- ✅ Payment record created in MongoDB with status "pending"
- ✅ Payment appears in dashboard `/dashboard?tab=payments`

#### Test 2: Webhook Processing
1. Configure Square webhook to point to: `https://yahir-unscorched-pierre.ngrok-free.dev/api/payment/webhook`
2. Complete a test payment in Square sandbox
3. Check webhook received

**Expected Results:**
- ✅ Webhook received and processed
- ✅ Payment status updated to "completed"
- ✅ Confirmation email sent to user
- ✅ Payment record updated in MongoDB

### 5. Booking Testing

#### Test 1: Create Booking
```bash
curl -X POST http://localhost:9000/api/book \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test_session_123",
    "timeSlot": "2025-12-15T14:00:00Z",
    "userEmail": "test@example.com",
    "userName": "Test User",
    "userPhone": "+1234567890"
  }'
```

**Expected Results:**
- ✅ Booking created in MongoDB
- ✅ Booking appears in dashboard `/dashboard?tab=bookings`
- ✅ Status is "scheduled"

#### Test 2: Get Availability
```bash
curl http://localhost:9000/api/book/availability?date=2025-12-15
```

**Expected Results:**
- ✅ Returns array of available time slots
- ✅ Slots are in 1-hour intervals (9 AM - 5 PM)

### 6. Dashboard Testing

#### Test 1: Overview Page
1. Navigate to `/dashboard`
2. Check overview tab

**Expected Results:**
- ✅ All statistics displayed correctly
- ✅ Charts render (conversations over time, leads by status, etc.)
- ✅ Recent activity shows latest items
- ✅ All metrics match database counts

#### Test 2: Conversations List
1. Navigate to `/dashboard?tab=conversations`
2. Click on a conversation

**Expected Results:**
- ✅ All conversations listed
- ✅ Pagination works
- ✅ Clicking conversation shows full details
- ✅ All messages displayed with timestamps
- ✅ Related lead/ticket/booking/payment shown if available

#### Test 3: Leads List
1. Navigate to `/dashboard?tab=leads`
2. Filter by status

**Expected Results:**
- ✅ All leads listed
- ✅ Status filter works
- ✅ Pagination works
- ✅ All lead information displayed

#### Test 4: Tickets List
1. Navigate to `/dashboard?tab=tickets`
2. Filter by status

**Expected Results:**
- ✅ All tickets listed
- ✅ Priority and sentiment displayed
- ✅ Status filter works
- ✅ Pagination works

#### Test 5: Payments List
1. Navigate to `/dashboard?tab=payments`
2. Filter by status

**Expected Results:**
- ✅ All payments listed
- ✅ Amount and plan type displayed
- ✅ Status filter works
- ✅ Revenue calculations correct

#### Test 6: Bookings List
1. Navigate to `/dashboard?tab=bookings`
2. Filter by status

**Expected Results:**
- ✅ All bookings listed
- ✅ Time slots displayed correctly
- ✅ Status filter works
- ✅ Pagination works

### 7. UI/UX Testing

#### Test 1: Removed Buttons
1. Check header - should NOT have "Talk to Abby" button
2. Check footer - should NOT have "Chat with Abby" button

**Expected Results:**
- ✅ Only bottom-right widget button visible
- ✅ No duplicate buttons

#### Test 2: Founder Special Banner
1. Check Hero section
2. Check Pricing section

**Expected Results:**
- ✅ Banner displays: "Founder Special: $279 for first month (regular $479/mo) • 4 spots left"
- ✅ Banner visible in both sections

#### Test 3: Functional Buttons
1. Click "See Pricing" - should scroll to pricing
2. Click "See it in Action" - should open chat
3. Click pricing plan buttons - should open chat with plan question

**Expected Results:**
- ✅ All buttons functional
- ✅ No dead links

### 8. Widget Testing

#### Test 1: Embeddable Widget
1. Create test HTML file:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Widget</title>
</head>
<body>
  <h1>Test Page</h1>
  <script src="http://localhost:3000/abby-widget.js"></script>
</body>
</html>
```

**Expected Results:**
- ✅ Widget loads in bottom-right
- ✅ Button appears
- ✅ Clicking opens chat
- ✅ No CSS conflicts

### 9. Data Integrity Testing

#### Test 1: Message Persistence
1. Start conversation
2. Send multiple messages
3. Close and reopen chat
4. Check conversation history

**Expected Results:**
- ✅ All messages persist
- ✅ Conversation history maintained
- ✅ Timestamps correct

#### Test 2: Lead Association
1. Create conversation with lead info
2. Check dashboard conversation details

**Expected Results:**
- ✅ Lead linked to conversation
- ✅ All lead data accessible from conversation view

#### Test 3: Support Ticket Association
1. Create support issue in chat
2. Check dashboard conversation details

**Expected Results:**
- ✅ Ticket linked to conversation
- ✅ Full transcript in ticket
- ✅ Sentiment and priority set correctly

## 🧪 Automated Testing Scripts

### Test All Endpoints
```bash
# Start backend
cd backend && npm run start:dev

# In another terminal, run tests
./test-endpoints.sh
```

### Test Message Saving
```bash
# Send test message
curl -X POST http://localhost:9000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test_123", "message": "Test message"}'

# Verify saved
curl http://localhost:9000/api/chat/conversation/test_123
```

## 📊 Performance Testing

### Load Test
1. Send 100 concurrent chat messages
2. Check response times
3. Verify all messages saved

**Expected Results:**
- ✅ All messages saved
- ✅ Response time < 2 seconds
- ✅ No data loss

## 🔍 Debugging

### Check MongoDB Collections
```javascript
// Connect to MongoDB and verify
db.conversations.find().count()  // Should match dashboard count
db.leads.find().count()         // Should match dashboard count
db.supporttickets.find().count() // Should match dashboard count
db.payments.find().count()      // Should match dashboard count
db.bookings.find().count()      // Should match dashboard count
```

### Check Logs
```bash
# Backend logs show:
# - Message saved: sessionId=..., role=user, messageCount=...
# - Message saved: sessionId=..., role=assistant, messageCount=...
# - Lead created for session ...
# - Support ticket created: TKT-...
```

## ✅ Final Verification

Before marking as complete, verify:
- [ ] All user queries saved to DB
- [ ] All assistant responses saved to DB
- [ ] Leads automatically extracted and saved
- [ ] Support tickets automatically created
- [ ] Payments processed and saved
- [ ] Bookings created and saved
- [ ] Dashboard shows all data correctly
- [ ] All routes functional
- [ ] No dead links
- [ ] UI updates complete
- [ ] Widget embeddable

---

**Testing Status**: Ready for End-to-End Testing
**Last Updated**: December 2025

