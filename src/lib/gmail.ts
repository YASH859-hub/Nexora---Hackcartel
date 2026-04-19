const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';

export interface GmailMessageSummary {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
}

export type GmailMailLabel = 'important' | 'unimportant' | 'spam' | 'fishy';

export interface GmailMailClassification {
  emailId: string;
  label: GmailMailLabel;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  reason: string;
}

export interface InboxClassificationResult {
  items: GmailMailClassification[];
  mode: 'ollama' | 'rules';
  warning?: string;
}

export interface EmailActionItem {
  title: string;
  summary: string;
  category: 'financial' | 'work' | 'other';
  priority: 'high' | 'medium' | 'low';
  nextAction: string;
  dueDate?: string;
  sourceEmailId?: string;
  sourceType: 'email' | 'calendar';
}

export interface CalendarEventSummary {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  description: string;
  status: string;
  sourceType: 'calendar';
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
    throw new Error('Gmail integration requires a Google OAuth Client ID. Add VITE_GOOGLE_CLIENT_ID to your .env.local file (get one from Google Cloud Console → APIs & Services → Credentials).');
  }

  await loadGoogleIdentityScript();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google OAuth client is unavailable.');
  }

  return new Promise((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: `${GMAIL_SCOPE} ${CALENDAR_SCOPE}`,
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

function classifyEmail(message: GmailMessageSummary): EmailActionItem['category'] {
  const text = `${message.from} ${message.subject} ${message.snippet}`.toLowerCase();

  const spendSignals = [
    'invoice', 'bill', 'payment', 'paid', 'subscription', 'renewal', 'receipt', 'transaction',
    'refund', 'purchase', 'order', 'amount due', 'due now', 'credit card', 'debit', 'upi', 'netbanking',
  ];
  const workSignals = [
    'meeting', 'schedule', 'calendar', 'invite', 'project', 'deadline', 'client', 'proposal',
    'team', 'sync', 'standup', 'review', 'report', 'follow up', 'follow-up', 'action required',
    'interview', 'assignment', 'onboarding', 'task', 'work', 'office',
  ];

  if (spendSignals.some((signal) => text.includes(signal))) return 'financial';
  if (workSignals.some((signal) => text.includes(signal))) return 'work';
  return 'other';
}

function classifyTextCategory(text: string): EmailActionItem['category'] {
  const normalized = text.toLowerCase();

  const spendSignals = [
    'invoice', 'bill', 'payment', 'paid', 'subscription', 'renewal', 'receipt', 'transaction',
    'refund', 'purchase', 'order', 'amount due', 'due now', 'credit card', 'debit', 'upi', 'netbanking',
  ];
  const workSignals = [
    'meeting', 'schedule', 'calendar', 'invite', 'project', 'deadline', 'client', 'proposal',
    'team', 'sync', 'standup', 'review', 'report', 'follow up', 'follow-up', 'action required',
    'interview', 'assignment', 'onboarding', 'task', 'work', 'office', 'reminder',
  ];

  if (spendSignals.some((signal) => normalized.includes(signal))) return 'financial';
  if (workSignals.some((signal) => normalized.includes(signal))) return 'work';
  return 'other';
}

function inferPriority(text: string): EmailActionItem['priority'] {
  const normalized = text.toLowerCase();
  const highSignals = ['overdue', 'urgent', 'final reminder', 'payment due', 'action required', 'invoice', 'today', 'asap'];
  const mediumSignals = ['renewal', 'meeting', 'review', 'confirm', 'verify', 'tomorrow', 'next week'];

  if (highSignals.some((signal) => normalized.includes(signal))) return 'high';
  if (mediumSignals.some((signal) => normalized.includes(signal))) return 'medium';
  return 'low';
}

const MAIL_PRIORITY_SIGNALS = {
  important: [
    'invoice', 'payment due', 'deadline', 'action required', 'urgent', 'meeting', 'interview', 'verification',
    'security', 'bank', 'transaction', 'statement', 'rent', 'bill', 'offer letter', 'assessment',
  ],
  spam: [
    'win cash', 'lottery', 'claim now', 'guaranteed income', 'free money', 'bonus reward', 'click now',
    'crypto giveaway', 'cheap pills', 'adult', 'promo code', 'exclusive deal',
  ],
  fishy: [
    'verify your account', 'password reset', 'suspended', 'unusual login', 'confirm your identity',
    'gift card', 'wire transfer', 'bank alert', 'urgent response needed', 'security notice',
  ],
};

function classifySingleEmailHeuristic(message: GmailMessageSummary): GmailMailClassification {
  const normalized = `${message.from} ${message.subject} ${message.snippet}`.toLowerCase();
  const priority = inferPriority(normalized);

  if (MAIL_PRIORITY_SIGNALS.spam.some((signal) => normalized.includes(signal))) {
    return {
      emailId: message.id,
      label: 'spam',
      priority: 'low',
      confidence: 0.78,
      reason: 'Contains common bulk-promotion or spam phrases.',
    };
  }

  if (MAIL_PRIORITY_SIGNALS.fishy.some((signal) => normalized.includes(signal))) {
    return {
      emailId: message.id,
      label: 'fishy',
      priority: 'high',
      confidence: 0.72,
      reason: 'Looks like a phishing-style security or credential request.',
    };
  }

  if (MAIL_PRIORITY_SIGNALS.important.some((signal) => normalized.includes(signal)) || priority !== 'low') {
    return {
      emailId: message.id,
      label: 'important',
      priority,
      confidence: 0.68,
      reason: 'Contains work/financial action indicators or due-date urgency.',
    };
  }

  return {
    emailId: message.id,
    label: 'unimportant',
    priority: 'low',
    confidence: 0.64,
    reason: 'No urgent, sensitive, or action-required signals were detected.',
  };
}

export function classifyEmailsHeuristic(messages: GmailMessageSummary[]): GmailMailClassification[] {
  return messages.map((message) => classifySingleEmailHeuristic(message));
}

function parseClassificationJson(text: string): unknown {
  const trimmed = text.trim();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }

  const jsonBlockMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (jsonBlockMatch?.[1]) {
    return JSON.parse(jsonBlockMatch[1]);
  }

  throw new Error('Ollama classification output is not valid JSON.');
}

function normalizeModelLabel(rawLabel: string): GmailMailLabel | null {
  const normalized = rawLabel.toLowerCase().trim();
  if (normalized === 'important') return 'important';
  if (normalized === 'unimportant') return 'unimportant';
  if (normalized === 'spam') return 'spam';
  if (normalized === 'fishy') return 'fishy';
  if (normalized === 'not_spam') return 'unimportant';
  return null;
}

function parseInboxClassificationResponse(
  rawText: string,
  messages: GmailMessageSummary[],
): GmailMailClassification[] {
  const parsed = parseClassificationJson(rawText);
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).results)
    ? (parsed as Record<string, unknown>).results
    : [];

  const messageById = new Map(messages.map((message) => [message.id, message]));

  return rows
    .map((row): GmailMailClassification | null => {
      if (!row || typeof row !== 'object') return null;

      const candidate = row as Record<string, unknown>;
      const emailId = String(candidate.id || candidate.emailId || '').trim();
      if (!emailId || !messageById.has(emailId)) return null;

      const label = normalizeModelLabel(String(candidate.label || ''));
      if (!label) return null;

      const message = messageById.get(emailId)!;
      const inferredPriority = inferPriority(`${message.subject} ${message.snippet} ${message.from}`);
      const confidenceRaw = Number(candidate.confidence);
      const confidence = Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : 0.7;

      const priorityRaw = String(candidate.priority || '').toLowerCase();
      const priority: 'high' | 'medium' | 'low' =
        priorityRaw === 'high' || priorityRaw === 'medium' || priorityRaw === 'low'
          ? priorityRaw
          : label === 'spam'
          ? 'low'
          : label === 'fishy'
          ? 'high'
          : inferredPriority;

      return {
        emailId,
        label,
        priority,
        confidence,
        reason: String(candidate.reason || 'Classified by Ollama based on email content.').slice(0, 240),
      };
    })
    .filter((item): item is GmailMailClassification => Boolean(item));
}

export async function classifyEmailsForInbox(messages: GmailMessageSummary[]): Promise<InboxClassificationResult> {
  if (!messages.length) {
    return { items: [], mode: 'rules' };
  }

  const backendBase = import.meta.env.VITE_BACKEND_AI_BASE || 'http://localhost:6000';

  try {
    const response = await fetch(`${backendBase}/api/ai/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'email_classification',
        input: {
          task: 'Classify each email into important | unimportant | spam | fishy, and include priority high|medium|low.',
          emails: messages.map((message) => ({
            id: message.id,
            from: message.from,
            subject: message.subject,
            snippet: message.snippet,
            date: message.date,
          })),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Inbox classification request failed (${response.status}).`);
    }

    const json = await response.json() as { response?: string };
    const raw = typeof json.response === 'string' ? json.response : '';
    const parsedItems = parseInboxClassificationResponse(raw, messages);

    if (!parsedItems.length) {
      throw new Error('No valid classifications returned by model.');
    }

    const resultById = new Map(parsedItems.map((item) => [item.emailId, item]));
    const completed = messages.map((message) => resultById.get(message.id) || classifySingleEmailHeuristic(message));

    return {
      items: completed,
      mode: 'ollama',
    };
  } catch (error) {
    if (error instanceof Error) {
      console.warn('Ollama inbox classification failed, using rule-based fallback:', error.message);
    }

    return {
      items: classifyEmailsHeuristic(messages),
      mode: 'rules',
      warning: 'Ollama unavailable, switched to rule-based inbox classification.',
    };
  }
}

function formatCalendarDate(dateTime?: string, date?: string): string {
  return dateTime || date || '';
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

      const priority = inferPriority(text);
      const dueDate = parseDueDate(`${message.subject} ${message.snippet}`);
      const category = classifyEmail(message);

      return {
        title: message.subject || 'Email follow-up',
        summary: message.snippet || `Review message from ${message.from}`,
        category,
        priority,
        nextAction:
          priority === 'high'
            ? 'Open this email now and complete the required action.'
            : priority === 'medium'
            ? 'Review and schedule the required follow-up.'
            : 'Check this email and archive or defer as needed.',
        dueDate,
        sourceEmailId: message.id,
        sourceType: 'email',
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
            'You are a strict email intelligence classifier. Analyze email metadata and infer tasks precisely. Return ONLY a valid JSON array. Each object must include title, summary, category (financial|work|other), priority (high|medium|low), nextAction, dueDate, sourceEmailId. Do not output markdown or commentary.',
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
        category:
          candidate.category === 'work' || candidate.category === 'financial' || candidate.category === 'other'
            ? candidate.category
            : 'other',
        priority,
        nextAction: String(candidate.nextAction || 'Review this email and decide next step.'),
        dueDate: candidate.dueDate ? String(candidate.dueDate) : undefined,
        sourceEmailId: candidate.sourceEmailId ? String(candidate.sourceEmailId) : undefined,
        sourceType: 'email',
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

export async function fetchUpcomingCalendarEvents(accessToken: string, maxResults = 10): Promise<CalendarEventSummary[]> {
  const apiKey = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY;
  const timeMin = new Date().toISOString();
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin,
  });

  if (apiKey) {
    params.set('key', apiKey);
  }

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Unable to fetch Calendar events.');
  }

  const json = await response.json();
  const events: Array<{
    id: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    location?: string;
    description?: string;
    status?: string;
  }> = json.items || [];

  return events.map((event) => ({
    id: event.id,
    title: event.summary || '(No Title)',
    start: formatCalendarDate(event.start?.dateTime, event.start?.date),
    end: formatCalendarDate(event.end?.dateTime, event.end?.date),
    location: event.location || '',
    description: event.description || '',
    status: event.status || 'confirmed',
    sourceType: 'calendar',
  }));
}

function buildCalendarRuleBasedItems(events: CalendarEventSummary[]): EmailActionItem[] {
  return events.map((event) => createCalendarActionItem(event));
}

export function createCalendarActionItem(event: CalendarEventSummary): EmailActionItem {
  const text = `${event.title} ${event.location} ${event.description}`;
  const category = classifyTextCategory(text);
  const priority = inferPriority(text);

  return {
    title: event.title,
    summary: event.description || event.location || 'Upcoming calendar event',
    category,
    priority,
    nextAction: category === 'work' ? 'Prepare for this meeting or deadline.' : 'Review and plan for this event.',
    dueDate: event.start,
    sourceEmailId: event.id,
    sourceType: 'calendar',
  } satisfies EmailActionItem;
}

async function extractWithDeepSeekFromText(
  items: Array<{
    id: string;
    text: string;
    sourceType: 'email' | 'calendar';
  }>,
): Promise<EmailActionItem[]> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_DEEPSEEK_API_KEY in your .env.local file.');
  }

  const model = import.meta.env.VITE_DEEPSEEK_MODEL || 'deepseek-chat';
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
            'You are a strict event intelligence classifier for emails and calendar data. Return ONLY valid JSON array. Each object must include title, summary, category (financial|work|other), priority (high|medium|low), nextAction, dueDate, sourceEmailId, sourceType (email|calendar). Prioritize urgent financial dues and near-term events.',
        },
        {
          role: 'user',
          content: `Items: ${JSON.stringify(items)}`,
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

      const sourceType = candidate.sourceType === 'calendar' ? 'calendar' : 'email';

      return {
        title: String(candidate.title || 'Untitled Action'),
        summary: String(candidate.summary || ''),
        category:
          candidate.category === 'work' || candidate.category === 'financial' || candidate.category === 'other'
            ? candidate.category
            : 'other',
        priority,
        nextAction: String(candidate.nextAction || 'Review this item and decide next step.'),
        dueDate: candidate.dueDate ? String(candidate.dueDate) : undefined,
        sourceEmailId: candidate.sourceEmailId ? String(candidate.sourceEmailId) : undefined,
        sourceType,
      };
    })
    .filter((item): item is EmailActionItem => Boolean(item));
}

export async function extractCalendarActionItems(events: CalendarEventSummary[]): Promise<ExtractionResult> {
  if (!events.length) {
    return { items: [], mode: 'rules' };
  }

  try {
    const items = await extractWithDeepSeekFromText(
      events.map((event) => ({
        id: event.id,
        sourceType: event.sourceType,
        text: `${event.title} ${event.location} ${event.description} ${event.start}`,
      })),
    );

    return { items: items.map((item) => ({ ...item, sourceType: 'calendar' })), mode: 'deepseek' };
  } catch (error) {
    if (error instanceof Error) {
      console.warn('DeepSeek calendar extraction failed, using rule-based fallback:', error.message);
    }

    return {
      items: buildCalendarRuleBasedItems(events),
      mode: 'rules',
      warning: 'Calendar insights switched to rule-based extraction.',
    };
  }
}