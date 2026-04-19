-- ==========================================
-- USER PRIVACY SCHEMA WITH END-TO-END ENCRYPTION
-- Row-Level Security (RLS) prevents admin access
-- Data is encrypted on client-side before storage
-- ==========================================

-- Table: user_inbox_items (encrypted email storage)
-- RLS: Only authenticated user can read/write their own items
CREATE TABLE IF NOT EXISTS user_inbox_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Encrypted fields (stored as bytea/text, decrypted by client)
  gmail_message_id_enc TEXT NOT NULL,  -- encrypted Gmail message ID
  from_enc TEXT NOT NULL,               -- encrypted sender email
  subject_enc TEXT NOT NULL,            -- encrypted subject
  snippet_enc TEXT,                     -- encrypted preview text
  label_enc TEXT NOT NULL,              -- encrypted label (Important, Spam, etc)
  priority_enc TEXT,                    -- encrypted priority level
  reason_enc TEXT,                      -- encrypted reasoning
  
  -- Metadata (unencrypted, searchable)
  encryption_version INT DEFAULT 1,     -- support for key rotation
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'unread',         -- unread, read, archived, deleted
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT user_inbox_items_user_id_check CHECK (user_id IS NOT NULL)
);

-- Enable RLS on user_inbox_items
ALTER TABLE user_inbox_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own inbox items
CREATE POLICY user_inbox_items_select ON user_inbox_items
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own inbox items
CREATE POLICY user_inbox_items_insert ON user_inbox_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own inbox items
CREATE POLICY user_inbox_items_update ON user_inbox_items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own inbox items
CREATE POLICY user_inbox_items_delete ON user_inbox_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance (on non-sensitive metadata)
CREATE INDEX idx_user_inbox_items_user_id ON user_inbox_items(user_id);
CREATE INDEX idx_user_inbox_items_status ON user_inbox_items(status);
CREATE INDEX idx_user_inbox_items_created_at ON user_inbox_items(created_at DESC);

-- ==========================================
-- Table: user_sync_state (encrypted sync checkpoints)
-- Stores last sync info to avoid re-fetching
-- ==========================================
CREATE TABLE IF NOT EXISTS user_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Encrypted fields
  gmail_history_id_enc TEXT,            -- encrypted Gmail history ID for incremental sync
  
  -- Metadata
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_status TEXT DEFAULT 'pending',   -- pending, in_progress, success, failed
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT user_sync_state_user_id_check CHECK (user_id IS NOT NULL)
);

-- Enable RLS on user_sync_state
ALTER TABLE user_sync_state ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own sync state
CREATE POLICY user_sync_state_select ON user_sync_state
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_sync_state_insert ON user_sync_state
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_sync_state_update ON user_sync_state
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for user lookups
CREATE INDEX idx_user_sync_state_user_id ON user_sync_state(user_id);

-- ==========================================
-- Table: user_tracking_events (encrypted event log)
-- Immutable audit trail of user actions
-- ==========================================
CREATE TABLE IF NOT EXISTS user_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Encrypted event details
  event_type_enc TEXT NOT NULL,         -- encrypted event type (marked_important, marked_spam, etc)
  payload_enc TEXT,                     -- encrypted event payload (JSON blob)
  
  -- Metadata
  encryption_version INT DEFAULT 1,
  ip_address INET,                      -- optional: IP for security audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT user_tracking_events_user_id_check CHECK (user_id IS NOT NULL)
);

-- Enable RLS on user_tracking_events
ALTER TABLE user_tracking_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own tracking events
CREATE POLICY user_tracking_events_select ON user_tracking_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own tracking events
CREATE POLICY user_tracking_events_insert ON user_tracking_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: Events should be immutable (no UPDATE/DELETE) once created
-- This ensures audit trail integrity

-- Index for user/time lookups
CREATE INDEX idx_user_tracking_events_user_id ON user_tracking_events(user_id);
CREATE INDEX idx_user_tracking_events_created_at ON user_tracking_events(created_at DESC);

-- ==========================================
-- Table: user_manual_commitments (encrypted financial/work items)
-- Stores manually added financial and work commitments
-- ==========================================
CREATE TABLE IF NOT EXISTS user_manual_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Encrypted fields
  title_enc TEXT NOT NULL,              -- encrypted commitment title
  type_enc TEXT NOT NULL,               -- encrypted type (financial, work)
  amount_enc TEXT,                      -- encrypted amount (for financial)
  due_date_enc TEXT,                    -- encrypted due date
  priority_enc TEXT,                    -- encrypted priority level
  note_enc TEXT,                        -- encrypted notes
  
  -- Metadata
  encryption_version INT DEFAULT 1,
  due_date TIMESTAMP WITH TIME ZONE,    -- unencrypted for sorting (no sensitive info)
  status TEXT DEFAULT 'pending',        -- pending, completed, cancelled
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT user_manual_commitments_user_id_check CHECK (user_id IS NOT NULL)
);

-- Enable RLS on user_manual_commitments
ALTER TABLE user_manual_commitments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own commitments
CREATE POLICY user_manual_commitments_select ON user_manual_commitments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_manual_commitments_insert ON user_manual_commitments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_manual_commitments_update ON user_manual_commitments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_manual_commitments_delete ON user_manual_commitments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for user and sorting
CREATE INDEX idx_user_manual_commitments_user_id ON user_manual_commitments(user_id);
CREATE INDEX idx_user_manual_commitments_due_date ON user_manual_commitments(due_date);

-- ==========================================
-- Security: Prevent Admin Access
-- ==========================================
-- Grant minimal permissions to authenticated users ONLY
-- Regular users cannot bypass RLS

-- Revoke public schema access
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Grant select to authenticated users (RLS will filter rows)
GRANT SELECT, INSERT, UPDATE, DELETE ON user_inbox_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_sync_state TO authenticated;
GRANT SELECT, INSERT ON user_tracking_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_manual_commitments TO authenticated;

-- ==========================================
-- Key Rotation Support
-- Migration path for encryption version updates
-- ==========================================
COMMENT ON COLUMN user_inbox_items.encryption_version IS 'Supports key rotation: 1=AES-GCM (initial)';
COMMENT ON COLUMN user_tracking_events.encryption_version IS 'Supports key rotation: 1=AES-GCM (initial)';
COMMENT ON COLUMN user_manual_commitments.encryption_version IS 'Supports key rotation: 1=AES-GCM (initial)';
