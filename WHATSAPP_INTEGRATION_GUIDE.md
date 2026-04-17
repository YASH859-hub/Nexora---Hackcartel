# WhatsApp OTP Integration Guide

## Overview
This guide helps you integrate WhatsApp OTP verification with Nexora using Twilio. Users will receive OTP codes via WhatsApp during login for enhanced security.

---

## Step 1: Set Up Twilio Account

### 1.1 Create Twilio Account
- Go to https://www.twilio.com/try-twilio
- Sign up with your email
- Verify your phone number (you'll receive a code via SMS)
- Create your account

### 1.2 Get Credentials
- Go to **Console Dashboard** (https://console.twilio.com)
- Find your **Account SID** (under Account Info)
- Find your **Auth Token** (under Account Info, click "show")
- Copy both values

### 1.3 Enable WhatsApp
- Go to **Messaging > Whatsapp Sandbox**
- You'll see a number like: `whatsapp:+14155238886`
- Copy this exact number
- Follow the instructions to add your personal phone number to the sandbox by sending the join code to the sandbox number

### 1.4 Send Test Message (to verify)
- Send a message to the WhatsApp sandbox number with the provided code
- You should receive a confirmation message back

---

## Step 2: Update Environment Variables

Add to your `.env.local` file:

```dotenv
# Existing Supabase credentials
VITE_SUPABASE_URL=https://yzllccjyrcxqrqbxvmrz.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_ROkIiy6K46hO7oC78ijgIg_pfAKG3Vp

# Twilio WhatsApp Credentials
VITE_TWILIO_ACCOUNT_SID=your_account_sid_here
VITE_TWILIO_AUTH_TOKEN=your_auth_token_here
VITE_TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**Replace with your actual credentials from Step 1.2 and 1.3**

---

## Step 3: Run Database Migration

### 3.1 In Supabase
1. Go to **SQL Editor**
2. Create new query
3. Copy all SQL from `WHATSAPP_OTP_SETUP.sql` in your project
4. Run the migration

This creates:
- `phone_number` column in users table
- `otp_verifications` table
- Proper indexes for performance
- Row-Level Security policies

---

## Step 4: Update Auth Page to Collect Phone Number

The Auth page will be updated to:
1. Add a phone number input field
2. Format the phone number to international format
3. Store the phone number in the users table during sign-up

**Example Flow:**
1. User signs up with name, email, password, and **phone number**
2. Account created in Supabase
3. User profile created with phone number
4. User can now receive WhatsApp OTP

---

## Step 5: Integration Points

### OTP Generation & Sending
```typescript
// When user needs OTP (during sensitive operations):
const { generateAndSendOTP } = useOTPVerification();
await generateAndSendOTP(userId, phoneNumber);

// User receives OTP on WhatsApp within seconds
```

### OTP Verification
```typescript
// User enters OTP code from WhatsApp message:
const { verifyOTP } = useOTPVerification();
const result = await verifyOTP(userId, '123456');

// If verified, proceed with login
```

### Login Notification
- After successful sign-in, send welcome message
- User receives: "Welcome to Nexora! You've logged in successfully."

---

## Step 6: Test the Integration

### Testing Flow

1. **Sign Up with WhatsApp**
   - Go to http://localhost:3000/auth
   - Click "Sign up"
   - Fill in:
     - Full Name: Test User
     - Email: test@example.com
     - Phone: +1234567890 (use YOUR actual phone number)
     - Password: password123
   - Click "Sign Up"

2. **Wait for OTP**
   - Check your WhatsApp for OTP code
   - Should arrive within 1-2 seconds
   - Message format: "Your Nexora verification code is: 123456"

3. **Verify OTP**
   - Page shows OTP input field
   - Enter the 6-digit code
   - Click "Verify"

4. **Login Notification**
   - After verification, receive welcome message
   - Message: "Welcome to Nexora! You've logged in."
   - Redirected to Dashboard

---

## API Endpoints Needed

Create this endpoint on your backend (Node.js/Express or similar):

```javascript
// POST /api/send-otp
app.post('/api/send-otp', async (req, res) => {
  const { phoneNumber, otp } = req.body;
  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = twilio(accountSid, authToken);
    
    const message = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${phoneNumber}`,
      body: `Your Nexora verification code is: ${otp}\n\nThis code expires in 10 minutes.`
    });
    
    res.json({ success: true, sid: message.sid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Phone Number Format

The system accepts phone numbers in these formats:
- `+1234567890` (E.164 format - recommended)
- `1234567890` (will be converted to +1234567890)
- `+1 (234) 567-8900` (will be parsed)

---

## OTP Code Lifecycle

1. **Generated**: Random 6-digit code
2. **Sent**: Delivered via WhatsApp
3. **Awaiting Verification**: User has 10 minutes
4. **Verified**: User enters correct code
5. **Expired**: After 10 minutes, need to request new OTP
6. **Failed Attempts**: 3 wrong attempts = need new OTP

---

## Security Features

✅ OTP expires after 10 minutes
✅ Limited to 3 verification attempts
✅ OTP stored in database (hashed in production)
✅ Only associated user can verify their OTP
✅ Phone number validated before sending
✅ Attempt tracking prevents brute force

---

## Troubleshooting

### Issue: "WhatsApp message not received"
**Solutions:**
1. Verify phone is added to Twilio sandbox
2. Check phone is joined with sandbox (send join code)
3. Verify credentials are correct in .env.local
4. Check phone has WhatsApp installed
5. Wait 1-2 seconds (messages are sent async)

### Issue: "Invalid phone number"
**Solutions:**
1. Use E.164 format: +1234567890
2. Include country code (e.g., +91 for India)
3. Use actual phone number, not landline

### Issue: "OTP not found"
**Solutions:**
1. Verify user was created properly
2. Check database has otp_verifications table
3. Check RLS policies are correct

### Issue: "Too many attempts"
**Solutions:**
1. Request new OTP (resend)
2. Wait 10 minutes to reset

---

## Production Deployment

### Before Going Live:

1. **Upgrade Twilio Account**
   - Move from WhatsApp Sandbox to Production
   - Request WhatsApp Business Account approval
   - Upload business documentation

2. **Update Phone Numbers**
   - Use your official business WhatsApp number
   - Not sandbox number

3. **Message Templates**
   - Create official message templates in WhatsApp Business API
   - Get approval from WhatsApp

4. **Rate Limiting**
   - Add rate limiting: 1 OTP request per 30 seconds per user
   - Add rate limiting: 1 OTP verification attempt per 2 seconds

5. **Logging & Monitoring**
   - Log all OTP sends and verifications
   - Set up Sentry for error tracking
   - Monitor Twilio API usage

---

## Feature Additions

### Phase 2 (Future):
- [ ] SMS fallback if WhatsApp fails
- [ ] QR code OTP authentication
- [ ] Biometric verification via WhatsApp Business API
- [ ] Bill payment reminders via WhatsApp
- [ ] Daily expense summaries via WhatsApp
- [ ] Interactive WhatsApp commands

---

## File Reference

- **whatsapp.ts**: Twilio client and message sending functions
- **useOTPVerification.ts**: React hook for OTP lifecycle
- **WHATSAPP_OTP_SETUP.sql**: Database migration
- **Auth.tsx**: Updated with phone number collection (to be updated)

---

## Support

- **Twilio Console**: https://console.twilio.com
- **Twilio Docs**: https://www.twilio.com/docs/whatsapp
- **Support Hours**: Contact Twilio support for account issues

---

## Cost Overview

**Twilio Pricing:**
- WhatsApp messages: ~$0.05 per message
- SMS fallback: ~$0.01 per message
- Free tier: 500 messages included

For 1000 users sending 1 OTP each: ~$50

---

**Integration Complete!** 🎉

Your Nexora application now sends OTP via WhatsApp for secure login verification.
