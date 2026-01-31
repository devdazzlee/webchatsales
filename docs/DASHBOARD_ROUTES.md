# Dashboard Routes - Complete Reference

## 🎯 Frontend Dashboard Routes

### Main Dashboard Routes

#### `/dashboard`
**Description**: Main dashboard page with overview tab  
**Component**: `frontend/app/dashboard/page.tsx`  
**Default Tab**: Overview  
**Access**: Direct navigation

#### `/dashboard?tab=overview`
**Description**: Dashboard overview with statistics and charts  
**Features**:
- Key metrics (conversations, leads, tickets, payments, bookings)
- Revenue tracking
- Charts and visualizations
- Recent activity widgets

#### `/dashboard?tab=conversations`
**Description**: All conversations list  
**Features**:
- Paginated list of all conversations
- View conversation details
- Filter by status
- Search functionality

#### `/dashboard?tab=leads`
**Description**: All leads list  
**Features**:
- Paginated list of all leads
- Filter by status (new, qualified, contacted, booked, lost)
- View lead details
- Export functionality

#### `/dashboard?tab=tickets`
**Description**: All support tickets list  
**Features**:
- Paginated list of all tickets
- Filter by status (open, in_progress, resolved, closed)
- View ticket details with transcript
- Priority and sentiment display

#### `/dashboard?tab=payments`
**Description**: All payments list  
**Features**:
- Paginated list of all payments
- Filter by status (pending, completed, failed, refunded)
- Revenue calculations
- Payment details

#### `/dashboard?tab=bookings`
**Description**: All bookings list  
**Features**:
- Paginated list of all bookings
- Filter by status (scheduled, confirmed, cancelled, completed)
- Time slot display
- Booking details

---

## 🔌 Backend API Dashboard Routes

### Base URL
- **Development**: `http://localhost:9000`
- **Production**: `https://yahir-unscorched-pierre.ngrok-free.dev`

---

### `GET /api/dashboard/stats`
**Description**: Get comprehensive dashboard statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "conversations": {
        "total": 100,
        "active": 25
      },
      "leads": {
        "total": 50,
        "qualified": 30
      },
      "tickets": {
        "total": 10,
        "open": 3
      },
      "payments": {
        "total": 20,
        "completed": 15,
        "revenue": 5000.00
      },
      "bookings": {
        "total": 12,
        "scheduled": 8
      }
    },
    "breakdowns": {
      "leadsByStatus": [
        {"_id": "qualified", "count": 30},
        {"_id": "new", "count": 20}
      ],
      "ticketsByPriority": [
        {"_id": "high", "count": 5},
        {"_id": "medium", "count": 3}
      ],
      "paymentsByStatus": [
        {"_id": "completed", "count": 15, "total": 5000},
        {"_id": "pending", "count": 5, "total": 1000}
      ]
    },
    "trends": {
      "conversationsOverTime": [
        {"_id": "2025-12-01", "count": 10},
        {"_id": "2025-12-02", "count": 15}
      ]
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

**Usage Example:**
```bash
curl http://localhost:9000/api/dashboard/stats
```

---

### `GET /api/dashboard/conversations`
**Description**: Get paginated conversations list

**Query Parameters:**
- `limit` (optional): Number of results per page (default: 50)
- `skip` (optional): Number of results to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "conversations": [...],
  "total": 100,
  "limit": 50,
  "skip": 0
}
```

**Usage Example:**
```bash
# Get first page
curl http://localhost:9000/api/dashboard/conversations?limit=20&skip=0

# Get second page
curl http://localhost:9000/api/dashboard/conversations?limit=20&skip=20
```

---

### `GET /api/dashboard/leads`
**Description**: Get paginated leads list

**Query Parameters:**
- `limit` (optional): Number of results per page (default: 50)
- `skip` (optional): Number of results to skip (default: 0)
- `status` (optional): Filter by status (new, qualified, contacted, booked, lost)

**Response:**
```json
{
  "success": true,
  "leads": [...],
  "total": 50,
  "limit": 50,
  "skip": 0
}
```

**Usage Example:**
```bash
# Get all leads
curl http://localhost:9000/api/dashboard/leads

# Get qualified leads only
curl http://localhost:9000/api/dashboard/leads?status=qualified

# Get paginated results
curl http://localhost:9000/api/dashboard/leads?limit=20&skip=0
```

---

### `GET /api/dashboard/tickets`
**Description**: Get paginated support tickets list

**Query Parameters:**
- `limit` (optional): Number of results per page (default: 50)
- `skip` (optional): Number of results to skip (default: 0)
- `status` (optional): Filter by status (open, in_progress, resolved, closed)

**Response:**
```json
{
  "success": true,
  "tickets": [...],
  "total": 10,
  "limit": 50,
  "skip": 0
}
```

**Usage Example:**
```bash
# Get all tickets
curl http://localhost:9000/api/dashboard/tickets

# Get open tickets only
curl http://localhost:9000/api/dashboard/tickets?status=open

# Get paginated results
curl http://localhost:9000/api/dashboard/tickets?limit=20&skip=0
```

---

### `GET /api/dashboard/payments`
**Description**: Get paginated payments list

**Query Parameters:**
- `limit` (optional): Number of results per page (default: 50)
- `skip` (optional): Number of results to skip (default: 0)
- `status` (optional): Filter by status (pending, completed, failed, refunded)

**Response:**
```json
{
  "success": true,
  "payments": [...],
  "total": 20,
  "limit": 50,
  "skip": 0
}
```

**Usage Example:**
```bash
# Get all payments
curl http://localhost:9000/api/dashboard/payments

# Get completed payments only
curl http://localhost:9000/api/dashboard/payments?status=completed

# Get paginated results
curl http://localhost:9000/api/dashboard/payments?limit=20&skip=0
```

---

### `GET /api/dashboard/bookings`
**Description**: Get paginated bookings list

**Query Parameters:**
- `limit` (optional): Number of results per page (default: 50)
- `skip` (optional): Number of results to skip (default: 0)
- `status` (optional): Filter by status (scheduled, confirmed, cancelled, completed)

**Response:**
```json
{
  "success": true,
  "bookings": [...],
  "total": 12,
  "limit": 50,
  "skip": 0
}
```

**Usage Example:**
```bash
# Get all bookings
curl http://localhost:9000/api/dashboard/bookings

# Get scheduled bookings only
curl http://localhost:9000/api/dashboard/bookings?status=scheduled

# Get paginated results
curl http://localhost:9000/api/dashboard/bookings?limit=20&skip=0
```

---

### `GET /api/dashboard/conversation/:sessionId`
**Description**: Get complete conversation details with all related data

**URL Parameters:**
- `sessionId`: The conversation session ID

**Response:**
```json
{
  "success": true,
  "data": {
    "conversation": {
      "sessionId": "session_123",
      "messages": [...],
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "isActive": true,
      "createdAt": "2025-12-11T...",
      "lastMessageAt": "2025-12-11T..."
    },
    "lead": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "serviceNeed": "Customer service chatbot",
      "status": "qualified"
    },
    "ticket": {
      "ticketId": "TKT-1234567890-ABC123",
      "status": "open",
      "priority": "medium",
      "sentiment": "neutral"
    },
    "booking": {
      "timeSlot": "2025-12-15T14:00:00Z",
      "status": "scheduled"
    },
    "payment": {
      "amount": 279.00,
      "status": "completed",
      "planType": "founder_special"
    }
  }
}
```

**Usage Example:**
```bash
curl http://localhost:9000/api/dashboard/conversation/session_1234567890_abc123
```

---

## 📋 Quick Reference Table

| Route | Method | Description | Query Params |
|-------|--------|-------------|--------------|
| `/dashboard` | GET | Main dashboard | `tab` (overview, conversations, leads, tickets, payments, bookings) |
| `/api/dashboard/stats` | GET | Dashboard statistics | None |
| `/api/dashboard/conversations` | GET | Conversations list | `limit`, `skip` |
| `/api/dashboard/leads` | GET | Leads list | `limit`, `skip`, `status` |
| `/api/dashboard/tickets` | GET | Tickets list | `limit`, `skip`, `status` |
| `/api/dashboard/payments` | GET | Payments list | `limit`, `skip`, `status` |
| `/api/dashboard/bookings` | GET | Bookings list | `limit`, `skip`, `status` |
| `/api/dashboard/conversation/:sessionId` | GET | Conversation details | None |

---

## 🚀 Usage Examples

### Frontend Navigation
```typescript
// Navigate to dashboard overview
router.push('/dashboard')

// Navigate to leads tab
router.push('/dashboard?tab=leads')

// Navigate to tickets tab
router.push('/dashboard?tab=tickets')
```

### API Calls from Frontend
```typescript
// Get dashboard stats
const response = await fetch('http://localhost:9000/api/dashboard/stats')
const data = await response.json()

// Get leads with filter
const leadsResponse = await fetch(
  'http://localhost:9000/api/dashboard/leads?status=qualified&limit=20&skip=0'
)
const leadsData = await leadsResponse.json()

// Get conversation details
const convResponse = await fetch(
  `http://localhost:9000/api/dashboard/conversation/${sessionId}`
)
const convData = await convResponse.json()
```

### cURL Examples
```bash
# Get dashboard stats
curl http://localhost:9000/api/dashboard/stats

# Get qualified leads
curl http://localhost:9000/api/dashboard/leads?status=qualified

# Get open tickets
curl http://localhost:9000/api/dashboard/tickets?status=open

# Get completed payments
curl http://localhost:9000/api/dashboard/payments?status=completed

# Get conversation details
curl http://localhost:9000/api/dashboard/conversation/session_123
```

---

## 🔐 Authentication

**Current Status**: Dashboard routes are open (no authentication required)

**For Production**: Add authentication middleware to protect dashboard routes.

---

## 📝 Notes

1. All list endpoints support pagination with `limit` and `skip` parameters
2. Filtering is available on leads, tickets, payments, and bookings via `status` parameter
3. All responses follow the format: `{ success: true, data: {...} }` or `{ success: true, ...items }`
4. Frontend routes use Next.js routing with query parameters for tabs
5. All API routes return JSON responses

---

**Last Updated**: December 2025  
**Version**: 2.0

