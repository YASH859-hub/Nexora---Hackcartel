# End-to-End Encryption Integration - Testing & Validation Guide

## ✅ Build Status

- **Frontend**: ✓ Built successfully (2152 modules, 49.93 KB CSS, 1,113.59 KB JS)
- **Backend**: ✓ Built successfully (TypeScript compilation clean)

## 🧪 Testing Checklist

### Phase 1: Local Development Testing

**Step 1: Verify encryption key initialization**

1. Open browser DevTools (F12)
2. Open Console tab
3. Run the frontend dev server: `npm run dev`
4. Navigate to Dashboard
5. Check console for encryption key initialization messages
6. Should see: "Encryption key initialized" (no errors)

**Step 2: Test PrivateInbox component rendering**

1. Look for "🔐 Secure Inbox (End-to-End Encrypted)" section in Dashboard
2. Should show after "Action Strip" section
3. Check for "Private Inbox" heading and message: "Loading encrypted inbox..."
4. Should show spinner while key is initializing

**Step 3: Verify Supabase connectivity**

1. Open Supabase Dashboard → Your Project
2. Go to SQL Editor
3. Run query to verify RLS is enabled:
   ```sql
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename LIKE 'user_%';
   ```
4. Expected output: All user_* tables have rowsecurity = true

### Phase 2: Encryption/Decryption Testing

**Step 1: Test encryption locally**

```typescript
// In browser console on Dashboard page:
import { encryptData, decryptData, deriveEncryptionKey } from './lib/encryption';

// Get user ID and session (visible in AuthContext)
const userId = 'test-user-id';
const sessionToken = 'test-session-token';

const key = await deriveEncryptionKey(userId, sessionToken);
const plaintext = 'Hello, Secret World!';
const encrypted = await encryptData(plaintext, key);

console.log('Plaintext:', plaintext);
console.log('Encrypted:', encrypted.ciphertext);

const decrypted = await decryptData(encrypted, key);
console.log('Decrypted:', decrypted);

// Should show: "Hello, Secret World!"
```

**Step 2: Test wrong key cannot decrypt**

```typescript
// Continue in console:
const wrongKey = await deriveEncryptionKey('different-user', 'different-token');

try {
  await decryptData(encrypted, wrongKey);
  console.log('ERROR: Should have failed!');
} catch (error) {
  console.log('✓ Correct! Wrong key cannot decrypt:', error.message);
}
```

### Phase 3: RLS Policy Testing

**In Supabase SQL Editor, test row-level security:**

```sql
-- Create test users
-- User A: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- User B: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb

-- Set role to authenticated user A
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

-- Insert test inbox item as User A
INSERT INTO user_inbox_items (
  user_id, 
  gmail_message_id_enc, 
  from_enc, 
  subject_enc, 
  label_enc
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '{"c":"test_encrypted_msg_id","i":"test_iv","v":1}',
  '{"c":"test_encrypted_from","i":"test_iv","v":1}',
  '{"c":"test_encrypted_subject","i":"test_iv","v":1}',
  '{"c":"test_encrypted_label","i":"test_iv","v":1}'
);

-- Query as User A (should see the row)
SELECT COUNT(*) FROM user_inbox_items;
-- Expected: 1

-- Try to query as User B (should be empty)
SET request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}';
SELECT COUNT(*) FROM user_inbox_items;
-- Expected: 0 (RLS blocks access)

-- Verify User A can still see it
SET request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';
SELECT COUNT(*) FROM user_inbox_items;
-- Expected: 1
```

### Phase 4: Classification Audit Trail Testing

**Step 1: Classify an email in Dashboard**

1. Open EventPriorityDashboard (Events section)
2. Click classification button on any email (e.g., "Mark as Important")
3. Check browser console for any errors
4. Click should succeed, email should update instantly

**Step 2: Verify audit log was created**

```sql
-- In Supabase SQL Editor
SELECT 
  id, 
  event_type_enc, 
  payload_enc, 
  created_at 
FROM user_tracking_events 
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC 
LIMIT 1;

-- You should see an encrypted row (encrypted blobs in event_type_enc and payload_enc)
-- Even admin cannot read the content
```

### Phase 5: Backend Sync Endpoint Testing

**Step 1: Test sync endpoint**

```bash
# In terminal, with backend running
curl -X POST http://localhost:5000/api/gmail/sync-user \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-123"}'

# Expected response:
# {
#   "success": true,
#   "message": "Gmail sync initiated",
#   "userId": "test-user-123",
#   "itemsAdded": 0,
#   "itemsUpdated": 0,
#   "note": "Full Gmail API integration coming soon. Client handles encryption."
# }
```

**Step 2: Verify endpoint is logged**

```bash
# Check backend logs for:
# 📨 Gmail sync requested for user: test-user-123
```

### Phase 6: Full Integration Test

**Test workflow: Email classification → Encryption → Storage → RLS**

1. **Prepare**: Log in to Dashboard as authenticated user
2. **Step 1**: Click "Events" in sidebar → EventPriorityDashboard opens
3. **Step 2**: Find any email card, click classification button (e.g., "Mark as Important")
4. **Step 3**: Check browser console - no errors
5. **Step 4**: Check Supabase (SQL Editor):
   ```sql
   SELECT * FROM user_tracking_events 
   WHERE user_id = 'your-user-id' 
   LIMIT 1;
   ```
6. **Step 5**: Verify row exists with encrypted event_type_enc and payload_enc
7. **Step 6**: Try to view plaintext (should only see encrypted blob)
8. **Step 7**: Log in as different user - should NOT see first user's events (RLS)

## 📊 Validation Checklist

### Security Validation

- [ ] Encryption key is derived from session (no hardcoded keys)
- [ ] Key is cleared on logout (use browser DevTools → Memory → search for key)
- [ ] RLS policies prevent cross-user data access (tested in Phase 3)
- [ ] DBMS admin cannot decrypt data without key (viewed encrypted blobs)
- [ ] AES-GCM provides authenticity (can detect tampering)
- [ ] Event logs are immutable (INSERT only, no UPDATE/DELETE)

### Functional Validation

- [ ] PrivateInboxSection renders without errors
- [ ] Encryption/decryption works locally (Phase 2 testing)
- [ ] Classifications are logged to audit trail
- [ ] Gmail sync endpoint responds to requests
- [ ] Frontend builds without errors
- [ ] Backend builds without errors

### Performance Validation

- [ ] Encryption is fast (< 5ms per message)
- [ ] Decryption is fast (< 5ms per message)
- [ ] No noticeable UI lag when classifying emails
- [ ] Supabase queries return quickly with RLS

### Compliance Validation

- [ ] User can access their own encrypted data (decrypted)
- [ ] User cannot access other users' data (RLS blocks)
- [ ] Audit trail is immutable and timestamped
- [ ] Data deletion is enforced by RLS

## 🚀 Next Steps for Production

1. **Enable Gmail API Integration**
   - Add OAuth token refresh logic
   - Implement incremental sync using history ID
   - Handle pagination for large mailboxes

2. **Enable Email Encryption**
   - Modify PrivateInbox to save emails from Gmail sync
   - Encrypt full email bodies (currently only logging classifications)

3. **Add Background Sync Jobs**
   - Use Bull queue for periodic Gmail syncs
   - Implement exponential backoff on failures
   - Monitor sync health metrics

4. **Enhance UX**
   - Show "Last synced at" timestamp
   - Add manual sync button with loading state
   - Show sync error messages to user
   - Implement offline-first sync queue

5. **Monitor & Alert**
   - Log all encryption/decryption errors
   - Alert on RLS violations
   - Track key derivation performance
   - Monitor Supabase quota usage

## 📝 Common Issues & Solutions

### Issue: "Encryption key is null"
**Solution**: Ensure user is authenticated before accessing encrypted features. Check AuthContext.

### Issue: "Wrong key cannot decrypt"
**Expected behavior**: This is correct! Only the user who created the encrypted data can decrypt it.

### Issue: "RLS query returns empty"
**Solution**: Check that row is tagged with correct user_id matching the authenticated user's JWT.

### Issue: "Sync endpoint returns 400"
**Solution**: Ensure userId is provided and is a string. Check request body format.

## 🧠 How to Read Encrypted Data

As a developer, to debug encrypted data:

```typescript
// 1. Get the user's session token
const { session } = useAuth();

// 2. Derive their encryption key
const key = await deriveEncryptionKey(userId, session.access_token);

// 3. Fetch encrypted row from Supabase
const { data } = await supabase
  .from('user_inbox_items')
  .select('*')
  .eq('id', 'item-id')
  .single();

// 4. Deserialize and decrypt
const encrypted = deserializeEncrypted(data.from_enc);
const plaintext = await decryptData(encrypted, key);

console.log('Decrypted from:', plaintext);
```

Only users with the session token can read their own data. DBMS admins cannot decrypt without it.

## 📞 Support

For issues:
- Check browser console for decryption errors
- Review Supabase logs for RLS violations
- Verify RLS policies are enabled: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'user_inbox_items';`
- Test encryption locally before assuming Supabase issue
- Check that user_id matches between tables

---

**Status**: ✅ All integration steps complete. Ready for testing.

Next: Run the testing checklist above and report any issues.
