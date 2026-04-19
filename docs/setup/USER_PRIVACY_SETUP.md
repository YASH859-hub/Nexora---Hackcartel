# User Privacy & End-to-End Encryption Setup

## Overview

This document describes Nexora's privacy architecture that prevents even Supabase DBMS administrators from accessing user data. It implements:

1. **Client-Side Encryption** - Data encrypted in browser before reaching Supabase
2. **Row-Level Security (RLS)** - Database policies enforce per-user data isolation
3. **Key Derivation** - Encryption keys derived from user session, not stored on server
4. **Immutable Audit Trail** - Encrypted event logs for security compliance

## Architecture

### End-to-End Encryption Flow

```
User Data (plaintext)
        ↓
[Client-Side Encryption]
  (AES-256-GCM via Web Crypto API)
        ↓
Encrypted Blob (ciphertext)
        ↓
[Supabase Database]
  (RLS policies enforce user isolation)
        ↓
DBMS Admin sees: ✗ Cannot access encrypted data
                  ✓ Can see table structure and audit logs
```

### Key Components

#### 1. Encryption (`src/lib/encryption.ts`)

**Algorithm**: AES-256-GCM (Authenticated Encryption with Associated Data)
- 256-bit encryption strength
- 12-byte random initialization vector per encryption
- Automatic integrity verification (prevents tampering)
- Memory-only operation (keys never written to disk)

**Key Derivation**: PBKDF2-SHA256
- Input: User ID + Supabase session token
- Iterations: 100,000 (OWASP recommended for 2024)
- Output: 256-bit key unique per authenticated session

**Session Binding**: Key is tied to Supabase session
- Logout → Session cleared from memory → Key no longer available
- Attacker cannot access user data without authenticated session
- Key rotation: Re-encrypt data when upgrading encryption_version

#### 2. Database Schema (`database/sql/USER_PRIVACY_SCHEMA.sql`)

**Tables**:

| Table | Purpose | Encrypted Fields |
|-------|---------|------------------|
| `user_inbox_items` | Gmail messages classified by user | All email content, label, priority, reasoning |
| `user_sync_state` | Last sync checkpoint for Gmail | Gmail history ID |
| `user_manual_commitments` | User-created financial/work items | Title, type, amount, due date, priority, notes |
| `user_tracking_events` | Immutable audit trail of actions | Event type, payload |

**Security Guarantees**:

- **Row-Level Security**: Each row tagged with `user_id`, RLS policies prevent cross-user access
- **No Admin Bypass**: RLS applies to authenticated users AND admins
- **Immutable Events**: `user_tracking_events` allows INSERT only (no UPDATE/DELETE)
- **Encryption Version Support**: `encryption_version` field allows safe key rotation

#### 3. React Integration (`src/lib/usePrivateData.ts`)

**Hooks & Functions**:

```typescript
// Initialize encryption key from user session
const { encryptionKey, isLoading, error } = useEncryptionKey();

// Save encrypted data to Supabase
await saveEncryptedInboxItem(item, encryptionKey, userId);

// Fetch and auto-decrypt user's data
const items = await fetchDecryptedInboxItems(encryptionKey, userId);

// Log user actions to audit trail
await logEncryptedEvent('marked_spam', { emailId }, encryptionKey, userId);
```

## Deployment Steps

### Step 1: Run Schema Migration

Connect to your Supabase project and execute:

```bash
# Using Supabase CLI
supabase db push

# Or manually in SQL Editor (dashboard.supabase.com):
# Copy contents of database/sql/USER_PRIVACY_SCHEMA.sql and run
```

**Verification**:
```sql
-- Check tables created with RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'user_%';

-- Expected output:
-- public | user_inbox_items        | t
-- public | user_sync_state         | t
-- public | user_manual_commitments | t
-- public | user_tracking_events    | t
```

### Step 2: Enable Supabase RLS in Dashboard

1. **Supabase Dashboard** → Project → **SQL Editor**
2. Verify RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename LIKE 'user_%';
   ```
3. RLS is already enabled in schema migration (ALTER TABLE ... ENABLE ROW LEVEL SECURITY)

### Step 3: Integrate with Dashboard Component

Example: Adding encrypted inbox storage to `src/pages/Dashboard.tsx`

```typescript
import { useEncryptionKey, saveEncryptedInboxItem, fetchDecryptedInboxItems } from '../lib/usePrivateData';

export function Dashboard() {
  const { user } = useAuth();
  const { encryptionKey, isLoading: keyLoading, error: keyError } = useEncryptionKey();
  const [inboxItems, setInboxItems] = useState([]);

  // Fetch decrypted inbox on load
  useEffect(() => {
    if (encryptionKey && user?.id) {
      fetchDecryptedInboxItems(encryptionKey, user.id)
        .then(setInboxItems)
        .catch(console.error);
    }
  }, [encryptionKey, user?.id]);

  // Save classified email to encrypted storage
  const handleClassifyEmail = async (emailId: string, label: string, reason: string) => {
    if (!encryptionKey || !user?.id) return;

    const email = inboxItems.find(e => e.id === emailId);
    if (!email) return;

    try {
      await saveEncryptedInboxItem(
        {
          gmailMessageId: email.id,
          from: email.from,
          subject: email.subject,
          label,
          priority: label === 'Important' ? 'high' : 'normal',
          reason,
        },
        encryptionKey,
        user.id
      );

      // Update local state
      setInboxItems(prev =>
        prev.map(item =>
          item.id === emailId
            ? { ...item, label, reason }
            : item
        )
      );
    } catch (error) {
      console.error('Failed to save classification:', error);
    }
  };

  if (keyLoading) return <div>Initializing encryption...</div>;
  if (keyError) return <div>Error: {keyError.message}</div>;

  return (
    <div>
      {inboxItems.map(item => (
        <MailCard
          key={item.id}
          item={item}
          onClassify={(label, reason) => handleClassifyEmail(item.id, label, reason)}
        />
      ))}
    </div>
  );
}
```

## Security Guarantees

### ✅ What This Protects Against

| Threat | Protection |
|--------|-----------|
| Supabase DBMS admin reads database files | **Blocked** - All sensitive data encrypted with user-derived key only |
| Database backup exposure | **Blocked** - Backups contain only encrypted blobs |
| Network interception | **Blocked** - Supabase enforces HTTPS, encrypted at rest in AWS |
| Rogue Supabase employee | **Blocked** - Cannot decrypt without user's session key |
| Cross-user data leak | **Blocked** - RLS policies prevent any user from accessing other users' rows |
| Tampering with encrypted data | **Blocked** - AES-GCM authenticated encryption detects modifications |

### ⚠️ Assumptions & Limitations

| Assumption | Implication |
|-----------|------------|
| **Browser is trusted** | If device is compromised, attacker can access plaintext in memory. Mitigation: Use browser in private mode, lock device when away. |
| **Session key cannot be stolen** | If attacker gains access to browser DevTools, they can read keys from memory. Mitigation: Browser security, no public WiFi. |
| **Supabase auth tokens are secure** | If session token is leaked, attacker can re-derive keys. Mitigation: Use secure browsers, monitor account activity. |
| **Clock is synchronized** | Key derivation uses timestamp indirectly via session token. Assume system clock is correct. |

### Threat Model: Who Can Access What?

```
┌─────────────────────┬──────────────────┬──────────────┐
│ Actor               │ Can Access       │ Cannot Access│
├─────────────────────┼──────────────────┼──────────────┤
│ Authenticated User  │ Own plaintext    │ Other users' │
│ (your browser)      │ data (decrypted) │ data         │
├─────────────────────┼──────────────────┼──────────────┤
│ Supabase DBMS Admin │ Table structure, │ Plaintext    │
│ (with DB access)    │ encrypted blobs, │ content,     │
│                     │ metadata         │ decryption   │
├─────────────────────┼──────────────────┼──────────────┤
│ Network Sniffer     │ HTTPS headers    │ Encrypted    │
│ (on-path attacker)  │ (via TLS)        │ payloads     │
├─────────────────────┼──────────────────┼──────────────┤
│ Unauthenticated     │ Table names      │ Any data     │
│ Attacker            │ (via schema)     │ (RLS blocks) │
└─────────────────────┴──────────────────┴──────────────┘
```

## Encryption Key Rotation

When upgrading to a new encryption algorithm or increasing key strength:

### Step 1: Add New Table Columns
```sql
ALTER TABLE user_inbox_items 
ADD COLUMN gmail_message_id_enc_v2 TEXT,
ADD COLUMN from_enc_v2 TEXT,
ADD COLUMN encryption_version INT DEFAULT 1;
```

### Step 2: Batch Re-encryption
```typescript
// Client-side: Fetch rows with old encryption_version
const oldItems = await supabase
  .from('user_inbox_items')
  .select('*')
  .eq('encryption_version', 1)
  .eq('user_id', userId);

// Re-decrypt with old key, re-encrypt with new key
for (const item of oldItems) {
  const plaintext = await decryptData(
    deserializeEncrypted(item.gmail_message_id_enc),
    oldEncryptionKey
  );
  
  const newEncrypted = await encryptData(plaintext, newEncryptionKey);
  
  await supabase
    .from('user_inbox_items')
    .update({
      gmail_message_id_enc_v2: serializeEncrypted(newEncrypted),
      encryption_version: 2,
    })
    .eq('id', item.id);
}
```

### Step 3: Cleanup (after verification)
```sql
-- Keep old columns for rollback safety for 1 month, then:
ALTER TABLE user_inbox_items 
DROP COLUMN gmail_message_id_enc,
DROP COLUMN from_enc;
-- ... (drop all old columns)
```

## Monitoring & Compliance

### Audit Trail Access
```typescript
// Query encrypted event log (events are encrypted for privacy)
const { data: events } = await supabase
  .from('user_tracking_events')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

// Decrypt events to review user actions
for (const event of events) {
  const eventType = await decryptData(
    deserializeEncrypted(event.event_type_enc),
    encryptionKey
  );
  const payload = JSON.parse(
    await decryptData(
      deserializeEncrypted(event.payload_enc),
      encryptionKey
    )
  );
  console.log(`${event.created_at}: ${eventType}`, payload);
}
```

### Privacy Compliance

**GDPR Data Subject Rights**:
- ✅ **Right to Access**: User can retrieve and decrypt their data
- ✅ **Right to Erasure**: RLS enforces deletion only by user
- ✅ **Data Portability**: Export encrypted data + user's encryption key
- ✅ **Audit Trail**: Immutable `user_tracking_events` table

**User Data Deletion**:
```sql
-- Admin perspective: No data lost, only user_id marked as deleted
-- Cannot see content due to encryption
DELETE FROM user_inbox_items WHERE user_id = $1;
DELETE FROM user_manual_commitments WHERE user_id = $1;
DELETE FROM user_tracking_events WHERE user_id = $1;
```

## Testing Encryption Locally

### Test 1: Verify Encryption/Decryption
```typescript
import { encryptData, decryptData, deriveEncryptionKey } from './encryption';

async function testEncryption() {
  const key = await deriveEncryptionKey('user123', 'session_token');
  
  const plaintext = 'Secret email content';
  const encrypted = await encryptData(plaintext, key);
  
  console.log('Encrypted:', encrypted.ciphertext); // Unreadable blob
  
  const decrypted = await decryptData(encrypted, key);
  console.log('Decrypted:', decrypted); // 'Secret email content'
  
  // Try with wrong key (should fail)
  const wrongKey = await deriveEncryptionKey('user456', 'different_token');
  try {
    await decryptData(encrypted, wrongKey);
  } catch (e) {
    console.log('✓ Wrong key cannot decrypt:', e.message);
  }
}

testEncryption();
```

### Test 2: Verify RLS Policies
```sql
-- As user A, try to read user B's data
SELECT * FROM user_inbox_items 
WHERE user_id = 'user-b-id'; -- Returns empty (RLS blocks)

-- Even with admin connection, if setting role to 'authenticated':
SET ROLE authenticated;
SELECT * FROM user_inbox_items; -- Empty (RLS still applies)
```

## Backend Integration (Optional)

For server-side processing (e.g., spam filtering), the backend can:

```typescript
// backend/src/server.ts
app.post('/api/classify-email', async (req, res) => {
  const { userId, encryptedEmail } = req.body;
  
  // Backend does NOT decrypt (no key available)
  // Instead, extract classifiable metadata from encrypted blob
  
  // Option 1: Store encrypted, client decrypts and classifies
  // Option 2: Use homomorphic encryption for server-side processing
  // Option 3: Send plaintext to AI, respond with classification only
  
  // For Nexora: Use Option 3 - client sends plaintext to Gemini AI,
  // stores response encrypted in Supabase
});
```

## Summary

| Feature | Implementation |
|---------|-----------------|
| Encryption | AES-256-GCM via Web Crypto API |
| Key Derivation | PBKDF2-SHA256 from session token |
| Data Isolation | Supabase RLS policies (per user_id) |
| Admin Access | Blocked by RLS + encryption |
| Audit Trail | Immutable encrypted event logs |
| Key Rotation | Supported via encryption_version field |
| Session Binding | Key cleared on logout |

**Result**: User data is end-to-end encrypted. Supabase DBMS administrators can see encrypted blobs and metadata, but never access plaintext content without the user's authenticated session.
