# 🚀 Quick Test Start Guide

## Step 1: Start the Application

### Backend (Terminal 1):
```bash
cd webchatsales/backend
npm install  # if first time
npm run start:dev
```

**Expected:** Server running on `http://localhost:9000`

### Frontend (Terminal 2):
```bash
cd webchatsales/frontend
npm install  # if first time
npm run dev
```

**Expected:** App running on `http://localhost:3000`

---

## Step 2: Open Chatbot

1. Open browser: `http://localhost:3000`
2. Click the chatbot icon (bottom right)
3. You should see: "Hi, I'm Abby with WebChatSales — welcome. What can I help you with today?"

---

## Step 3: Run Quick Tests

### Test 1: Buying Intent (30 seconds)
```
You: "I want to sign up"
Expected: Abby asks for email immediately (no discovery questions)
```

### Test 2: Message Length (30 seconds)
```
You: "What does this do?"
Expected: Abby responds with 2-3 short messages (10-15 words each)
Count the words - should be ≤ 15 per message
```

### Test 3: No Demo Offers (30 seconds)
```
You: "How does this work?" or "Can I see a demo?"
Expected: "You're seeing it now!" (NOT "book a demo")
```

### Test 4: Qualification Flow (2 minutes)
```
You: "I'm interested"
Then answer each question in order:
1. Name
2. Business type
3. Lead source
4. Leads per week
5. Deal value
6. After-hours pain
Expected: Questions come in exact order, one at a time
```

### Test 5: Human Language (30 seconds)
```
Check messages for:
✅ Contractions: "I'm", "you're", "that's"
❌ No formal language: "I'd be happy to help"
```

### Test 6: UI Stability (30 seconds)
```
Send 3-4 messages quickly
Watch for:
✅ Smooth appearance
❌ No black screens
✅ "Typing..." indicator works
```

---

## Step 4: Test SMTP Error Handling

### Option A: Test with Invalid SMTP (Beta Signup)
1. Go to beta signup page
2. Set wrong `SMTP_PASSWORD` in `.env`
3. Submit form
4. **Expected:** "Thank you for signing up! We'll be in touch soon."
5. **NOT Expected:** Raw SMTP error like "535-5.7.8"

### Option B: Test with Valid SMTP
1. Set correct SMTP credentials in `.env`
2. Submit beta signup
3. **Expected:** Email sent successfully

---

## 🎯 Critical Tests (Must Pass)

These are the most important client requirements:

1. ✅ **Buying Intent** - Skip qualification when ready to buy
2. ✅ **Message Length** - 10-15 words max per message
3. ✅ **No Demo Offers** - "You're seeing it now!"
4. ✅ **9-Step Flow** - Exact order when qualifying
5. ✅ **SMTP Errors** - Hidden from users

---

## 📊 Test Results

After testing, check:

- [ ] Buying intent works
- [ ] Messages are short (10-15 words)
- [ ] No demo offers
- [ ] Qualification flow in order
- [ ] Human language (contractions)
- [ ] No black screens
- [ ] SMTP errors hidden

---

## 🐛 If Tests Fail

1. **Check backend logs** - Look for errors in Terminal 1
2. **Check frontend console** - Open DevTools (F12)
3. **Verify environment variables** - Check `.env` files
4. **Check API connection** - Backend should be on port 9000

---

## 📖 Full Testing Guide

For detailed testing instructions, see: `TESTING_GUIDE.md`

---

## 💡 Pro Tips

1. **Use Incognito Mode** - Fresh session each time
2. **Clear Browser Cache** - If UI seems stuck
3. **Check Network Tab** - See API calls in DevTools
4. **Watch Console** - Look for JavaScript errors
5. **Test on Mobile** - Responsive design check

---

## ⚡ Quick Command Reference

```bash
# Start backend
cd backend && npm run start:dev

# Start frontend  
cd frontend && npm run dev

# Run automated test script
./test-client-requirements.sh

# Check if backend is running
curl http://localhost:9000/api/health

# Check if frontend is running
curl http://localhost:3000
```

---

**Ready to test?** Start with Test 1 (Buying Intent) - it's the quickest way to verify everything is working! 🚀
