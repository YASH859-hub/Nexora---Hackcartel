const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';

export interface GmailMessageSummary {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
}

export interface EmailActionItem {
  title: string;
  summary: string;
  priority: 'high' | 'medium' | 'low';
  nextAction: string;
  dueDate?: string;
  sourceEmailId?: string;
}

export interface ExtractionResult {
  items: EmailActionItem[];
  mode: 'deepseek' | 'rules';
  warning?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
            error_callback?: (error: unknown) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

function loadGoogleIdentityScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
    document.head.appendChild(script);
  });
}

export async function requestGmailAccessToken(): Promise<string> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Missing VITE_GOOGLE_CLIENT_ID in your .env.local file.');
  }

  await loadGoogleIdentityScript();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google OAuth client is unavailable.');
  }

  return new Promise((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GMAIL_SCOPE,
      callback: (response) => {
        if (!response.access_token) {
          reject(new Error(response.error || 'Failed to get Gmail access token.'));
          return;
        }
        resolve(response.access_token);
      },
      error_callback: () => reject(new Error('Google OAuth flow was interrupted.')),
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  const normalized = name.toLowerCase();
  const found = headers.find((header) => header.name.toLowerCase() === normalized);
  return found?.value || '';
}

export async function fetchRecentEmails(accessToken: string, maxResults = 10): Promise<GmailMessageSummary[]> {
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=newer_than:14d -category:promotions`;
  const listResponse = await fetch(listUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!listResponse.ok) {
    throw new Error('Unable to fetch Gmail messages.');
  }

  const listJson = await listResponse.json();
  const messages: Array<{ id: string }> = listJson.messages || [];

  if (!messages.length) {
    return [];
  }

  const detailedMessages = await Promise.all(
    messages.map(async (message) => {
      const detailParams = new URLSearchParams();
      detailParams.set('format', 'metadata');
      detailParams.append('metadataHeaders', 'From');
      detailParams.append('metadataHeaders', 'Subject');
      detailParams.append('metadataHeaders', 'Date');

      const detailResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?${detailParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!detailResponse.ok) {
        return null;
      }

      const detail = await detailResponse.json();
      const headers = detail.payload?.headers || [];

      return {
        id: detail.id,
        from: getHeader(headers, 'From') || 'Unknown Sender',
        subject: getHeader(headers, 'Subject') || '(No Subject)',
        date: getHeader(headers, 'Date') || '',
        snippet: detail.snippet || '',
      } satisfies GmailMessageSummary;
    }),
  );

  return detailedMessages.filter((message): message is GmailMessageSummary => Boolean(message));
}

function parseJsonPayload(text: string): unknown {
  const trimmed = text.trim();

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }

  const jsonBlockMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (jsonBlockMatch?.[1]) {
    return JSON.parse(jsonBlockMatch[1]);
  }

  throw new Error('Model response is not valid JSON.');
}

function parseDueDate(rawText: string): string | undefined {
  const dateMatch = rawText.match(
    /(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}\b|\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b|\btomorrow\b|\btoday\b|\bnext\s+\w+\b)/i,
  );

  return dateMatch?.[0];
}

function buildRuleBasedItems(messages: GmailMessageSummary[]): EmailActionItem[] {
  const actionSignals = [
    'due',
    'overdue',
    'invoice',
    'bill',
    'payment',
    'renewal',
    'deadline',
    'action required',
    'urgent',
    'verify',
    'confirm',
    'review',
    'meeting',
  ];

  const highSignals = ['overdue', 'urgent', 'final reminder', 'payment due', 'action required', 'invoice'];
  const mediumSignals = ['renewal', 'meeting', 'review', 'confirm', 'verify'];

  const items = messages
    .map((message) => {
      const text = `${message.subject} ${message.snippet}`.toLowerCase();
      const hasSignal = actionSignals.some((signal) => text.includes(signal));
      if (!hasSignal) {
        return null;
      }

      const high = highSignals.some((signal) => text.includes(signal));
      const medium = mediumSignals.some((signal) => text.includes(signal));
      const priority: EmailActionItem['priority'] = high ? 'high' : medium ? 'medium' : 'low';
      const dueDate = parseDueDate(`${message.subject} ${message.snippet}`);

      return {
        title: message.subject || 'Email follow-up',
        summary: message.snippet || `Review message from ${message.from}`,
        priority,
        nextAction:
          priority === 'high'
            ? 'Open this email now and complete the required action.'
            : priority === 'medium'
            ? 'Review and schedule the required follow-up.'
            : 'Check this email and archive or defer as needed.',
        dueDate,
        sourceEmailId: message.id,
      } satisfies EmailActionItem;
    })
    .filter(Boolean) as EmailActionItem[];

  return items.slice(0, 12);
}

async function extractWithDeepSeek(messages: GmailMessageSummary[]): Promise<EmailActionItem[]> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_DEEPSEEK_API_KEY in your .env.local file.');
  }

  const model = import.meta.env.VITE_DEEPSEEK_MODEL || 'deepseek-chat';
  const input = messages.map((message) => ({
    id: message.id,
    from: message.from,
    subject: message.subject,
    date: message.date,
    snippet: message.snippet,
  }));

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content:
            'You extract actionable items from email metadata. Return strict JSON array only. Each object must include title, summary, priority (high|medium|low), nextAction, dueDate, sourceEmailId.',
        },
        {
          role: 'user',
          content: `Emails: ${JSON.stringify(input)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'DeepSeek request failed.');
  }

  const json = await response.json();
  const raw = json?.choices?.[0]?.message?.content || '[]';
  const parsed = parseJsonPayload(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('Unexpected DeepSeek output format.');
  }

  return parsed
    .map((item): EmailActionItem | null => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      const priorityRaw = String(candidate.priority || '').toLowerCase();
      const priority: EmailActionItem['priority'] =
        priorityRaw === 'high' || priorityRaw === 'medium' || priorityRaw === 'low'
          ? priorityRaw
          : 'medium';

      return {
        title: String(candidate.title || 'Untitled Action'),
        summary: String(candidate.summary || ''),
        priority,
        nextAction: String(candidate.nextAction || 'Review this email and decide next step.'),
        dueDate: candidate.dueDate ? String(candidate.dueDate) : undefined,
        sourceEmailId: candidate.sourceEmailId ? String(candidate.sourceEmailId) : undefined,
      };
    })
    .filter((item): item is EmailActionItem => Boolean(item));
}

export async function extractActionItems(messages: GmailMessageSummary[]): Promise<ExtractionResult> {
  if (!messages.length) {
    return { items: [], mode: 'rules' };
  }

  try {
    const items = await extractWithDeepSeek(messages);
    return { items, mode: 'deepseek' };
  } catch (error) {
    const fallbackItems = buildRuleBasedItems(messages);
    if (error instanceof Error) {
      console.warn('DeepSeek extraction failed, using rule-based fallback:', error.message);
    }

    return {
      items: fallbackItems,
      mode: 'rules',
      warning: 'DeepSeek unavailable, switched to rule-based extraction.',
    };
  }
}

export async function extractActionItemsWithLlm(messages: GmailMessageSummary[]): Promise<EmailActionItem[]> {
  const result = await extractActionItems(messages);
  return result.items;
}