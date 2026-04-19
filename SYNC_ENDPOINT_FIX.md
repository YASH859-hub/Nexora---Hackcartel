# Sync Endpoint - Fixed & Troubleshooting

## ✅ What Was Fixed

### Issue 1: Wrong Backend URL
**Problem**: Sync button was trying to call `/api/gmail/sync-user` (relative path) which doesn't work when backend is on different port
**Solution**: Updated to use `VITE_BACKEND_BASE` environment variable
```typescript
// Before:
const response = await fetch('/api/gmail/sync-user', ...)

// After:
const BACKEND_BASE = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:5000';
const response = await fetch(`${BACKEND_BASE}/api/gmail/sync-user`, ...)
```

### Issue 2: Error Display
**Problem**: Sync errors weren't shown to user in UI
**Solution**: Added yellow alert banner to display sync failures
```
┌─────────────────────────────────┐
│ ⚠️  Sync issue: [error message]  │
│ [Retry Sync] button              │
└─────────────────────────────────┘
```

## 🚀 How to Test

### Option A: Backend Running on Port 5000 (default)

```bash
# Terminal 1: Start backend
cd backend
npm run dev
# Should see: "🚀 Nexora Backend running on http://localhost:5000"

# Terminal 2: Start frontend
npm run dev
# Navigate to Dashboard → Events section
# Click "Sync Now" button
# Should see: "Syncing..." → Success
```

### Option B: Backend on Different Port

If backend is running on a different port (e.g., 6000), set environment variable:

```bash
# In .env file at repo root
VITE_BACKEND_BASE=http://localhost:6000

# Then restart frontend dev server
npm run dev
```

### Option C: Test Sync Endpoint Directly

```bash
# With backend running, test endpoint:
curl -X POST http://localhost:5000/api/gmail/sync-user \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-123"}'

# Expected response:
{
  "success": true,
  "message": "Gmail sync initiated",
  "userId": "test-user-123",
  "itemsAdded": 0,
  "itemsUpdated": 0,
  "note": "Full Gmail API integration coming soon. Client handles encryption."
}
```

## 🐛 Troubleshooting

### Symptom: "Sync Now" button does nothing
**Check**:
1. Is backend running? `curl http://localhost:5000/health`
2. Check browser console for error messages (F12 → Console)
3. Check Network tab to see if request is being sent
4. If request fails, check VITE_BACKEND_BASE setting

### Symptom: "Sync failed: 404"
**Cause**: Backend endpoint not found
**Fix**: Ensure backend is running on correct port
```bash
cd backend && npm run dev
# Verify you see: "📨 POST /api/gmail/sync-user — sync encrypted inbox"
```

### Symptom: "Sync failed: 500"
**Cause**: Backend error
**Fix**: Check backend logs for detailed error message

### Symptom: CORS error in browser
**Cause**: Backend CORS configuration issue
**Fix**: Ensure backend CORS allows localhost:5173 (Vite default)
```typescript
// In backend/src/server.ts:
cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
})
```

## 📝 Sync Endpoint Details

**Endpoint**: `POST /api/gmail/sync-user`
**Port**: 5000 (default) - Configurable via `VITE_BACKEND_BASE`
**Request**:
```json
{
  "userId": "user-id-string"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Gmail sync initiated",
  "userId": "user-id-string",
  "itemsAdded": 0,
  "itemsUpdated": 0,
  "note": "Full Gmail API integration coming soon. Client handles encryption."
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "userId is required"
}
```

## 📱 Frontend Integration

The sync button is in the **Private Inbox** section of Dashboard:
- Location: Main Dashboard → Secure Inbox section
- Button: "Sync Now" (shows "Syncing..." when active)
- Last synced time: Shown next to button
- Error display: Yellow alert banner below header

## ⚡ What Sync Does (Current)

1. ✅ Sends sync request to backend with userId
2. ✅ Logs request in backend console
3. ✅ Updates "Last synced" timestamp
4. ✅ Refreshes inbox display

**Future enhancements**:
- [ ] Fetch emails from Gmail API
- [ ] Encrypt emails on client
- [ ] Store in user_inbox_items table
- [ ] Update sync checkpoint

## 🔧 To Run Right Now

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend (after backend is running)
npm run dev

# Navigate to http://localhost:5173/dashboard
# Click "Events" section
# Look for "Secure Inbox" section
# Click "Sync Now" button
# Should show success message
```

---

**Status**: ✅ Fixed and ready to test. All builds passing.
