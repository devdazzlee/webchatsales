# WebChatSales - Client Requirements Testing Guide

## 🎯 Testing Checklist

### 1. ✅ Buying Intent Detection (Skip Qualification)

**Test Case:** When customer shows buying intent, skip all discovery questions and go straight to closing.

**Steps:**
1. Open chatbot
2. Immediately say: **"I want to sign up"** or **"How much is it?"** or **"What's the price?"**
3. **Expected:** Abby should:
   - NOT ask discovery questions (name, business type, etc.)
   - Immediately ask: "Great! What's your email?"
   - Then close: "$97/month. 30-day free trial. Want to try it?"

**Test Variations:**
- "I want to start"
- "How do I get started?"
- "What's the cost?"
- "I'm ready to buy"
- "Sign me up"

---

### 2. ✅ Message Length (10-15 Words MAX)

**Test Case:** All messages should be 10-15 words maximum. Longer thoughts split into 2-3 messages.

**Steps:**
1. Start a conversation
2. Ask: "What does this do?"
3. **Expected:** Abby's response should be:
   - Multiple short messages (10-15 words each)
   - NOT one long paragraph
   - Example:
     ```
     "Short version? I answer your website chats 24/7."
     
     "Turn them into booked appointments."
     ```

**Count words in each message** - should be ≤ 15 words per message.

---

### 3. ✅ Abby IS the Demo (No Demo Offers)

**Test Case:** Abby should never offer to "book a demo" or "schedule a call".

**Steps:**
1. Ask: "How does this work?" or "Can I see a demo?"
2. **Expected:** Abby should say:
   - "You're seeing it now!"
   - "I work just like this on your site 24/7."
   - "$97/month, free 30-day trial. Want to try it?"
3. **NOT Expected:** 
   - ❌ "Let me schedule a demo"
   - ❌ "Book a call with us"
   - ❌ "Schedule a consultation"

---

### 4. ✅ 9-Step Qualification Flow (In Order)

**Test Case:** When no buying intent, follow exact 9-step flow.

**Steps:**
1. Open chatbot
2. Say: "I'm interested in this"
3. **Expected Flow:**

   **Step 1:** "Hi, I'm Abby with WebChatSales — welcome. What can I help you with today?"
   
   **Step 2:** After you explain → "Got it. Who am I speaking with?"
   
   **Step 3:** After name → "What type of business is this?"
   
   **Step 4:** After business type → "How do leads usually come in for you?"
   
   **Step 5:** After lead source → "Roughly how many per week?"
   
   **Step 6:** After volume → "What's a typical deal or job worth?"
   
   **Step 7:** After value → "What happens when leads come in after hours?"
   
   **Step 8:** After pain point → "That's exactly where WebChatSales helps. Abby responds instantly and books the opportunity."
   
   **Step 9:** "Want to start the trial and see it on your site?"

**Verify:** Each question comes in the correct order, one at a time.

---

### 5. ✅ Sound Human (No AI Language)

**Test Case:** Messages should sound like texting a colleague, not a chatbot.

**Check for:**
- ✅ Uses contractions: "I'm", "you're", "that's", "don't"
- ✅ No emojis in conversation (only in greeting if any)
- ❌ No "I'd be happy to help"
- ❌ No "Feel free to"
- ❌ No "Please don't hesitate"
- ❌ No formal language

**Example Good:**
- "Got it. Who am I speaking with?"
- "That's where I help most."

**Example Bad:**
- "I would be delighted to assist you with that."
- "Please feel free to provide your information."

---

### 6. ✅ UI Stability (No Black Screens)

**Test Case:** Chat UI should be stable, no black screens between messages.

**Steps:**
1. Start conversation
2. Send multiple messages quickly
3. Watch for:
   - ✅ Smooth message appearance
   - ✅ No blank/black screens
   - ✅ "Typing..." indicator works properly
   - ✅ Messages appear immediately when streaming

**Test Edge Cases:**
- Send message while previous is still streaming
- Send multiple messages in quick succession
- Test with slow network (throttle in DevTools)

---

### 7. ✅ SMTP Error Handling (No Raw Errors to Users)

**Test Case:** SMTP errors should not show raw technical messages to users.

**Steps:**
1. **Beta Signup Form:**
   - Go to beta signup page
   - Fill form and submit
   - If SMTP fails, should see: "Thank you for signing up! We'll be in touch soon."
   - ❌ Should NOT see: "535-5.7.8 Authentication failed" or raw SMTP errors

2. **Business Inquiry Form:**
   - Fill business inquiry form
   - Submit
   - If SMTP fails, should see: "Thank you for your inquiry! We'll be in touch soon."
   - ❌ Should NOT see raw SMTP errors

**How to Test SMTP Failure:**
- Set wrong `SMTP_PASSWORD` in `.env`
- Or set `SMTP_EMAIL` to invalid email
- Submit forms and verify friendly error messages

---

### 8. ✅ Greeting Message

**Test Case:** Initial greeting should match client requirement.

**Steps:**
1. Open chatbot for first time
2. **Expected:** 
   ```
   "Hi, I'm Abby with WebChatSales — welcome.
   
   What can I help you with today?"
   ```
3. Should be short, split format (not one long line)

---

### 9. ✅ Objection Handling

**Test Case:** When customer objects, handle naturally.

**Test Scenarios:**

**Price Objection:**
- User: "That's too expensive"
- Expected: "Totally fair. How much does one missed lead cost you?"

**Timing Objection:**
- User: "Not right now" or "Maybe later"
- Expected: "What usually changes between now and later?"

**Trust Objection:**
- User: "I'm not sure about this"
- Expected: "What feels risky — the tech, setup, or results?"

**Then offer:** "Want to try the 30-day free trial and see for yourself?"

---

## 🧪 Quick Test Script

Run this conversation flow to test everything at once:

```
1. Open chatbot
2. Say: "I want to sign up" → Should skip to email/close
3. Close chatbot, reopen
4. Say: "I'm interested" → Should follow 9-step flow
5. Answer each question → Verify order
6. When asked "How does it work?" → Should say "You're seeing it now!"
7. Count words in each message → Should be ≤ 15 words
8. Check for contractions and human language → Should sound natural
```

---

## 🔍 Manual Testing Checklist

Print this and check off as you test:

- [ ] Buying intent detected and skips qualification
- [ ] All messages are 10-15 words max
- [ ] Longer thoughts split into multiple messages
- [ ] Never offers to "book a demo"
- [ ] Says "You're seeing it now!" when asked how it works
- [ ] 9-step qualification flow follows exact order
- [ ] Each question asked one at a time
- [ ] Sound human (contractions, no formal language)
- [ ] No black screens between messages
- [ ] SMTP errors hidden from users (beta signup)
- [ ] SMTP errors hidden from users (business inquiry)
- [ ] Greeting message is short and split
- [ ] Objections handled naturally
- [ ] No hardcoded word detection (AI analyzes naturally)

---

## 🐛 Common Issues to Watch For

1. **Abby asks too many questions when ready to buy**
   - Fix: Buying intent detection not working
   - Check: `sales-agent-prompt.service.ts` Rule #3

2. **Messages too long**
   - Fix: Message length rule not enforced
   - Check: `sales-agent-prompt.service.ts` Rule #1

3. **Offers to book demo**
   - Fix: Demo mode logic still active
   - Check: `sales-agent-prompt.service.ts` Rule #2

4. **Qualification flow out of order**
   - Fix: `getNextQualificationQuestion` logic
   - Check: `chat.service.ts` qualification flow

5. **Black screens**
   - Fix: Streaming timeout logic
   - Check: `Chatbot.tsx` streaming handling

6. **Raw SMTP errors shown**
   - Fix: Error handling in email controller
   - Check: `email.controller.ts` error responses

---

## 📝 Test Results Template

```
Date: ___________
Tester: ___________

Buying Intent: [ ] PASS [ ] FAIL
Message Length: [ ] PASS [ ] FAIL
No Demo Offers: [ ] PASS [ ] FAIL
9-Step Flow: [ ] PASS [ ] FAIL
Human Language: [ ] PASS [ ] FAIL
UI Stability: [ ] PASS [ ] FAIL
SMTP Errors: [ ] PASS [ ] FAIL
Greeting: [ ] PASS [ ] FAIL
Objections: [ ] PASS [ ] FAIL

Notes:
_________________________________
_________________________________
_________________________________
```

---

## 🚀 Automated Testing (Optional)

For automated testing, you can create test scripts that:
1. Send messages via API
2. Verify response length (word count)
3. Check for specific phrases (should/shouldn't appear)
4. Test conversation flow order

Would you like me to create automated test scripts?
