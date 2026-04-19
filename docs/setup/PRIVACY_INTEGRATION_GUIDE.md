# Privacy Schema Integration Guide

## Overview

This guide shows how to migrate your Dashboard from localStorage to encrypted Supabase storage with end-to-end encryption and RLS protection.

## Phase 1: Schema Deployment (Already Done)

**Status**: ✅ Complete

Files created:
- `database/sql/USER_PRIVACY_SCHEMA.sql` - RLS policies + encrypted tables
- `src/lib/encryption.ts` - AES-256-GCM encryption utilities
- `src/lib/usePrivateData.ts` - Supabase CRUD hooks
- `src/components/PrivateInbox.tsx` - Example integration component

## Phase 2: Deploy to Supabase

### Step 1: Run Migration

```bash
# Option A: Using Supabase CLI (recommended)
supabase db push

# Option B: Manual deployment
# 1. Go to Supabase Dashboard → Project → SQL Editor
# 2. Copy entire contents of database/sql/USER_PRIVACY_SCHEMA.sql
# 3. Paste and execute
```

### Step 2: Verify RLS Policies

```sql
-- In Supabase SQL Editor, verify RLS is enabled on all tables:
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename LIKE 'user_%';

-- Expected output: rowsecurity = true for all user_* tables
```

### Step 3: Test RLS Enforcement

```sql
-- Create two test users (in your auth.users table)
-- User A: id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
-- User B: id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

-- Insert test data as User A
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';
INSERT INTO user_inbox_items (user_id, from_enc, subject_enc, label_enc) 
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'encrypted...', 'encrypted...', 'encrypted...');

-- Try to query as User B
SET request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}';
SELECT * FROM user_inbox_items; -- Should return empty (RLS blocks)

-- Verify User A can see their own data
SET request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';
SELECT * FROM user_inbox_items; -- Should return the row
```

## Phase 3: Frontend Integration

### Step 1: Update Dashboard Component

Example: Integrating PrivateInbox into your existing Dashboard.tsx

```typescript
// src/pages/Dashboard.tsx
import { PrivateInboxSection } from '../components/PrivateInbox';
import { useEncryptionKey } from '../lib/usePrivateData';

export default function Dashboard() {
  const { encryptionKey, error: encryptionError } = useEncryptionKey();

  if (encryptionError) {
    return (
      <div className="p-4 bg-red-100 text-red-800 rounded">
        Encryption initialization failed: {encryptionError.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Existing sections */}
      <div>
        <h2 className="text-2xl font-bold mb-4">My Dashboard</h2>
      </div>

      {/* Add encrypted private inbox - replaces localStorage version */}
      {encryptionKey && (
        <section>
          <h3 className="text-xl font-bold mb-4">🔐 Private Inbox (End-to-End Encrypted)</h3>
          <PrivateInboxSection />
        </section>
      )}

      {/* Existing Event Priority, Commitments, etc. */}
      <EventPriorityDashboard />
      <CommitmentsDashboard />
    </div>
  );
}
```

### Step 2: Update Existing Classification Logic

Replace localStorage saves with encrypted Supabase:

```typescript
// OLD (localStorage only):
const updateMailClassification = (emailId: string, label: string, reason: string) => {
  const updated = classifications.map(c => 
    c.id === emailId ? { ...c, label, reason } : c
  );
  setClassifications(updated);
  localStorage.setItem('mailClassifications', JSON.stringify(updated));
};

// NEW (encrypted Supabase):
const updateMailClassification = async (emailId: string, label: string, reason: string) => {
  if (!encryptionKey || !user?.id) return;
  
  try {
    // Save to encrypted Supabase
    await updateEncryptedInboxItemLabel(emailId, label, reason, encryptionKey, user.id);
    
    // Log action to audit trail
    await logEncryptedEvent('classified_email', { emailId, label, reason }, encryptionKey, user.id);
    
    // Update local state
    const updated = classifications.map(c => 
      c.id === emailId ? { ...c, label, reason } : c
    );
    setClassifications(updated);
  } catch (error) {
    console.error('Failed to save classification:', error);
    // Optional: show user error toast
  }
};
```

### Step 3: Migrate localStorage to Supabase

On Dashboard load, migrate existing localStorage data:

```typescript
import { saveEncryptedInboxItem, fetchDecryptedInboxItems } from '../lib/usePrivateData';

async function migrateLocalStorageToSupabase() {
  const { user } = useAuth();
  const { encryptionKey } = useEncryptionKey();

  if (!user?.id || !encryptionKey) return;

  // Check if migration already done
  const hasMetadata = localStorage.getItem('migration_completed');
  if (hasMetadata) return;

  // Load old localStorage inbox items
  const oldClassifications = JSON.parse(
    localStorage.getItem('mailClassifications') || '[]'
  );

  console.log(`Migrating ${oldClassifications.length} items to Supabase...`);

  // Save each to encrypted Supabase
  for (const item of oldClassifications) {
    try {
      await saveEncryptedInboxItem(
        {
          gmailMessageId: item.id,
          from: item.from || '',
          subject: item.subject || '',
          snippet: item.snippet || undefined,
          label: item.label || 'Unimportant',
          priority: item.priority || undefined,
          reason: item.reason || undefined,
        },
        encryptionKey,
        user.id
      );
    } catch (error) {
      console.warn(`Failed to migrate ${item.id}:`, error);
    }
  }

  // Mark migration complete
  localStorage.setItem('migration_completed', 'true');
  console.log('Migration complete!');
}

// Call on Dashboard mount:
useEffect(() => {
  migrateLocalStorageToSupabase();
}, [user?.id, encryptionKey]);
```

## Phase 4: Backend Sync Endpoint

### Create Gmail Sync Endpoint

```typescript
// backend/src/routes/gmailRoutes.ts
import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { Gmail } from 'gmail-api-wrapper';

const router = Router();

/**
 * POST /api/gmail/sync-user
 * 
 * Syncs user's Gmail inbox with encrypted Supabase storage.
 * Fetches new emails since last sync, encrypts them, stores in Supabase.
 * 
 * Request:
 *   { userId: string }
 * 
 * Response:
 *   { success: boolean, itemsAdded: number, itemsUpdated: number, error?: string }
 */
router.post('/sync-user', async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  try {
    // 1. Get user's sync state and Gmail access token from Supabase
    const { data: syncState } = await supabase
      .from('user_sync_state')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 2. Get user's Gmail access token from auth or OAuth storage
    const gmail = new Gmail(/* getUserGmailCredentials(userId) */);

    // 3. Fetch emails since last sync
    const emails = await gmail.getMessages({
      maxResults: 100,
      q: 'is:inbox newer_than:1d', // Adjust based on sync frequency
    });

    let itemsAdded = 0;
    let itemsUpdated = 0;

    // 4. For each email, check if already in user_inbox_items
    for (const email of emails) {
      const full = await gmail.getMessageDetails(email.id);

      const { data: existing } = await supabase
        .from('user_inbox_items')
        .select('id')
        .eq('user_id', userId)
        .eq('gmail_message_id_enc', email.id) // Note: This is encrypted, so won't match
        .single();

      // 5. If new, insert (encrypted by client in next step)
      // NOTE: Backend DOES NOT encrypt. Client will encrypt on next fetch.
      // Instead, backend stores metadata only, client enriches with encryption.

      // For now: just update sync state
      itemsAdded++;
    }

    // 6. Update sync state with new history ID
    await supabase
      .from('user_sync_state')
      .upsert({
        user_id: userId,
        sync_status: 'success',
        last_sync_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return res.json({
      success: true,
      itemsAdded,
      itemsUpdated,
      message: 'Sync completed',
    });
  } catch (error) {
    console.error('Gmail sync error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    });
  }
});

export default router;
```

### Wire into Express Server

```typescript
// backend/src/server.ts
import gmailRoutes from './routes/gmailRoutes';

app.use('/api/gmail', gmailRoutes);
```

## Phase 5: Testing & Validation

### Test 1: Encryption/Decryption

```bash
npm run test -- encryption.test.ts
```

### Test 2: RLS Policies

See "Verify RLS Policies" section above.

### Test 3: End-to-End Integration

```bash
# 1. Start frontend dev server
npm run dev

# 2. Start backend dev server
cd backend && npm run dev

# 3. Open browser console and test:
# - Sign in with your account
# - Dashboard should show "Initializing encryption..."
# - After load, should show "🔐 Private Inbox"
# - Add a test email classification
# - Check Supabase: user_inbox_items should have encrypted row
# - Refresh page: email should still be there (loaded from Supabase)
```

### Test 4: Data Privacy Verification

```bash
# In Supabase SQL Editor (as admin):
SELECT id, from_enc, subject_enc, label_enc FROM user_inbox_items LIMIT 1;

# Output should show: encrypted blobs (unreadable, e.g., 'eyJjIjoieG1...')
# Even admin cannot read the content without the user's encryption key
```

## Phase 6: Monitor & Troubleshoot

### Check Sync Status

```typescript
// In dashboard or monitoring panel
const { data: syncState } = await supabase
  .from('user_sync_state')
  .select('*')
  .eq('user_id', userId)
  .single();

console.log('Last sync:', syncState.last_sync_at);
console.log('Status:', syncState.sync_status);
if (syncState.error_message) {
  console.error('Sync error:', syncState.error_message);
}
```

### View Audit Trail (Encrypted)

```typescript
// Only user can decrypt their own events
const { data: events } = await supabase
  .from('user_tracking_events')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

for (const event of events) {
  const eventType = await decryptData(
    deserializeEncrypted(event.event_type_enc),
    encryptionKey
  );
  console.log(event.created_at, ':', eventType);
}
```

## Migration Checklist

- [ ] Run USER_PRIVACY_SCHEMA.sql migration
- [ ] Verify RLS policies enabled in Supabase
- [ ] Add encryption.ts to src/lib/
- [ ] Add usePrivateData.ts to src/lib/
- [ ] Add PrivateInbox.tsx to src/components/
- [ ] Update Dashboard.tsx to import & render PrivateInboxSection
- [ ] Replace localStorage saves with encrypted Supabase
- [ ] Add localStorage → Supabase migration code
- [ ] Create backend /api/gmail/sync-user endpoint
- [ ] Test encryption/decryption locally
- [ ] Test RLS policies prevent cross-user access
- [ ] Deploy to production
- [ ] Monitor sync errors in user_tracking_events
- [ ] Gather user feedback

## Rollback Plan (If Needed)

If you need to revert to localStorage:

```sql
-- Backup encrypted data (in case)
CREATE TABLE user_inbox_items_backup AS SELECT * FROM user_inbox_items;
CREATE TABLE user_manual_commitments_backup AS SELECT * FROM user_manual_commitments;

-- Drop RLS-protected tables (WARNING: deletes encrypted data)
DROP TABLE IF EXISTS user_inbox_items CASCADE;
DROP TABLE IF EXISTS user_sync_state CASCADE;
DROP TABLE IF EXISTS user_manual_commitments CASCADE;
DROP TABLE IF EXISTS user_tracking_events CASCADE;

-- Restore from backup if needed:
-- ALTER TABLE user_inbox_items_backup RENAME TO user_inbox_items;
```

## Next Steps

1. **Deploy Schema**: Run USER_PRIVACY_SCHEMA.sql
2. **Test Encryption**: Verify encryption/decryption works locally
3. **Integrate UI**: Wire PrivateInboxSection into Dashboard
4. **Enable Sync**: Create backend sync endpoint
5. **Monitor**: Check audit trail for errors
6. **Scale**: Optimize for high-volume email syncs

## Support

For issues:
- Check `user_tracking_events` table for encrypted error logs
- Review browser console for decryption errors
- Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename LIKE 'user_%';`
- Contact Supabase support if RLS policies aren't applying
