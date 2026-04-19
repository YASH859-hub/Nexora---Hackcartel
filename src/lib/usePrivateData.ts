/**
 * usePrivateData Hook
 * 
 * Manages encrypted data operations with Supabase:
 * - Encrypts data before sending to Supabase
 * - Decrypts data when retrieving from Supabase
 * - Handles key derivation from user session
 * - Provides transparent CRUD operations
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from './supabase';
import {
  deriveEncryptionKey,
  encryptData,
  decryptData,
  EncryptedData,
  serializeEncrypted,
  deserializeEncrypted,
} from './encryption';

export interface UsePrivateDataState {
  isLoading: boolean;
  isEncrypting: boolean;
  error: Error | null;
  encryptionKey: CryptoKey | null;
}

/**
 * Initialize encryption key from user session
 */
export function useEncryptionKey(): UsePrivateDataState {
  const { user, session } = useAuth();
  const [state, setState] = useState<UsePrivateDataState>({
    isLoading: true,
    isEncrypting: false,
    error: null,
    encryptionKey: null,
  });

  useEffect(() => {
    const initializeKey = async () => {
      if (!user?.id || !session?.access_token) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: new Error('User not authenticated'),
        }));
        return;
      }

      try {
        const key = await deriveEncryptionKey(user.id, session.access_token);
        setState({
          isLoading: false,
          isEncrypting: false,
          error: null,
          encryptionKey: key,
        });
      } catch (err) {
        setState({
          isLoading: false,
          isEncrypting: false,
          error: err instanceof Error ? err : new Error('Failed to initialize encryption key'),
          encryptionKey: null,
        });
      }
    };

    initializeKey();
  }, [user?.id, session?.access_token]);

  return state;
}

/**
 * Save encrypted inbox item to Supabase
 * Encrypts sensitive fields before storage
 */
export async function saveEncryptedInboxItem(
  item: {
    gmailMessageId: string;
    from: string;
    subject: string;
    snippet?: string;
    label: string;
    priority?: string;
    reason?: string;
  },
  encryptionKey: CryptoKey,
  userId: string
) {
  const encrypted: Record<string, EncryptedData> = {};

  // Encrypt each field
  encrypted.gmailMessageId = await encryptData(item.gmailMessageId, encryptionKey);
  encrypted.from = await encryptData(item.from, encryptionKey);
  encrypted.subject = await encryptData(item.subject, encryptionKey);
  if (item.snippet) {
    encrypted.snippet = await encryptData(item.snippet, encryptionKey);
  }
  encrypted.label = await encryptData(item.label, encryptionKey);
  if (item.priority) {
    encrypted.priority = await encryptData(item.priority, encryptionKey);
  }
  if (item.reason) {
    encrypted.reason = await encryptData(item.reason, encryptionKey);
  }

  // Store in Supabase (encrypted fields stored as JSON)
  const { data, error } = await supabase
    .from('user_inbox_items')
    .insert({
      user_id: userId,
      gmail_message_id_enc: serializeEncrypted(encrypted.gmailMessageId),
      from_enc: serializeEncrypted(encrypted.from),
      subject_enc: serializeEncrypted(encrypted.subject),
      snippet_enc: encrypted.snippet ? serializeEncrypted(encrypted.snippet) : null,
      label_enc: serializeEncrypted(encrypted.label),
      priority_enc: encrypted.priority ? serializeEncrypted(encrypted.priority) : null,
      reason_enc: encrypted.reason ? serializeEncrypted(encrypted.reason) : null,
    })
    .select();

  if (error) throw error;
  return data;
}

/**
 * Fetch and decrypt inbox items for authenticated user
 * Returns only user's own items (enforced by RLS)
 */
export async function fetchDecryptedInboxItems(
  encryptionKey: CryptoKey,
  userId: string
) {
  const { data: encryptedItems, error } = await supabase
    .from('user_inbox_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Decrypt each item
  const decryptedItems = await Promise.all(
    encryptedItems.map(async (item: any) => {
      const decryptedFrom = await decryptData(
        deserializeEncrypted(item.from_enc),
        encryptionKey
      );
      const decryptedSubject = await decryptData(
        deserializeEncrypted(item.subject_enc),
        encryptionKey
      );
      const decryptedLabel = await decryptData(
        deserializeEncrypted(item.label_enc),
        encryptionKey
      );

      let decryptedSnippet: string | null = null;
      if (item.snippet_enc) {
        decryptedSnippet = await decryptData(
          deserializeEncrypted(item.snippet_enc),
          encryptionKey
        );
      }

      let decryptedPriority: string | null = null;
      if (item.priority_enc) {
        decryptedPriority = await decryptData(
          deserializeEncrypted(item.priority_enc),
          encryptionKey
        );
      }

      let decryptedReason: string | null = null;
      if (item.reason_enc) {
        decryptedReason = await decryptData(
          deserializeEncrypted(item.reason_enc),
          encryptionKey
        );
      }

      return {
        id: item.id,
        from: decryptedFrom,
        subject: decryptedSubject,
        snippet: decryptedSnippet,
        label: decryptedLabel,
        priority: decryptedPriority,
        reason: decryptedReason,
        status: item.status,
        firstSeenAt: item.first_seen_at,
        lastSeenAt: item.last_seen_at,
        createdAt: item.created_at,
      };
    })
  );

  return decryptedItems;
}

/**
 * Update inbox item label (re-encrypts and stores)
 */
export async function updateEncryptedInboxItemLabel(
  itemId: string,
  newLabel: string,
  reason: string,
  encryptionKey: CryptoKey,
  userId: string
) {
  const labelEnc = await encryptData(newLabel, encryptionKey);
  const reasonEnc = await encryptData(reason, encryptionKey);

  const { data, error } = await supabase
    .from('user_inbox_items')
    .update({
      label_enc: serializeEncrypted(labelEnc),
      reason_enc: serializeEncrypted(reasonEnc),
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('user_id', userId)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Save encrypted manual commitment
 */
export async function saveEncryptedCommitment(
  item: {
    title: string;
    type: 'financial' | 'work';
    amount?: string;
    dueDate: string;
    priority: string;
    note?: string;
  },
  encryptionKey: CryptoKey,
  userId: string
) {
  const encrypted: Record<string, EncryptedData> = {};

  encrypted.title = await encryptData(item.title, encryptionKey);
  encrypted.type = await encryptData(item.type, encryptionKey);
  if (item.amount) {
    encrypted.amount = await encryptData(item.amount, encryptionKey);
  }
  encrypted.dueDate = await encryptData(item.dueDate, encryptionKey);
  encrypted.priority = await encryptData(item.priority, encryptionKey);
  if (item.note) {
    encrypted.note = await encryptData(item.note, encryptionKey);
  }

  const { data, error } = await supabase
    .from('user_manual_commitments')
    .insert({
      user_id: userId,
      title_enc: serializeEncrypted(encrypted.title),
      type_enc: serializeEncrypted(encrypted.type),
      amount_enc: encrypted.amount ? serializeEncrypted(encrypted.amount) : null,
      due_date_enc: serializeEncrypted(encrypted.dueDate),
      priority_enc: serializeEncrypted(encrypted.priority),
      note_enc: encrypted.note ? serializeEncrypted(encrypted.note) : null,
      due_date: new Date(item.dueDate).toISOString(),
    })
    .select();

  if (error) throw error;
  return data;
}

/**
 * Fetch and decrypt manual commitments
 */
export async function fetchDecryptedCommitments(
  encryptionKey: CryptoKey,
  userId: string
) {
  const { data: encryptedItems, error } = await supabase
    .from('user_manual_commitments')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true });

  if (error) throw error;

  const decryptedItems = await Promise.all(
    encryptedItems.map(async (item: any) => {
      const decryptedTitle = await decryptData(
        deserializeEncrypted(item.title_enc),
        encryptionKey
      );
      const decryptedType = await decryptData(
        deserializeEncrypted(item.type_enc),
        encryptionKey
      ) as 'financial' | 'work';
      const decryptedPriority = await decryptData(
        deserializeEncrypted(item.priority_enc),
        encryptionKey
      );

      let decryptedAmount: string | null = null;
      if (item.amount_enc) {
        decryptedAmount = await decryptData(
          deserializeEncrypted(item.amount_enc),
          encryptionKey
        );
      }

      let decryptedNote: string | null = null;
      if (item.note_enc) {
        decryptedNote = await decryptData(
          deserializeEncrypted(item.note_enc),
          encryptionKey
        );
      }

      return {
        id: item.id,
        title: decryptedTitle,
        type: decryptedType,
        amount: decryptedAmount,
        dueDate: item.due_date,
        priority: decryptedPriority,
        note: decryptedNote,
        status: item.status,
        createdAt: item.created_at,
      };
    })
  );

  return decryptedItems;
}

/**
 * Log encrypted event to audit trail
 * Events are immutable (no UPDATE/DELETE) for security
 */
export async function logEncryptedEvent(
  eventType: string,
  payload: Record<string, any>,
  encryptionKey: CryptoKey,
  userId: string
) {
  const eventTypeEnc = await encryptData(eventType, encryptionKey);
  const payloadEnc = await encryptData(JSON.stringify(payload), encryptionKey);

  const { data, error } = await supabase
    .from('user_tracking_events')
    .insert({
      user_id: userId,
      event_type_enc: serializeEncrypted(eventTypeEnc),
      payload_enc: serializeEncrypted(payloadEnc),
    })
    .select();

  if (error) throw error;
  return data;
}

/**
 * Update sync state checkpoint
 */
export async function updateSyncState(
  gmailHistoryId: string | null,
  status: 'pending' | 'in_progress' | 'success' | 'failed',
  encryptionKey: CryptoKey,
  userId: string,
  errorMessage?: string
) {
  let gmailHistoryIdEnc: EncryptedData | null = null;
  if (gmailHistoryId) {
    gmailHistoryIdEnc = await encryptData(gmailHistoryId, encryptionKey);
  }

  const { data, error } = await supabase
    .from('user_sync_state')
    .upsert({
      user_id: userId,
      gmail_history_id_enc: gmailHistoryIdEnc ? serializeEncrypted(gmailHistoryIdEnc) : null,
      sync_status: status,
      error_message: errorMessage || null,
      last_sync_at: new Date().toISOString(),
    })
    .select();

  if (error) throw error;
  return data;
}
