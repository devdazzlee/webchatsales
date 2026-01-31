# WebChatSales - Complete API Routes Documentation

## Base URL
- **Development**: `http://localhost:9000`
- **Production**: `https://yahir-unscorched-pierre.ngrok-free.dev`

---

## 🔵 Chat Endpoints

### `POST /api/chat/start`
Start a new conversation session.

**Request Body:**
```json
{
  "sessionId": "optional_session_id",
  "userEmail": "optional@email.com",
  "userName": "Optional Name"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_1234567890_abc123",
  "conversation": { ... }
}
```

### `POST /api/chat/message`
Send a message and get streaming response (Server-Sent Events).

**Request Body:**
```json
{
  "sessionId": "session_1234567890_abc123",
  "message": "Hello, I need help"
}
```

**Response:** Server-Sent Events stream
```
data: {"chunk": "Hello", "done": false}
data: {"chunk": "! How", "done": false}
...
data: {"chunk": "", "done": true}
```

**Note:** All user messages and assistant responses are automatically saved to MongoDB.

### `GET /api/chat/conversation/:sessionId`
Get full conversation history.

**Response:**
```json
{
  "success": true,
  "conversation": {
    "sessionId": "...",
    "messages": [
      {
        "role": "user",
        "content": "...",
        "timestamp": "2025-12-11T..."
      },
      {
        "role": "assistant",
        "content": "...",
        "timestamp": "2025-12-11T..."
      }
    ],
    "isActive": true,
    "userEmail": "...",
    "userName": "..."
  }
}
```

### `GET /api/chat/conversations?limit=50`
Get all conversations.

**Query Parameters:**
- `limit` (optional): Number of results (default: 50)

### `POST /api/chat/end`
End a conversation.

**Request Body:**
```json
{
  "sessionId": "session_1234567890_abc123"
}
```

---

## 🟢 Lead Endpoints

### `POST /api/lead`
Create a new lead (automatically called by chat service).

**Request Body:**
```json
{
  "sessionId": "session_1234567890_abc123",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "serviceNeed": "Customer service chatbot",
  "timing": "ASAP",
  "budget": "$500-1000",
  "tags": ["qualified", "high-priority"],
  "summary": "Lead interested in customer service solution",
  "conversationId": "..."
}
```

**Response:**
```json
{
  "success": true,
  "lead": { ... }
}
```

### `POST /api/lead/update`
Update an existing lead.

**Request Body:**
```json
{
  "sessionId": "session_1234567890_abc123",
  "updateData": {
    "status": "qualified",
    "tags": ["qualified", "contacted"]
  }
}
```

### `GET /api/lead/session/:sessionId`
Get lead by session ID.

### `GET /api/lead/all?limit=50`
Get all leads with pagination.

**Query Parameters:**
- `limit` (optional): Number of results (default: 50)

### `GET /api/lead/status/:status`
Get leads filtered by status.

**Status Values:** `new`, `qualified`, `contacted`, `booked`, `lost`

---

## 🔴 Support Ticket Endpoints

### `POST /api/support/ticket`
Create a support ticket (automatically called when issues detected).

**Request Body:**
```json
{
  "sessionId": "session_1234567890_abc123",
  "transcript": "Full conversation transcript...",
  "sentiment": "negative",
  "summary": "User reported login issue",
  "userEmail": "user@example.com",
  "userName": "John Doe",
  "conversationId": "...",
  "priority": "medium"
}
```

**Response:**
```json
{
  "success": true,
  "ticket": {
    "ticketId": "TKT-1234567890-ABC123",
    "status": "open",
    "priority": "medium",
    "sentiment": "negative",
    ...
  }
}
```

### `POST /api/support/ticket/:ticketId/status`
Update ticket status.

**Request Body:**
```json
{
  "status": "resolved"
}
```

**Status Values:** `open`, `in_progress`, `resolved`, `closed`

### `GET /api/support/ticket/:ticketId`
Get ticket by ID.

### `GET /api/support/session/:sessionId`
Get ticket by session ID.

### `GET /api/support/all?limit=50`
Get all tickets with pagination.

### `GET /api/support/status/:status`
Get tickets filtered by status.

---

## 💳 Payment Endpoints

### `POST /api/payment/create-link`
Create a Square payment link.

**Request Body:**
```json
{
  "amount": 279.00,
  "planType": "founder_special",
  "sessionId": "session_1234567890_abc123",
  "userEmail": "user@example.com",
  "userName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "paymentLink": "https://square.link/...",
  "paymentId": "..."
}
```

### `POST /api/payment/webhook`
Square webhook handler (called by Square when payment status changes).

**Headers:**
- `x-square-signature`: Webhook signature

**Request Body:** Square webhook payload

**Response:**
```json
{
  "success": true
}
```

### `GET /api/payment/:paymentId`
Get payment by ID.

### `GET /api/payment/session/:sessionId`
Get payment by session ID.

### `GET /api/payment/all?limit=50`
Get all payments with pagination.

---

## 📅 Booking Endpoints

### `POST /api/book`
Create a booking.

**Request Body:**
```json
{
  "sessionId": "session_1234567890_abc123",
  "timeSlot": "2025-12-15T14:00:00Z",
  "schedulingLink": "https://calendly.com/...",
  "leadId": "...",
  "userEmail": "user@example.com",
  "userName": "John Doe",
  "userPhone": "+1234567890",
  "notes": "Demo booking",
  "conversationId": "..."
}
```

**Response:**
```json
{
  "success": true,
  "booking": { ... }
}
```

### `POST /api/book/:bookingId/status`
Update booking status.

**Request Body:**
```json
{
  "status": "confirmed"
}
```

**Status Values:** `scheduled`, `confirmed`, `cancelled`, `completed`

### `GET /api/book/:bookingId`
Get booking by ID.

### `GET /api/book/session/:sessionId`
Get booking by session ID.

### `GET /api/book/all?limit=50`
Get all bookings with pagination.

### `GET /api/book/status/:status`
Get bookings filtered by status.

### `GET /api/book/availability?date=2025-12-15`
Get available time slots for a date.

**Query Parameters:**
- `date` (optional): ISO date string (default: today)

---

## 📊 Dashboard Endpoints

### `GET /api/dashboard/stats`
Get comprehensive dashboard statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "conversations": { "total": 100, "active": 25 },
      "leads": { "total": 50, "qualified": 30 },
      "tickets": { "total": 10, "open": 3 },
      "payments": { "total": 20, "completed": 15, "revenue": 5000 },
      "bookings": { "total": 12, "scheduled": 8 }
    },
    "breakdowns": {
      "leadsByStatus": [...],
      "ticketsByPriority": [...],
      "paymentsByStatus": [...]
    },
    "trends": {
      "conversationsOverTime": [...]
    },
    "recent": {
      "conversations": [...],
      "leads": [...],
      "tickets": [...],
      "payments": [...],
      "bookings": [...]
    }
  }
}
```

### `GET /api/dashboard/conversations?limit=50&skip=0`
Get paginated conversations list.

### `GET /api/dashboard/leads?limit=50&skip=0&status=qualified`
Get paginated leads list.

**Query Parameters:**
- `limit`: Results per page (default: 50)
- `skip`: Number to skip (default: 0)
- `status` (optional): Filter by status

### `GET /api/dashboard/tickets?limit=50&skip=0&status=open`
Get paginated tickets list.

### `GET /api/dashboard/payments?limit=50&skip=0&status=completed`
Get paginated payments list.

### `GET /api/dashboard/bookings?limit=50&skip=0&status=scheduled`
Get paginated bookings list.

### `GET /api/dashboard/conversation/:sessionId`
Get complete conversation details with related data.

**Response:**
```json
{
  "success": true,
  "data": {
    "conversation": { ... },
    "lead": { ... },
    "ticket": { ... },
    "booking": { ... },
    "payment": { ... }
  }
}
```

---

## 📧 Email Endpoints

### `POST /api/email/send-beta-invite`
Send beta invite confirmation email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "company": "Example Corp",
  "outcomes": "Lead generation"
}
```

### `POST /api/email/send-transcript`
Send conversation transcript email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "conversation": { ... }
}
```

---

## 🎯 Frontend Routes

### `/`
Main landing page with Abby chat widget.

### `/dashboard`
Admin dashboard with overview and all data.

**Tabs:**
- Overview: Statistics and charts
- Conversations: All chat conversations
- Leads: All qualified leads
- Support Tickets: All support tickets
- Payments: All payment records
- Bookings: All demo bookings

### `/dashboard?tab=conversations`
Direct link to conversations tab.

### `/widget`
Embeddable widget page (for iframe embedding).

---

## 🔐 Authentication

Currently, dashboard is open. For production, add authentication middleware.

---

## 📝 Notes

1. **All chat messages are automatically saved**: Every user query and assistant response is stored in MongoDB with timestamps for analytics and training.

2. **Automatic Lead Extraction**: The chat service automatically extracts lead information (name, email, phone, service need, timing, budget) from conversations using AI.

3. **Automatic Support Ticket Creation**: When users express problems/issues/complaints, support tickets are automatically created with sentiment analysis.

4. **Webhook Security**: Square webhooks should be verified using signature validation in production.

5. **Pagination**: All list endpoints support pagination with `limit` and `skip` parameters.

---

## 🚀 Testing

Use the provided ngrok URL for webhook testing:
- Square Webhook URL: `https://yahir-unscorched-pierre.ngrok-free.dev/api/payment/webhook`

---

**Last Updated**: December 2025
**Version**: 2.0

