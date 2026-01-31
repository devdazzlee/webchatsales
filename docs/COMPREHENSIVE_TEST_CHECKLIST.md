# Comprehensive Test Checklist - Milestone 2

## ✅ Systematic Point-by-Point Testing

### 1. Message Saving (CRITICAL REQUIREMENT)

#### Test 1.1: User Message Saving
- [ ] Open chat widget
- [ ] Send a message: "Hello"
- [ ] Check backend logs: Should see "Message saved: role=user"
- [ ] Verify in MongoDB: `db.conversations.findOne({sessionId: "..."})`
- [ ] Expected: Message in `messages` array with `role: "user"`, `content: "Hello"`, `timestamp`

#### Test 1.2: Assistant Response Saving
- [ ] Wait for Abby's response
- [ ] Check backend logs: Should see "Assistant response saved"
- [ ] Verify in MongoDB: Latest message in array with `role: "assistant"`
- [ ] Expected: Full response text saved with timestamp

#### Test 1.3: Multiple Messages
- [ ] Send 5 messages in conversation
- [ ] Verify all 10 messages saved (5 user + 5 assistant)
- [ ] Check timestamps are sequential
- [ ] Expected: Complete conversation history in DB

**Status**: ✅ Code verified - Lines 110 and 197 in chat.service.ts

---

### 2. Lead Handling

#### Test 2.1: Instant Greeting
- [ ] Open chat widget
- [ ] Expected: Abby greets immediately: "Hello! I'm Abby..."

#### Test 2.2: Lead Qualification - Name
- [ ] Chat: "Hi, I'm John Doe"
- [ ] Check MongoDB: `db.leads.findOne({sessionId: "..."})`
- [ ] Expected: Lead created with `name: "John Doe"`

#### Test 2.3: Lead Qualification - Email
- [ ] Chat: "My email is john@example.com"
- [ ] Check MongoDB: Lead updated with `email: "john@example.com"`

#### Test 2.4: Lead Qualification - Phone
- [ ] Chat: "My phone is +1234567890"
- [ ] Check MongoDB: Lead updated with `phone: "+1234567890"`

#### Test 2.5: Lead Qualification - Service Need
- [ ] Chat: "I need a customer service chatbot"
- [ ] Check MongoDB: Lead updated with `serviceNeed: "customer service chatbot"`

#### Test 2.6: Lead Qualification - Timing
- [ ] Chat: "I need this ASAP" or "Next month"
- [ ] Check MongoDB: Lead updated with `timing`

#### Test 2.7: Lead Qualification - Budget
- [ ] Chat: "My budget is $500-1000"
- [ ] Check MongoDB: Lead updated with `budget: "$500-1000"`

#### Test 2.8: Qualified Lead Notification
- [ ] Provide: name, email, service need
- [ ] Check admin email inbox
- [ ] Expected: Email with lead info AND full conversation transcript

#### Test 2.9: Lead in Dashboard
- [ ] Navigate to `/dashboard?tab=leads`
- [ ] Expected: Lead appears in list
- [ ] Click lead - verify all fields displayed

#### Test 2.10: Objection Handling
- [ ] Chat: "This is too expensive"
- [ ] Expected: Abby handles objection with empathy and facts

#### Test 2.11: Demo Booking
- [ ] Chat: "I'd like to book a demo"
- [ ] Expected: Abby offers scheduling or asks for preferred time
- [ ] Provide time preference
- [ ] Check MongoDB: `db.bookings.findOne({sessionId: "..."})`
- [ ] Expected: Booking created

**Status**: ✅ Code verified - Lead extraction at lines 322-430

---

### 3. Support Handling

#### Test 3.1: Support Detection - Problem Keyword
- [ ] Chat: "I'm having a problem with login"
- [ ] Check backend logs: Should see "Support ticket created"
- [ ] Check MongoDB: `db.supporttickets.findOne({sessionId: "..."})`
- [ ] Expected: Ticket created with `status: "open"`

#### Test 3.2: Support Detection - Issue Keyword
- [ ] Chat: "There's an issue with the system"
- [ ] Expected: Ticket created (or existing ticket updated)

#### Test 3.3: Support Detection - Complaint Keyword
- [ ] Chat: "I'm frustrated with this service"
- [ ] Expected: Ticket created with `sentiment: "negative"`

#### Test 3.4: Ticket ID Generation
- [ ] Check ticket in MongoDB
- [ ] Expected: `ticketId` format: `TKT-{timestamp}-{random}`

#### Test 3.5: Ticket Priority
- [ ] Chat: "This is urgent! I need help immediately"
- [ ] Check MongoDB: Ticket with `priority: "high"`

#### Test 3.6: Sentiment Analysis
- [ ] Chat: "I hate this, it's terrible"
- [ ] Check MongoDB: Ticket with `sentiment: "very_negative"`

#### Test 3.7: Transcript in Ticket
- [ ] Check ticket in MongoDB
- [ ] Expected: `transcript` field contains full conversation

#### Test 3.8: Ticket Timestamps
- [ ] Check ticket in MongoDB
- [ ] Expected: `openedAt` timestamp present

#### Test 3.9: Ticket in Dashboard
- [ ] Navigate to `/dashboard?tab=tickets`
- [ ] Expected: Ticket appears in list
- [ ] Verify: Ticket ID, priority, sentiment, status displayed

#### Test 3.10: No Duplicate Tickets
- [ ] Express multiple problems in same session
- [ ] Check MongoDB: Only one ticket per session

**Status**: ✅ Code verified - Support detection at lines 250-305

---

### 4. Payment Integration

#### Test 4.1: Create Payment Link
```bash
curl -X POST http://localhost:9000/api/payment/create-link \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 279.00,
    "planType": "founder_special",
    "sessionId": "test_123",
    "userEmail": "test@example.com",
    "userName": "Test User"
  }'
```
- [ ] Expected: Returns payment link
- [ ] Check MongoDB: `db.payments.findOne({sessionId: "test_123"})`
- [ ] Expected: Payment record with `status: "pending"`

#### Test 4.2: Payment in Dashboard
- [ ] Navigate to `/dashboard?tab=payments`
- [ ] Expected: Payment appears in list

#### Test 4.3: Webhook Handler
- [ ] Configure Square webhook to: `https://yahir-unscorched-pierre.ngrok-free.dev/api/payment/webhook`
- [ ] Complete test payment in Square sandbox
- [ ] Check backend logs: Should see webhook received
- [ ] Check MongoDB: Payment status updated to "completed"

#### Test 4.4: Confirmation Email
- [ ] After webhook processes payment
- [ ] Check user email inbox
- [ ] Expected: Payment confirmation email received

#### Test 4.5: Payment Association
- [ ] Check payment in MongoDB
- [ ] Expected: `userEmail` and `userName` fields populated

#### Test 4.6: Payment Revenue
- [ ] Navigate to `/dashboard` overview
- [ ] Expected: Revenue calculated correctly from completed payments

**Status**: ✅ Code verified - Payment service at lines 1-150

---

### 5. Dashboard Functionality

#### Test 5.1: Overview Stats
- [ ] Navigate to `/dashboard`
- [ ] Expected: All metrics displayed:
  - Total conversations
  - Active conversations
  - Total leads
  - Qualified leads
  - Total tickets
  - Open tickets
  - Total payments
  - Completed payments
  - Revenue
  - Total bookings
  - Scheduled bookings

#### Test 5.2: Charts
- [ ] Check overview tab
- [ ] Expected: Charts render:
  - Conversations over time (line chart)
  - Leads by status (pie chart)
  - Tickets by priority (bar chart)
  - Payments by status (bar chart)

#### Test 5.3: Conversations Tab
- [ ] Navigate to `/dashboard?tab=conversations`
- [ ] Expected: All conversations listed
- [ ] Click "View" on a conversation
- [ ] Expected: Full conversation detail with all messages

#### Test 5.4: Leads Tab
- [ ] Navigate to `/dashboard?tab=leads`
- [ ] Expected: All leads listed
- [ ] Filter by status: "qualified"
- [ ] Expected: Only qualified leads shown

#### Test 5.5: Tickets Tab
- [ ] Navigate to `/dashboard?tab=tickets`
- [ ] Expected: All tickets listed
- [ ] Verify: Ticket ID, priority, sentiment, status displayed
- [ ] Filter by status: "open"
- [ ] Expected: Only open tickets shown

#### Test 5.6: Payments Tab
- [ ] Navigate to `/dashboard?tab=payments`
- [ ] Expected: All payments listed
- [ ] Verify: Amount, plan type, status displayed
- [ ] Filter by status: "completed"
- [ ] Expected: Only completed payments shown

#### Test 5.7: Bookings Tab
- [ ] Navigate to `/dashboard?tab=bookings`
- [ ] Expected: All bookings listed
- [ ] Verify: Time slot, user, status displayed

#### Test 5.8: Conversation Detail
- [ ] Click on any conversation
- [ ] Expected: Shows:
  - All messages with timestamps
  - Related lead (if exists)
  - Related ticket (if exists)
  - Related booking (if exists)
  - Related payment (if exists)

#### Test 5.9: Pagination
- [ ] Navigate to any list tab
- [ ] Click "Next" button
- [ ] Expected: Next page loads
- [ ] Click "Previous" button
- [ ] Expected: Previous page loads

**Status**: ✅ Code verified - Dashboard service and components created

---

### 6. UI/Branding Updates

#### Test 6.1: Header Button Removed
- [ ] Navigate to `/`
- [ ] Check header
- [ ] Expected: NO "Talk to Abby" button

#### Test 6.2: Footer Button Removed
- [ ] Scroll to footer
- [ ] Expected: NO "Chat with Abby" button

#### Test 6.3: Widget Only
- [ ] Check bottom-right corner
- [ ] Expected: Only one chat widget button

#### Test 6.4: Founder Special Banner - Hero
- [ ] Navigate to `/`
- [ ] Check Hero section
- [ ] Expected: Banner displays: "Founder Special: $279 for first month (regular $479/mo) • 4 spots left"

#### Test 6.5: Founder Special Banner - Pricing
- [ ] Scroll to Pricing section
- [ ] Expected: Same banner displayed

**Status**: ✅ Code verified - Header and Footer updated, banners added

---

### 7. Widget Requirements

#### Test 7.1: Embeddable Script
- [ ] Check file exists: `/frontend/public/abby-widget.js`
- [ ] Expected: File exists

#### Test 7.2: Widget Loads
- [ ] Create test HTML with widget script
- [ ] Open in browser
- [ ] Expected: Widget button appears bottom-right

#### Test 7.3: No Conflicts
- [ ] Widget should not conflict with page styles
- [ ] Expected: Clean appearance

#### Test 7.4: No Duplicates
- [ ] Only one widget button visible
- [ ] Expected: No duplicate buttons

**Status**: ✅ Code verified - Widget script created

---

### 8. Demo Page

#### Test 8.1: Functional Buttons
- [ ] Click "See Pricing"
- [ ] Expected: Scrolls to pricing section

#### Test 8.2: Chat Button
- [ ] Click "See it in Action"
- [ ] Expected: Chat widget opens

#### Test 8.3: Pricing Buttons
- [ ] Click any pricing plan button
- [ ] Expected: Chat opens with plan question

#### Test 8.4: No Dead Links
- [ ] Check all links on page
- [ ] Expected: All functional

**Status**: ✅ Code verified - All buttons functional

---

## 🔍 Database Verification

### MongoDB Collections Check

```javascript
// Connect to MongoDB and run:

// 1. Check conversations
db.conversations.find().count()
// Expected: > 0 if conversations exist

// 2. Check messages are saved
db.conversations.findOne({}, {messages: 1})
// Expected: messages array with user and assistant messages

// 3. Check leads
db.leads.find().count()
// Expected: > 0 if leads exist

// 4. Check tickets
db.supporttickets.find().count()
// Expected: > 0 if tickets exist

// 5. Check payments
db.payments.find().count()
// Expected: > 0 if payments exist

// 6. Check bookings
db.bookings.find().count()
// Expected: > 0 if bookings exist
```

---

## 🚨 Common Issues to Check

1. **Messages not saving**: Check MongoDB connection
2. **Leads not extracting**: Check OpenAI API key
3. **Tickets not creating**: Check support keywords detection
4. **Dashboard empty**: Check API endpoints are working
5. **Charts not rendering**: Check recharts is installed

---

## ✅ Final Verification

Before marking complete, verify:
- [ ] All user queries saved
- [ ] All assistant responses saved
- [ ] Leads automatically extracted
- [ ] Support tickets automatically created
- [ ] Payments processed
- [ ] Bookings created
- [ ] Dashboard shows all data
- [ ] All UI updates complete
- [ ] Widget embeddable
- [ ] No dead links
- [ ] Transcripts sent to admin

---

**Testing Status**: Ready for systematic testing
**Last Updated**: December 2025

