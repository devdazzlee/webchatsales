# 🧪 Testing Guide: Qualification & Buying Intent Fixes

## 🚀 Quick Start

### 1. Start Backend (Terminal 1)
```bash
cd backend
npm run start:dev
```
**Expected:** `🚀 Backend server running on http://localhost:9000`

### 2. Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
**Expected:** `Ready on http://localhost:3000`

### 3. Open Chatbot
1. Open browser: `http://localhost:3000`
2. Click chatbot icon (bottom right)
3. You should see: "Hi, I'm Abby with WebChatSales — welcome. What can I help you with today?"

---

## 🎯 Critical Test Scenarios

### Test 1: "Tell me what you need" - Should NOT Skip Qualification ✅

**Scenario:** User asks what information is needed before qualification is complete.

**Steps:**
1. Open chatbot (fresh session)
2. Say: **"Tell me all the information u need to get me started"**

**Expected Behavior:**
- ✅ Abby should NOT jump to asking for email
- ✅ Abby should acknowledge interest: "I'd love to get you started."
- ✅ Abby should explain what's needed: "First, I need to understand your business a bit."
- ✅ Abby should continue qualification: "Who am I speaking with?" or "What type of business is this?"

**NOT Expected:**
- ❌ "I'll need your email and where you want bookings sent."
- ❌ "I have your business info already."
- ❌ Jumping straight to closing

**Test Result:** [ ] PASS [ ] FAIL

---

### Test 2: "I have your info already" - Should NOT Claim False Info ✅

**Scenario:** User correctly points out that Abby doesn't have their info.

**Steps:**
1. Open chatbot (fresh session)
2. Say: "Tell me what you need to get started"
3. If Abby claims to have info, say: **"U don't even know anything about my company yet"**

**Expected Behavior:**
- ✅ Abby should acknowledge the mistake: "You're right, I apologize for that."
- ✅ Abby should NOT claim "I have your business info already"
- ✅ Abby should continue qualification honestly

**Test Result:** [ ] PASS [ ] FAIL

---

### Test 3: Buying Intent with Incomplete Qualification ✅

**Scenario:** User shows buying intent but qualification is incomplete.

**Steps:**
1. Open chatbot (fresh session)
2. Say: **"I want to sign up"** (before any qualification)

**Expected Behavior:**
- ✅ Buying intent should be detected
- ✅ BUT qualification should continue first
- ✅ Abby should say: "I'd love to get you started. First, I need to understand your business a bit."
- ✅ Then ask: "Who am I speaking with?"

**NOT Expected:**
- ❌ Jumping straight to "What's your email?"
- ❌ Skipping qualification entirely

**Test Result:** [ ] PASS [ ] FAIL

---

### Test 4: Buying Intent with Complete Qualification ✅

**Scenario:** User shows buying intent AFTER qualification is complete.

**Steps:**
1. Open chatbot (fresh session)
2. Complete qualification:
   - Say: "I'm interested"
   - Answer: Name, Business type, Lead source, Volume, Deal value, After-hours pain
3. Then say: **"I want to sign up"** or **"How much is it?"**

**Expected Behavior:**
- ✅ Buying intent should be detected
- ✅ Abby should skip remaining questions
- ✅ Abby should ask: "Great! What's your email?"
- ✅ Then close: "$97/month. 30-day free trial. No card needed. Want to try it?"

**Test Result:** [ ] PASS [ ] FAIL

---

### Test 5: Conservative Buying Intent Detection ✅

**Scenario:** Weak buying signals should NOT trigger buying intent.

**Test Cases:**

**A. "How do I get started?"**
- **Expected:** Continue qualification (NOT buying intent)
- **Result:** [ ] PASS [ ] FAIL

**B. "What information do you need?"**
- **Expected:** Continue qualification (NOT buying intent)
- **Result:** [ ] PASS [ ] FAIL

**C. "Tell me what you need"**
- **Expected:** Continue qualification (NOT buying intent)
- **Result:** [ ] PASS [ ] FAIL

**Strong signals that SHOULD trigger:**
- "I want to sign up" → ✅ Should trigger
- "What's the price?" → ✅ Should trigger
- "Sign me up" → ✅ Should trigger
- "I'm ready to buy" → ✅ Should trigger

---

### Test 6: Qualification Completeness Check ✅

**Scenario:** Verify qualification data exists before closing.

**Steps:**
1. Open chatbot (fresh session)
2. Say: "I want to sign up"
3. Check backend logs or database

**Expected:**
- ✅ System checks for: name, businessType, and at least one qualification field
- ✅ If missing, continues qualification
- ✅ Only closes when data exists

**Test Result:** [ ] PASS [ ] FAIL

---

## 📋 Complete Test Flow

### Full Conversation Test

**Step-by-step conversation to test everything:**

```
1. Open chatbot
   Expected: "Hi, I'm Abby with WebChatSales — welcome. What can I help you with today?"

2. You: "Tell me all the information u need to get me started"
   Expected: 
   - "I'd love to get you started."
   - "First, I need to understand your business a bit."
   - "Who am I speaking with?"

3. You: "John"
   Expected: "Got it, John. What type of business is this?"

4. You: "Plumbing"
   Expected: "Nice. How many people on your team?"

5. You: "Just me and my partner"
   Expected: "Got it. What's your biggest challenge with leads right now?"

6. You: "We miss calls after hours"
   Expected: 
   - "Most businesses do."
   - "When do most of your leads come in - evenings, weekends?"

7. You: "Evenings mostly"
   Expected: "Got it. So speed is everything. How soon do you usually call them back now?"

8. You: "Maybe 30 minutes"
   Expected: "Makes sense. Roughly how many leads per week?"

9. You: "10-15"
   Expected: "Got it. So each lead is valuable. What's a typical job worth?"

10. You: "Around $500"
    Expected: "Makes sense. What happens when leads come in after hours?"

11. You: "We lose them to competitors"
    Expected:
    - "That's a common challenge — we built Abby for that."
    - "She responds instantly so you're always first."
    - "Most of our customers see booked leads within the first week."

12. You: "I want to sign up"
    Expected: "Great! What's your email?"
```

**Test Result:** [ ] PASS [ ] FAIL

---

## 🔍 Verification Checklist

After running tests, verify:

- [ ] "Tell me what you need" does NOT skip qualification
- [ ] Abby never claims to have info she doesn't have
- [ ] Buying intent with incomplete qualification continues qualification first
- [ ] Buying intent with complete qualification skips to closing
- [ ] Weak signals ("how do I get started") don't trigger buying intent
- [ ] Strong signals ("I want to sign up") trigger buying intent
- [ ] Qualification completeness is checked before closing
- [ ] Acknowledgment pattern is used (e.g., "Got it" before next question)

---

## 🐛 Debugging

### If Tests Fail:

1. **Check Backend Logs (Terminal 1)**
   - Look for: `[ChatService] Buying intent detected`
   - Look for: `[ChatService] Buying intent detected but qualification incomplete`
   - Check conversation phase: `conversationPhase: 'discovery'` vs `'buying_intent'`

2. **Check Frontend Console (Browser DevTools)**
   - Open DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for API calls

3. **Verify Environment Variables**
   - Backend `.env` has `OPENAI_API_KEY`
   - Backend `.env` has `MONGODB_URI`
   - Frontend `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:9000`

4. **Check Database**
   - Connect to MongoDB
   - Check `leads` collection for session
   - Verify qualification fields are populated

---

## 📊 Expected Backend Logs

### When "Tell me what you need" is said:
```
[ChatService] Analyzing buying intent for sessionId: ...
[ChatService] Buying intent detection: NO (weak signal - asking about requirements)
[ChatService] Base conversation phase: discovery
```

### When "I want to sign up" with incomplete qualification:
```
[ChatService] ✅ Buying intent detected for sessionId: ...
[ChatService] Buying intent detected but qualification incomplete - continuing qualification
[ChatService] Base conversation phase: discovery
```

### When "I want to sign up" with complete qualification:
```
[ChatService] ✅ Buying intent detected for sessionId: ...
[ChatService] Base conversation phase: buying_intent
```

---

## 🎯 Quick Test Script

Run this in the chatbot to test all fixes at once:

```
1. "Tell me all the information u need to get me started"
   → Should continue qualification

2. "U don't even know anything about my company yet"
   → Should acknowledge mistake, continue qualification

3. Complete qualification (name, business, etc.)

4. "I want to sign up"
   → Should ask for email
```

---

## ✅ Success Criteria

All tests pass if:
- ✅ Qualification is never skipped when incomplete
- ✅ Abby never claims false information
- ✅ Buying intent is conservative (only strong signals)
- ✅ Qualification completeness is verified before closing
- ✅ Acknowledgment pattern is used throughout

---

**Ready to test?** Start with Test 1 - it's the most critical fix! 🚀
