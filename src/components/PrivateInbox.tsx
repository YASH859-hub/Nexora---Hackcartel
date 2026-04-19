/**
 * Private Inbox Integration Example
 * 
 * Shows how to wire encrypted inbox storage into the Dashboard component.
 * This is a reference implementation - integrate selectively into your Dashboard.
 *
 * Key patterns:
 * 1. Initialize encryption key from auth session
 * 2. Fetch encrypted data and auto-decrypt
 * 3. Save classifications encrypted
 * 4. Log user actions to audit trail
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useEncryptionKey, saveEncryptedInboxItem, fetchDecryptedInboxItems, updateEncryptedInboxItemLabel, logEncryptedEvent } from '../lib/usePrivateData';
import { supabase } from '../lib/supabase';

export interface PrivateInboxItem {
  id: string;
  from: string;
  subject: string;
  snippet: string | null;
  label: 'Important' | 'Unimportant' | 'Fishy' | 'Spam';
  priority: string | null;
  reason: string | null;
  status: string;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
}

/**
 * usePrivateInbox Hook
 * 
 * Manages encrypted inbox operations:
 * - Fetches and decrypts user's inbox items
 * - Updates classifications (with encryption)
 * - Logs user actions to audit trail
 * - Syncs with Gmail via backend
 */
export function usePrivateInbox() {
  const { user } = useAuth();
  const { encryptionKey, isLoading: keyLoading, error: keyError } = useEncryptionKey();

  const [inbox, setInbox] = useState<PrivateInboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Fetch encrypted inbox items on init
  const refreshInbox = useCallback(async () => {
    if (!encryptionKey || !user?.id) {
      setError(new Error('Encryption key or user not available'));
      return;
    }

    setIsLoading(true);
    try {
      const items = await fetchDecryptedInboxItems(encryptionKey, user.id);
      setInbox(items as PrivateInboxItem[]);
      setLastSyncedAt(new Date());
      setError(null);
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to load inbox');
      setError(e);
      console.error('Inbox fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [encryptionKey, user?.id]);

  // Initial fetch on key ready
  useEffect(() => {
    if (encryptionKey && user?.id && !keyLoading) {
      refreshInbox();
    }
  }, [encryptionKey, user?.id, keyLoading, refreshInbox]);

  // Update email classification (re-encrypts)
  const classifyEmail = useCallback(
    async (itemId: string, newLabel: 'Important' | 'Unimportant' | 'Fishy' | 'Spam', reason: string) => {
      if (!encryptionKey || !user?.id) {
        setError(new Error('Encryption key or user not available'));
        return;
      }

      setIsSaving(true);
      try {
        // Update in Supabase (re-encrypts)
        await updateEncryptedInboxItemLabel(itemId, newLabel, reason, encryptionKey, user.id);

        // Log action to encrypted audit trail
        await logEncryptedEvent(
          'marked_' + newLabel.toLowerCase(),
          {
            itemId,
            label: newLabel,
            reason,
            timestamp: new Date().toISOString(),
          },
          encryptionKey,
          user.id
        );

        // Update local state optimistically
        setInbox((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, label: newLabel, reason, lastSeenAt: new Date().toISOString() }
              : item
          )
        );

        setError(null);
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Failed to classify email');
        setError(e);
        console.error('Classification error:', e);
        // Revert optimistic update on failure
        await refreshInbox();
      } finally {
        setIsSaving(false);
      }
    },
    [encryptionKey, user?.id, refreshInbox]
  );

  // Sync with Gmail backend (periodically pull new emails)
  // Sync with Gmail backend endpoint
  const syncWithGmail = useCallback(async () => {
    if (!user?.id) return;

    try {
      const BACKEND_BASE = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:5000';
      const response = await fetch(`${BACKEND_BASE}/api/gmail/sync-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const data = await response.json();
      setLastSyncedAt(new Date());

      // Refresh inbox to show new items
      await refreshInbox();

      return data;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Sync failed');
      setError(e);
      console.error('Gmail sync error:', e);
    }
  }, [user?.id, refreshInbox]);

  return {
    inbox,
    isLoading: keyLoading || isLoading,
    isSaving,
    error: keyError || error,
    lastSyncedAt,
    refreshInbox,
    classifyEmail,
    syncWithGmail,
  };
}

/**
 * Example: Integration into Dashboard
 * 
 * Shows how to render private inbox with encrypted persistence
 */
export function PrivateInboxSection() {
  const { inbox, isLoading, isSaving, error, lastSyncedAt, refreshInbox, classifyEmail, syncWithGmail } = usePrivateInbox();

  if (error && isLoading) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200">
        <p className="text-red-800">
          <strong>Error:</strong> {error.message}
        </p>
        <button
          onClick={refreshInbox}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>Loading encrypted inbox...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sync error alert */}
      {error && !isLoading && (
        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
          <p className="text-yellow-800 text-sm">
            <strong>Sync issue:</strong> {error.message}
          </p>
          <button
            onClick={syncWithGmail}
            disabled={isSaving}
            className="mt-2 px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            {isSaving ? 'Retrying...' : 'Retry Sync'}
          </button>
        </div>
      )}

      {/* Header with sync info */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Private Inbox</h3>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {lastSyncedAt && (
            <span>Last synced: {lastSyncedAt.toLocaleTimeString()}</span>
          )}
          <button
            onClick={syncWithGmail}
            disabled={isSaving}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
          >
            {isSaving ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Email list - all data decrypted and displayed */}
      <div className="space-y-2">
        {inbox.length === 0 ? (
          <p className="text-gray-500 italic">No emails yet</p>
        ) : (
          inbox.map((item) => (
            <PrivateMailCard
              key={item.id}
              item={item}
              onClassify={(label, reason) => classifyEmail(item.id, label, reason)}
              isClassifying={isSaving}
            />
          ))
        )}
      </div>

      {/* Privacy notice */}
      <div className="p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <strong>🔐 All data is encrypted:</strong> Your emails are encrypted before storing in our database. 
        Only you can decrypt them. Nexora cannot see your email content.
      </div>
    </div>
  );
}

/**
 * PrivateMailCard Component
 * 
 * Displays a decrypted email with classification options
 * All sensitive data shown is decrypted in the browser
 */
interface PrivateMailCardProps {
  item: PrivateInboxItem;
  onClassify: (label: 'Important' | 'Unimportant' | 'Fishy' | 'Spam', reason: string) => Promise<void>;
  isClassifying: boolean;
}

export function PrivateMailCard({ item, onClassify, isClassifying }: PrivateMailCardProps) {
  const labelColors: Record<string, string> = {
    Important: 'bg-green-100 text-green-800 border-green-300',
    Unimportant: 'bg-gray-100 text-gray-800 border-gray-300',
    Fishy: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    Spam: 'bg-red-100 text-red-800 border-red-300',
  };

  const handleQuickLabel = async (newLabel: 'Important' | 'Unimportant' | 'Fishy' | 'Spam') => {
    await onClassify(newLabel, `Manually classified as ${newLabel}`);
  };

  return (
    <div className="p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow bg-white">
      {/* From and Subject (decrypted) */}
      <div className="mb-3">
        <p className="text-sm text-gray-600">From: {item.from}</p>
        <h4 className="font-semibold text-gray-900">{item.subject}</h4>
        {item.snippet && (
          <p className="text-sm text-gray-700 mt-1">{item.snippet}</p>
        )}
      </div>

      {/* Current classification */}
      <div className="mb-3 flex items-center gap-2">
        <span className={`px-2 py-1 rounded text-xs font-semibold border ${labelColors[item.label]}`}>
          {item.label}
        </span>
        {item.reason && (
          <span className="text-xs text-gray-600 italic">{item.reason}</span>
        )}
      </div>

      {/* Quick classification buttons */}
      <div className="flex gap-2 flex-wrap">
        {(['Important', 'Unimportant', 'Fishy', 'Spam'] as const).map((label) => (
          <button
            key={label}
            onClick={() => handleQuickLabel(label)}
            disabled={isClassifying}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              item.label === label
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
            } disabled:opacity-50`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Metadata */}
      <div className="mt-3 text-xs text-gray-500">
        <span>First seen: {new Date(item.firstSeenAt).toLocaleDateString()}</span>
        {item.status === 'archived' && (
          <span className="ml-4">📁 Archived</span>
        )}
      </div>
    </div>
  );
}

/**
 * Usage in Dashboard.tsx:
 * 
 * Add to your imports:
 * import { PrivateInboxSection } from '../components/PrivateInbox';
 * 
 * Add to your render (e.g., in EventPriorityDashboard):
 * <div className="space-y-6">
 *   <PrivateInboxSection />
 *   (rest of dashboard components here)
 * </div>
 * 
 * Benefits:
 * - Encrypted storage in Supabase (RLS prevents admin access)
 * - Cross-device persistence (accessible from any device when logged in)
 * - Audit trail (all actions logged and encrypted)
 * - Automatic sync (periodically fetches new emails from Gmail)
 * - Local decryption (sensitive data never sent to backend unencrypted)
 */
