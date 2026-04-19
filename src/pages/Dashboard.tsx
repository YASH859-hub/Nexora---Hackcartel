import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bell, User, LayoutDashboard, CheckSquare, Calendar, 
  FileText, Zap, Mail, Settings, CheckCircle2, ChevronRight,
  CreditCard, RefreshCw, Home, Clock, Send, Sparkles, ArrowRight,
  Command, AlertCircle, LogOut, TrendingUp, AlertTriangle, Activity, MessageCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import {
  extractActionItems, 
  extractCalendarActionItems,
  classifyEmailsForInbox,
  classifyEmailsHeuristic,
  createCalendarActionItem,
  fetchRecentEmails,
  fetchUpcomingCalendarEvents,
  requestGmailAccessToken,
  type GmailMailClassification,
  type EmailActionItem,
  type ExtractionResult,
  type CalendarEventSummary,
  type GmailMessageSummary,
} from '../lib/gmail';
import { generateChatResponse, type ChatMessage } from '../lib/chat';
import { useTheme } from '../lib/ThemeContext';
import Documents from './Documents';
import Automations from './Automations';

function AnimatedStatusTicker() {
  const [index, setIndex] = useState(0);
  const statuses = [
    { text: 'Chief of Staff AI is active', icon: <Sparkles className="w-4 h-4 text-accent" /> },
    { text: 'Monitoring inbox for action items', icon: <Mail className="w-4 h-4 text-foreground" /> },
    { text: 'All systems optimal', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
    { text: 'Tracking active commitments', icon: <Activity className="w-4 h-4 text-blue-500" /> },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % statuses.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex-1 flex justify-center items-center">
      <div className="px-6 py-2.5 rounded-full bg-secondary/50 border border-border/50 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-3 overflow-hidden w-[400px]">
        <div className="flex items-center justify-center h-6 w-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center gap-3 w-full"
            >
              {statuses[index].icon}
              <span className="text-[13px] font-bold text-foreground font-body tracking-[0.05em] uppercase whitespace-nowrap">
                {statuses[index].text}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const EVENT_PRIORITY_STORAGE_KEY = 'nexora_event_priority_state';
const MANUAL_COMMITMENTS_STORAGE_KEY = 'nexora_manual_financial_commitments';
const MANUAL_WORK_STORAGE_KEY = 'nexora_manual_work_commitments';
const INJECTED_PRIORITY_ITEMS_TABLE = 'injected_priority_items';
const INJECTED_MANUAL_COMMITMENTS_TABLE = 'manual_financial_commitments';

const DEFAULT_INJECTED_PRIORITY_ITEMS: EmailActionItem[] = [
  {
    title: 'AMEX Gold Bill',
    summary: 'Card payment due before the statement deadline.',
    category: 'financial',
    priority: 'high',
    nextAction: 'Open the bill and make the payment today.',
    dueDate: '2026-06-14T09:00:00.000Z',
    sourceEmailId: 'demo-amex-gold-bill',
    sourceType: 'email',
  },
  {
    title: 'Netflix Renewal',
    summary: 'Subscription renewal scheduled for this week.',
    category: 'financial',
    priority: 'medium',
    nextAction: 'Review the renewal or cancel before the charge hits.',
    dueDate: '2026-06-16T09:00:00.000Z',
    sourceEmailId: 'demo-netflix-renewal',
    sourceType: 'email',
  },
  {
    title: 'Rent Payment',
    summary: 'Monthly rent transfer needs to be prepared.',
    category: 'financial',
    priority: 'high',
    nextAction: 'Schedule the transfer and confirm the payment window.',
    dueDate: '2026-06-18T09:00:00.000Z',
    sourceEmailId: 'demo-rent-payment',
    sourceType: 'email',
  },
  {
    title: 'Team Sync',
    summary: 'Weekly calendar sync with the product team.',
    category: 'work',
    priority: 'medium',
    nextAction: 'Prepare the project update and join on time.',
    dueDate: '2026-06-12T10:00:00.000Z',
    sourceEmailId: 'demo-team-sync',
    sourceType: 'calendar',
  },
];

const DEFAULT_INJECTED_MANUAL_COMMITMENTS: ManualFinancialCommitment[] = [
  {
    id: 'demo-manual-rent',
    name: 'Rent Payment',
    amount: 8000,
    dueDate: '2026-06-18',
    priority: 'high',
    note: 'Monthly rent',
    createdAt: '2026-04-18T00:00:00.000Z',
  },
  {
    id: 'demo-manual-gym',
    name: 'Gym Membership',
    amount: 2500,
    dueDate: '2026-06-20',
    priority: 'medium',
    note: 'Renew before the billing cycle ends',
    createdAt: '2026-04-18T00:00:00.000Z',
  },
];

type PersistedEventPriorityState = {
  emails: GmailMessageSummary[];
  calendarEvents: CalendarEventSummary[];
  actionItems: EmailActionItem[];
  prioritySender: string;
  lastSyncedAt: string | null;
};

type ManualFinancialCommitment = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  priority: EmailActionItem['priority'];
  note?: string;
  createdAt: string;
};

type ManualWorkCommitment = {
  id: string;
  title: string;
  dueDate: string;
  priority: EmailActionItem['priority'];
  note?: string;
  createdAt: string;
};

type InjectedPriorityItemRow = {
  id: string;
  seed_key: string;
  title: string;
  summary: string;
  category: EmailActionItem['category'];
  priority: EmailActionItem['priority'];
  next_action: string;
  due_at: string | null;
  source_type: 'email' | 'calendar' | 'manual';
  source_ref: string | null;
  created_at: string;
};

type InjectedManualCommitmentRow = {
  id: string;
  seed_key: string;
  name: string;
  amount: number | string;
  due_date: string;
  priority: EmailActionItem['priority'];
  note: string | null;
  created_at: string;
};

function loadEventPriorityState(): PersistedEventPriorityState {
  try {
    const raw = localStorage.getItem(EVENT_PRIORITY_STORAGE_KEY);
    if (!raw) {
      return { emails: [], calendarEvents: [], actionItems: [], prioritySender: '', lastSyncedAt: null };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedEventPriorityState>;
    return {
      emails: Array.isArray(parsed.emails) ? parsed.emails : [],
      calendarEvents: Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      prioritySender: typeof parsed.prioritySender === 'string' ? parsed.prioritySender : '',
      lastSyncedAt: typeof parsed.lastSyncedAt === 'string' || parsed.lastSyncedAt === null ? parsed.lastSyncedAt : null,
    };
  } catch {
    return { emails: [], calendarEvents: [], actionItems: [], prioritySender: '', lastSyncedAt: null };
  }
}

function saveEventPriorityState(state: PersistedEventPriorityState) {
  localStorage.setItem(EVENT_PRIORITY_STORAGE_KEY, JSON.stringify(state));
}

function loadManualFinancialCommitments(): ManualFinancialCommitment[] {
  try {
    const raw = localStorage.getItem(MANUAL_COMMITMENTS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is ManualFinancialCommitment => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Record<string, unknown>;
      return (
        typeof candidate.id === 'string' &&
        typeof candidate.name === 'string' &&
        typeof candidate.amount === 'number' &&
        typeof candidate.dueDate === 'string' &&
        (candidate.priority === 'high' || candidate.priority === 'medium' || candidate.priority === 'low')
      );
    });
  } catch {
    return [];
  }
}

function saveManualFinancialCommitments(commitments: ManualFinancialCommitment[]) {
  localStorage.setItem(MANUAL_COMMITMENTS_STORAGE_KEY, JSON.stringify(commitments));
}

function loadManualWorkCommitments(): ManualWorkCommitment[] {
  try {
    const raw = localStorage.getItem(MANUAL_WORK_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is ManualWorkCommitment => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Record<string, unknown>;
      return (
        typeof candidate.id === 'string' &&
        typeof candidate.title === 'string' &&
        typeof candidate.dueDate === 'string' &&
        (candidate.priority === 'high' || candidate.priority === 'medium' || candidate.priority === 'low')
      );
    });
  } catch {
    return [];
  }
}

function saveManualWorkCommitments(commitments: ManualWorkCommitment[]) {
  localStorage.setItem(MANUAL_WORK_STORAGE_KEY, JSON.stringify(commitments));
}

function mapInjectedPriorityItems(rows: InjectedPriorityItemRow[]): EmailActionItem[] {
  return rows.map((row) => ({
    title: row.title,
    summary: row.summary,
    category: row.category,
    priority: row.priority,
    nextAction: row.next_action,
    dueDate: row.due_at || undefined,
    sourceEmailId: row.source_ref || row.seed_key,
    sourceType: row.source_type === 'manual' ? 'email' : row.source_type,
  }));
}

function mapInjectedManualCommitments(rows: InjectedManualCommitmentRow[]): ManualFinancialCommitment[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    dueDate: row.due_date,
    priority: row.priority,
    note: row.note || undefined,
    createdAt: row.created_at,
  }));
}

function mergeActionItems(baseItems: EmailActionItem[], injectedItems: EmailActionItem[]) {
  const seen = new Set<string>();

  return [...injectedItems, ...baseItems].filter((item) => {
    const key = [item.sourceType, item.sourceEmailId || '', item.title, item.summary, item.dueDate || ''].join('|');
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function mergeCommitments(baseItems: ManualFinancialCommitment[], injectedItems: ManualFinancialCommitment[]) {
  const seen = new Set<string>();

  return [...injectedItems, ...baseItems].filter((item) => {
    const key = [item.name, item.amount.toFixed(2), item.dueDate, item.priority, item.note || ''].join('|');
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function fetchInjectedDashboardData() {
  const [priorityResult, commitmentResult] = await Promise.all([
    supabase.from(INJECTED_PRIORITY_ITEMS_TABLE).select('*').order('created_at', { ascending: true }),
    supabase.from(INJECTED_MANUAL_COMMITMENTS_TABLE).select('*').order('created_at', { ascending: true }),
  ]);

  return {
    priorityItems:
      !priorityResult.error && priorityResult.data?.length
        ? mapInjectedPriorityItems(priorityResult.data as InjectedPriorityItemRow[])
        : [],
    manualCommitments:
      !commitmentResult.error && commitmentResult.data?.length
        ? mapInjectedManualCommitments(commitmentResult.data as InjectedManualCommitmentRow[])
        : [],
  };
}

function useInjectedDashboardData() {
  const [priorityItems, setPriorityItems] = useState<EmailActionItem[]>(DEFAULT_INJECTED_PRIORITY_ITEMS);
  const [manualCommitments, setManualCommitments] = useState<ManualFinancialCommitment[]>(DEFAULT_INJECTED_MANUAL_COMMITMENTS);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const injected = await fetchInjectedDashboardData();

      if (cancelled) {
        return;
      }

      setPriorityItems(injected.priorityItems.length ? injected.priorityItems : DEFAULT_INJECTED_PRIORITY_ITEMS);
      setManualCommitments(injected.manualCommitments.length ? injected.manualCommitments : DEFAULT_INJECTED_MANUAL_COMMITMENTS);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    priorityItems,
    manualCommitments,
  };
}

function priorityScore(priority: EmailActionItem['priority']) {
  if (priority === 'high') return 0;
  if (priority === 'medium') return 1;
  return 2;
}

function TopNav({ setActiveSection }: { setActiveSection: (section: string) => void }) {
  const navigate = useNavigate();
  const { user, userProfile, signOut } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = async () => {
    await signOut();
    setShowProfile(false);
    navigate('/');
  };

  return (
    <header className="h-[64px] min-h-[64px] flex items-center justify-between px-6 border-b border-border bg-background z-10 shrink-0 shadow-sm">
      <div className="flex items-center gap-2 w-[220px]">
        <span className="font-display text-xl tracking-tight font-medium text-foreground">✦ Nexora</span>
      </div>

      <AnimatedStatusTicker />

      <div className="flex items-center justify-end gap-5 w-[220px]">
        <div className="text-sm font-medium text-muted-foreground font-body">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>


        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="w-8 h-8 rounded-full bg-border overflow-hidden border border-border/50 hover:ring-2 hover:ring-accent transition-all flex-shrink-0"
          >
            <img src="https://picsum.photos/seed/yash/100/100" alt="Profile avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </button>

          {showProfile && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full right-0 mt-2 bg-background rounded-lg border border-border shadow-lg p-4 w-64 z-[100]"
            >
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                <img src="https://picsum.photos/seed/yash/100/100" alt="Profile" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate font-body">{userProfile?.full_name || 'User'}</div>
                  <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                </div>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={() => { setActiveSection('profile'); setShowProfile(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground font-body">
                  <User className="w-4 h-4" />
                  Edit Profile
                </button>
                <button 
                  onClick={() => { setActiveSection('settings'); setShowProfile(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground font-body">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-accent/10 hover:bg-accent/20 text-accent transition-colors font-medium font-body"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
}

function NavItem({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group outline-none focus-visible:ring-2 focus-visible:ring-accent/50 font-body",
        active
          ? "bg-secondary text-foreground font-medium"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground hover:translate-x-0.5"
      )}
    >
      <Icon className={cn("w-4 h-4", active ? "text-accent" : "text-muted-foreground group-hover:text-foreground")} />
      <span>{label}</span>
    </button>
  );
}

function Sidebar({ activeSection, setActiveSection }: { activeSection: string, setActiveSection: (section: string) => void }) {
  return (
    <aside className="w-[220px] flex-shrink-0 border-r border-border bg-background flex flex-col h-full py-6 px-3">
      <div className="flex-1 flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <div className="px-3 text-xs font-semibold text-muted-foreground/50 uppercase tracking-widest mb-2 font-body">Primary</div>
          <NavItem icon={LayoutDashboard} label="Overview" active={activeSection === 'overview'} onClick={() => setActiveSection('overview')} />
          <NavItem icon={CreditCard} label="Commitments" active={activeSection === 'commitments'} onClick={() => setActiveSection('commitments')} />
          <NavItem icon={Calendar} label="Event Priority" active={activeSection === 'events'} onClick={() => setActiveSection('events')} />
          <NavItem icon={CheckSquare} label="Tasks" active={activeSection === 'tasks'} onClick={() => setActiveSection('tasks')} />
          <NavItem icon={FileText} label="Documents" active={activeSection === 'documents'} onClick={() => setActiveSection('documents')} />
          <NavItem icon={Zap} label="Automations" active={activeSection === 'automations'} onClick={() => setActiveSection('automations')} />
        </div>

        <div className="flex flex-col gap-1">
          <div className="px-3 text-xs font-semibold text-muted-foreground/50 uppercase tracking-widest mb-2 font-body">Connected</div>
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all group font-body">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4" />
              <span>Gmail</span>
            </div>
            <span className="text-xs text-accent">✓</span>
          </button>
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all group font-body">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4" />
              <span>Calendar</span>
            </div>
            <span className="text-xs text-accent">✓</span>
          </button>
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all group font-body">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </div>
            <span className="text-xs text-accent">✓</span>
          </button>
        </div>
      </div>

      <div className="mt-auto">
        <NavItem icon={Settings} label="Settings" active={activeSection === 'settings'} onClick={() => setActiveSection('settings')} />
      </div>
    </aside>
  );
}

function EventPriorityDashboard() {
  const persisted = loadEventPriorityState();
  const { user } = useAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [emails, setEmails] = useState<GmailMessageSummary[]>(persisted.emails);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventSummary[]>(persisted.calendarEvents);
  const [actionItems, setActionItems] = useState<EmailActionItem[]>(persisted.actionItems);
  const { priorityItems: injectedPriorityItems } = useInjectedDashboardData();
  const [extractionMode, setExtractionMode] = useState<ExtractionResult['mode'] | 'mixed' | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'financial' | 'work' | 'other'>('all');
  const [prioritySender, setPrioritySender] = useState(persisted.prioritySender);
  const [manualEventTitle, setManualEventTitle] = useState('');
  const [manualEventDate, setManualEventDate] = useState('');
  const [manualEventTime, setManualEventTime] = useState('');
  const [manualEventLocation, setManualEventLocation] = useState('');
  const [manualEventDescription, setManualEventDescription] = useState('');
  const [manualEmailSender, setManualEmailSender] = useState('');
  const [manualEmailSubject, setManualEmailSubject] = useState('');
  const [manualEmailSnippet, setManualEmailSnippet] = useState('');
  const [manualEmailLabel, setManualEmailLabel] = useState<GmailMailClassification['label']>('important');
  const [manualEmailPriority, setManualEmailPriority] = useState<EmailActionItem['priority']>('high');
  const [manualEmailReason, setManualEmailReason] = useState('Manual review result');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(persisted.lastSyncedAt ? new Date(persisted.lastSyncedAt) : null);
  const [mailClassifications, setMailClassifications] = useState<Record<string, GmailMailClassification>>({});
  const [mailClassificationMode, setMailClassificationMode] = useState<'ollama' | 'rules' | null>(null);

  const priorityClassMap: Record<EmailActionItem['priority'], string> = {
    high: 'bg-red-50 text-red-700 border-red-100',
    medium: 'bg-amber-50 text-amber-700 border-amber-100',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };

  const categoryClassMap: Record<EmailActionItem['category'], string> = {
    work: 'bg-sky-50 text-sky-700 border-sky-100',
    financial: 'bg-violet-50 text-violet-700 border-violet-100',
    other: 'bg-zinc-50 text-zinc-700 border-zinc-200',
  };

  const connectAndAnalyze = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = accessToken || (await requestGmailAccessToken());
      setAccessToken(token);

      const fetchedEmails = await fetchRecentEmails(token, 12);
      setEmails(fetchedEmails);

      const inboxClassification = await classifyEmailsForInbox(fetchedEmails);
      setMailClassifications(
        Object.fromEntries(inboxClassification.items.map((item) => [item.emailId, item])),
      );
      setMailClassificationMode(inboxClassification.mode);

      const fetchedCalendarEvents = await fetchUpcomingCalendarEvents(token, 12);
      setCalendarEvents(fetchedCalendarEvents);

      const emailExtraction = await extractActionItems(fetchedEmails);
      const calendarExtraction = await extractCalendarActionItems(fetchedCalendarEvents);

      const merged = [...emailExtraction.items, ...calendarExtraction.items];
      setActionItems(merged);
      setExtractionMode(
        emailExtraction.mode === 'deepseek' && calendarExtraction.mode === 'deepseek'
          ? 'deepseek'
          : 'mixed',
      );
      const now = new Date();
      setLastSyncedAt(now);

      saveEventPriorityState({
        emails: fetchedEmails,
        calendarEvents: fetchedCalendarEvents,
        actionItems: merged,
        prioritySender,
        lastSyncedAt: now.toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync Gmail data.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, prioritySender]);

  // Auto-connect Gmail when user logs in
  useEffect(() => {
    if (user && !accessToken && !loading) {
      connectAndAnalyze();
    }
  }, [user, accessToken, loading, connectAndAnalyze]);

  useEffect(() => {
    if (!injectedPriorityItems.length) {
      return;
    }

    const persistedState = loadEventPriorityState();
    const mergedActionItems = mergeActionItems(persistedState.actionItems, injectedPriorityItems);

    if (mergedActionItems.length === persistedState.actionItems.length) {
      return;
    }

    setActionItems(mergedActionItems);
    saveEventPriorityState({
      ...persistedState,
      actionItems: mergedActionItems,
    });
  }, [injectedPriorityItems]);

  const filteredActionItems =
    activeCategory === 'all'
      ? actionItems
      : actionItems.filter((item) => item.category === activeCategory);

  const sortedFilteredActionItems = [...filteredActionItems].sort((a, b) => {
    const senderNeedle = prioritySender.trim().toLowerCase();

    const isPrioritySender = (item: EmailActionItem) => {
      if (!senderNeedle || item.sourceType !== 'email') return false;
      const source = emails.find((email) => email.id === item.sourceEmailId);
      return source?.from?.toLowerCase().includes(senderNeedle) ?? false;
    };

    const senderScoreA = isPrioritySender(a) ? 0 : 1;
    const senderScoreB = isPrioritySender(b) ? 0 : 1;
    if (senderScoreA !== senderScoreB) return senderScoreA - senderScoreB;

    const priorityDiff = priorityScore(a.priority) - priorityScore(b.priority);
    if (priorityDiff !== 0) return priorityDiff;

    const timeA = a.dueDate ? Date.parse(a.dueDate) : Number.MAX_SAFE_INTEGER;
    const timeB = b.dueDate ? Date.parse(b.dueDate) : Number.MAX_SAFE_INTEGER;
    return timeA - timeB;
  });

  const totalSpendValue = actionItems
    .filter((item) => item.category === 'financial')
    .reduce((total, item) => {
      const amountMatch = item.summary.match(/(?:₹|INR\s?)(\d[\d,]*(?:\.\d+)?)/i) || item.title.match(/(?:₹|INR\s?)(\d[\d,]*(?:\.\d+)?)/i);
      const parsedAmount = amountMatch?.[1] ? Number(amountMatch[1].replace(/,/g, '')) : 0;
      return total + (Number.isFinite(parsedAmount) ? parsedAmount : 0);
    }, 0);

  useEffect(() => {
    if (!emails.length || Object.keys(mailClassifications).length > 0) {
      return;
    }

    const fallbackItems = classifyEmailsHeuristic(emails);
    setMailClassifications(
      Object.fromEntries(fallbackItems.map((item) => [item.emailId, item])),
    );
    setMailClassificationMode('rules');
  }, [emails, mailClassifications]);

  const classifiedEmailRows = emails
    .map((email) => {
      const classification =
        mailClassifications[email.id] ||
        ({
          emailId: email.id,
          label: 'unimportant',
          priority: 'low',
          confidence: 0.5,
          reason: 'Pending classification.',
        } satisfies GmailMailClassification);

      return {
        email,
        classification,
      };
    })
    .sort((a, b) => {
      const labelRank: Record<GmailMailClassification['label'], number> = {
        important: 0,
        unimportant: 1,
        fishy: 2,
        spam: 3,
      };

      const priorityRank: Record<GmailMailClassification['priority'], number> = {
        high: 0,
        medium: 1,
        low: 2,
      };

      const labelDiff = labelRank[a.classification.label] - labelRank[b.classification.label];
      if (labelDiff !== 0) return labelDiff;

      const priorityDiff = priorityRank[a.classification.priority] - priorityRank[b.classification.priority];
      if (priorityDiff !== 0) return priorityDiff;

      return (b.classification.confidence || 0) - (a.classification.confidence || 0);
    });

  const importantEmails = classifiedEmailRows.filter((row) => row.classification.label === 'important');
  const unimportantEmails = classifiedEmailRows.filter((row) => row.classification.label === 'unimportant');
  const fishyEmails = classifiedEmailRows.filter((row) => row.classification.label === 'fishy');
  const spamEmails = classifiedEmailRows.filter((row) => row.classification.label === 'spam');

  const updateMailClassification = (
    emailId: string,
    label: GmailMailClassification['label'],
    reason: string,
  ) => {
    const priority: GmailMailClassification['priority'] =
      label === 'important' ? 'high' : label === 'fishy' ? 'high' : label === 'unimportant' ? 'low' : 'low';

    setMailClassifications((current) => ({
      ...current,
      [emailId]: {
        emailId,
        label,
        priority,
        confidence: 1,
        reason,
      },
    }));
  };

  const addManualCalendarEvent = () => {
    if (!manualEventTitle.trim()) {
      setError('Please enter an event title.');
      return;
    }

    const start = manualEventDate
      ? `${manualEventDate}${manualEventTime ? `T${manualEventTime}` : 'T09:00'}`
      : new Date().toISOString();

    const end = manualEventDate
      ? `${manualEventDate}${manualEventTime ? `T${manualEventTime}` : 'T10:00'}`
      : new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const manualEvent: CalendarEventSummary = {
      id: `manual-${Date.now()}`,
      title: manualEventTitle.trim(),
      start,
      end,
      location: manualEventLocation.trim(),
      description: manualEventDescription.trim(),
      status: 'confirmed',
      sourceType: 'calendar',
    };

    setCalendarEvents((prev) => [manualEvent, ...prev]);
    const nextItems = [createCalendarActionItem(manualEvent), ...actionItems];
    setActionItems(nextItems);
    setExtractionMode('mixed');
    setManualEventTitle('');
    setManualEventDate('');
    setManualEventTime('');
    setManualEventLocation('');
    setManualEventDescription('');
    setError(null);
    const now = new Date();
    setLastSyncedAt(now);

    saveEventPriorityState({
      emails,
      calendarEvents: [manualEvent, ...calendarEvents],
      actionItems: nextItems,
      prioritySender,
      lastSyncedAt: now.toISOString(),
    });
  };

  const addManualPriorityEmail = () => {
    if (!manualEmailSender.trim() || !manualEmailSubject.trim()) {
      setError('Please enter sender and subject for the manual email recogniser.');
      return;
    }

    const manualEmail: GmailMessageSummary = {
      id: `manual-email-${Date.now()}`,
      from: manualEmailSender.trim(),
      subject: manualEmailSubject.trim(),
      date: new Date().toISOString(),
      snippet: manualEmailSnippet.trim() || 'Manually recognised inbox item.',
    };

    const classification: GmailMailClassification = {
      emailId: manualEmail.id,
      label: manualEmailLabel,
      priority: manualEmailPriority,
      confidence: 1,
      reason: manualEmailReason.trim() || 'Manually recognised inbox item.',
    };

    const nextEmails = [manualEmail, ...emails];
    const nextClassifications = {
      ...mailClassifications,
      [manualEmail.id]: classification,
    };

    setEmails(nextEmails);
    setMailClassifications(nextClassifications);
    setMailClassificationMode('rules');
    setManualEmailSender('');
    setManualEmailSubject('');
    setManualEmailSnippet('');
    setManualEmailLabel('important');
    setManualEmailPriority('high');
    setManualEmailReason('Manual review result');
    setError(null);

    const now = new Date();
    setLastSyncedAt(now);
    saveEventPriorityState({
      emails: nextEmails,
      calendarEvents,
      actionItems,
      prioritySender,
      lastSyncedAt: now.toISOString(),
    });
  };

  const applyPrioritySender = () => {
    saveEventPriorityState({
      emails,
      calendarEvents,
      actionItems,
      prioritySender,
      lastSyncedAt: lastSyncedAt ? lastSyncedAt.toISOString() : null,
    });
  };

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl bg-card border border-border shadow-[0_1px_3px_rgb(0,0,0,0.05)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-serif italic text-primary">Event Priority List</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Event Priority merges Gmail and Calendar into one clean view for work, financial, and other priority items.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={connectAndAnalyze}
                disabled={loading}
                className="h-10 px-5 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all disabled:opacity-60"
              >
                {loading ? 'Analyzing...' : 'Refresh Priority List'}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="px-2.5 py-1 rounded-full bg-muted border border-border">
              {accessToken ? 'Gmail Connected' : 'Gmail Not Connected'}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-muted border border-border">
              {emails.length} Emails Scanned
            </span>
            <span className="px-2.5 py-1 rounded-full bg-muted border border-border">
              {actionItems.length} Action Items
            </span>
            <span className="px-2.5 py-1 rounded-full bg-muted border border-border">
              {calendarEvents.length} Calendar Events
            </span>
            {lastSyncedAt && (
              <span className="px-2.5 py-1 rounded-full bg-muted border border-border">
                Last sync {lastSyncedAt.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {([
              { key: 'all', label: 'All' },
                { key: 'financial', label: 'Financial' },
              { key: 'work', label: 'Work' },
              { key: 'other', label: 'Other' },
            ] as const).map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveCategory(filter.key)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  activeCategory === filter.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-sm text-destructive">
              {error}
            </div>
          )}
        </motion.section>

        <section className="grid grid-cols-12 gap-6 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="col-span-12 lg:col-span-7 bg-card rounded-xl border border-border p-5 h-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif italic text-lg">Priority Actions</h3>
              <span className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">Classified feed</span>
            </div>

            <div className="rounded-lg border border-border/70 bg-background/40 p-2">
              <div className="max-h-[560px] overflow-y-auto pr-2">
                {!loading && filteredActionItems.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                    No extracted action items yet. Connect Gmail to build your priority queue.
                  </div>
                )}

                <div className="space-y-3">
                  {sortedFilteredActionItems.map((item, index) => (
                    <div key={`${item.sourceEmailId || 'item'}-${index}`} className="rounded-lg border border-border p-4 hover:border-primary/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{item.title}</div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.summary}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-[0.65rem] uppercase tracking-widest border rounded-full px-2.5 py-1 ${categoryClassMap[item.category]}`}>
                            {item.category}
                          </span>
                          <span className={`text-[0.65rem] uppercase tracking-widest border rounded-full px-2.5 py-1 ${priorityClassMap[item.priority]}`}>
                            {item.priority}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="px-2.5 py-2 rounded-md bg-muted border border-border text-muted-foreground">
                          Next: <span className="text-foreground font-medium">{item.nextAction}</span>
                        </div>
                        <div className="px-2.5 py-2 rounded-md bg-muted border border-border text-muted-foreground">
                          Due: <span className="text-foreground font-medium">{item.dueDate || 'No explicit deadline'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-12 lg:col-span-5 bg-card rounded-xl border border-border p-5 h-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif italic text-lg">Mail Classification</h3>
              <Mail className="w-4 h-4 text-muted-foreground" />
            </div>

            <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span className="px-2 py-1 rounded-full border border-border bg-muted">
                Important: {importantEmails.length}
              </span>
              <span className="px-2 py-1 rounded-full border border-border bg-muted">
                Unimportant: {unimportantEmails.length}
              </span>
              <span className="px-2 py-1 rounded-full border border-border bg-amber-50 text-amber-700 border-amber-100">
                Fishy: {fishyEmails.length}
              </span>
              <span className="px-2 py-1 rounded-full border border-border bg-rose-50 text-rose-700 border-rose-100">
                Spam: {spamEmails.length}
              </span>
              {mailClassificationMode && (
                <span className="px-2 py-1 rounded-full border border-border bg-muted">
                  Mode: {mailClassificationMode === 'ollama' ? 'ollama-phi3' : 'rules'}
                </span>
              )}
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {emails.length === 0 && (
                <div className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-4">
                  No email metadata loaded.
                </div>
              )}

              {importantEmails.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">Important (Top Priority)</div>
                  {importantEmails.map((row) => (
                    <div key={row.email.id} className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/60">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-semibold truncate">{row.email.subject}</div>
                        <span className="text-[10px] uppercase tracking-widest text-emerald-700">{row.classification.priority}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">{row.email.from}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{row.email.snippet}</div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                        <button onClick={() => updateMailClassification(row.email.id, 'unimportant', 'Manually moved to unimportant.')}
                          className="px-2 py-1 rounded-full border border-border bg-background hover:bg-muted transition-colors">Unimportant</button>
                        <button onClick={() => updateMailClassification(row.email.id, 'fishy', 'Manually marked as fishy.')}
                          className="px-2 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">Fishy</button>
                        <button onClick={() => updateMailClassification(row.email.id, 'spam', 'Manually marked as spam.')}
                          className="px-2 py-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors">Spam</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {unimportantEmails.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">Unimportant (Bottom Queue)</div>
                  {unimportantEmails.map((row) => (
                    <div key={row.email.id} className="p-3 rounded-lg border border-border bg-background/60">
                      <div className="text-xs font-semibold truncate">{row.email.subject}</div>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">{row.email.from}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{row.email.snippet}</div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                        <button onClick={() => updateMailClassification(row.email.id, 'important', 'Manually promoted to important.')}
                          className="px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">Important</button>
                        <button onClick={() => updateMailClassification(row.email.id, 'fishy', 'Manually marked as fishy.')}
                          className="px-2 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">Fishy</button>
                        <button onClick={() => updateMailClassification(row.email.id, 'spam', 'Manually marked as spam.')}
                          className="px-2 py-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors">Spam</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {fishyEmails.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-700">Fishy (Review Carefully)</div>
                  {fishyEmails.map((row) => (
                    <div key={row.email.id} className="p-3 rounded-lg border border-amber-200 bg-amber-50/70">
                      <div className="text-xs font-semibold truncate">{row.email.subject}</div>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">{row.email.from}</div>
                      <div className="text-[11px] text-amber-800 mt-1 line-clamp-2">{row.classification.reason}</div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                        <button onClick={() => updateMailClassification(row.email.id, 'important', 'Manually promoted to important.')}
                          className="px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">Important</button>
                        <button onClick={() => updateMailClassification(row.email.id, 'unimportant', 'Manually moved to unimportant.')}
                          className="px-2 py-1 rounded-full border border-border bg-background hover:bg-muted transition-colors">Unimportant</button>
                        <button onClick={() => updateMailClassification(row.email.id, 'spam', 'Manually marked as spam.')}
                          className="px-2 py-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors">Spam</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {spamEmails.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-rose-700">Spam (Isolated Section)</div>
                  {spamEmails.map((row) => (
                    <div key={row.email.id} className="p-3 rounded-lg border border-rose-200 bg-rose-50/70">
                      <div className="text-xs font-semibold truncate">{row.email.subject}</div>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">{row.email.from}</div>
                      <div className="text-[11px] text-rose-800 mt-1 line-clamp-2">{row.classification.reason}</div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                        <button onClick={() => updateMailClassification(row.email.id, 'important', 'Manually promoted to important.')}
                          className="px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">Important</button>
                        <button onClick={() => updateMailClassification(row.email.id, 'unimportant', 'Manually moved to unimportant.')}
                          className="px-2 py-1 rounded-full border border-border bg-background hover:bg-muted transition-colors">Unimportant</button>
                        <button onClick={() => updateMailClassification(row.email.id, 'fishy', 'Manually marked as fishy.')}
                          className="px-2 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">Fishy</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="col-span-12 bg-card rounded-xl border border-border p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif italic text-lg">Upcoming Calendar Events</h3>
              <span className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">Calendar synced</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {calendarEvents.length === 0 && (
                <div className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-4 col-span-full">
                  No calendar events loaded yet. Connect Gmail and Calendar access to see upcoming appointments.
                </div>
              )}

              {calendarEvents.map((event) => (
                <div key={event.id} className="p-4 rounded-lg border border-border bg-background/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{event.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{event.start || 'No start time'}</div>
                    </div>
                    <span className="text-[0.65rem] uppercase tracking-widest border rounded-full px-2.5 py-1 bg-sky-50 text-sky-700 border-sky-100">
                      calendar
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground space-y-1">
                    {event.location && <div>Location: {event.location}</div>}
                    {event.description && <div className="line-clamp-2">{event.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="grid grid-cols-12 gap-6 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-12 lg:col-span-6 bg-card rounded-xl border border-border p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif italic text-lg">Expense Tracker</h3>
              <span className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">Spending insights</span>
            </div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Monthly detected spend</div>
                <div className="text-3xl font-semibold mt-1">₹{totalSpendValue.toLocaleString('en-IN')}</div>
              </div>
              <div className="text-xs text-muted-foreground text-right max-w-44">
                Detected from financial emails and calendar reminders.
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="col-span-12 lg:col-span-6 bg-card rounded-xl border border-border p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif italic text-lg">Smart Filters</h3>
              <span className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">Priority + category</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                'all',
                'financial',
                'work',
                'other',
              ] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveCategory(filter)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    activeCategory === filter
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="grid grid-cols-12 gap-6 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-12 bg-card rounded-xl border border-border p-5"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-serif italic text-lg">Manual Adders</h3>
                <p className="text-xs text-muted-foreground mt-1">Keep manual entries here so the top of the page stays focused on live Gmail triage.</p>
              </div>
              <MessageCircle className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-medium font-body text-foreground">Manual Calendar Event</div>
                    <div className="text-xs text-muted-foreground font-body">Create an event locally.</div>
                  </div>
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={manualEventTitle} onChange={(e) => setManualEventTitle(e.target.value)} placeholder="Event title" className="px-3 py-2 rounded-lg border border-border bg-muted text-sm md:col-span-2" />
                  <input type="date" value={manualEventDate} onChange={(e) => setManualEventDate(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-muted text-sm" />
                  <input type="time" value={manualEventTime} onChange={(e) => setManualEventTime(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-muted text-sm" />
                  <input value={manualEventLocation} onChange={(e) => setManualEventLocation(e.target.value)} placeholder="Location" className="px-3 py-2 rounded-lg border border-border bg-muted text-sm md:col-span-2" />
                </div>
                <textarea value={manualEventDescription} onChange={(e) => setManualEventDescription(e.target.value)} placeholder="Optional notes or agenda" rows={2} className="mt-3 w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm resize-none" />
                <button onClick={addManualCalendarEvent} className="mt-3 w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Add Event</button>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-medium font-body text-foreground">Priority Email Sender</div>
                    <div className="text-xs text-muted-foreground font-body">Pin matching senders to the top.</div>
                  </div>
                  <Mail className="w-5 h-5 text-muted-foreground" />
                </div>
                <input value={prioritySender} onChange={(e) => setPrioritySender(e.target.value)} placeholder="name@company.com or keyword" className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm" />
                <button onClick={applyPrioritySender} className="mt-3 w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Apply Priority Sender</button>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-medium font-body text-foreground">Manual Priority Email Recogniser</div>
                    <div className="text-xs text-muted-foreground font-body">Classify a mail by hand.</div>
                  </div>
                  <MessageCircle className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={manualEmailSender} onChange={(e) => setManualEmailSender(e.target.value)} placeholder="Sender" className="px-3 py-2 rounded-lg border border-border bg-muted text-sm" />
                  <input value={manualEmailSubject} onChange={(e) => setManualEmailSubject(e.target.value)} placeholder="Subject" className="px-3 py-2 rounded-lg border border-border bg-muted text-sm" />
                  <select value={manualEmailLabel} onChange={(e) => setManualEmailLabel(e.target.value as GmailMailClassification['label'])} className="px-3 py-2 rounded-lg border border-border bg-muted text-sm">
                    <option value="important">Important</option>
                    <option value="unimportant">Unimportant</option>
                    <option value="fishy">Fishy</option>
                    <option value="spam">Spam</option>
                  </select>
                  <select value={manualEmailPriority} onChange={(e) => setManualEmailPriority(e.target.value as EmailActionItem['priority'])} className="px-3 py-2 rounded-lg border border-border bg-muted text-sm">
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
                <textarea value={manualEmailSnippet} onChange={(e) => setManualEmailSnippet(e.target.value)} placeholder="Snippet or short message preview" rows={2} className="mt-3 w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm resize-none" />
                <div className="mt-3 flex flex-col md:flex-row gap-3">
                  <input value={manualEmailReason} onChange={(e) => setManualEmailReason(e.target.value)} placeholder="Reason" className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted text-sm" />
                  <button onClick={addManualPriorityEmail} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Add Mail</button>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

      </div>
    </main>
  );
}

function TasksDashboard() {
  const [persisted, setPersisted] = useState(() => loadEventPriorityState());
  const { priorityItems: injectedPriorityItems } = useInjectedDashboardData();
  const senderNeedle = persisted.prioritySender.trim().toLowerCase();

  useEffect(() => {
    if (!injectedPriorityItems.length) {
      return;
    }

    setPersisted((current) => {
      const mergedActionItems = mergeActionItems(current.actionItems, injectedPriorityItems);

      if (mergedActionItems.length === current.actionItems.length) {
        return current;
      }

      const next = {
        ...current,
        actionItems: mergedActionItems,
      };

      saveEventPriorityState(next);
      return next;
    });
  }, [injectedPriorityItems]);

  const isPriorityEmail = (item: EmailActionItem) => {
    if (!senderNeedle || item.sourceType !== 'email') return false;
    const source = persisted.emails.find((email) => email.id === item.sourceEmailId);
    return source?.from?.toLowerCase().includes(senderNeedle) ?? false;
  };

  const sorted = [...persisted.actionItems].sort((a, b) => {
    const senderScoreA = isPriorityEmail(a) ? 0 : 1;
    const senderScoreB = isPriorityEmail(b) ? 0 : 1;
    if (senderScoreA !== senderScoreB) return senderScoreA - senderScoreB;

    const priorityDiff = priorityScore(a.priority) - priorityScore(b.priority);
    if (priorityDiff !== 0) return priorityDiff;

    const timeA = a.dueDate ? Date.parse(a.dueDate) : Number.MAX_SAFE_INTEGER;
    const timeB = b.dueDate ? Date.parse(b.dueDate) : Number.MAX_SAFE_INTEGER;
    return timeA - timeB;
  });

  const financeDueTasks = sorted.filter((item) => item.category === 'financial').slice(0, 8);
  const upcomingEventTasks = sorted.filter((item) => item.sourceType === 'calendar' || item.category === 'work').slice(0, 8);

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-xl bg-card border border-border">
          <h2 className="text-2xl font-serif italic text-primary">Tasks</h2>
          <p className="text-sm text-muted-foreground mt-1">Auto-generated from Event Priority intelligence: financial dues and upcoming events.</p>
        </motion.div>

        <section className="grid grid-cols-12 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="col-span-12 lg:col-span-6 bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif italic text-lg">Finance Due</h3>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {financeDueTasks.length === 0 && <div className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-4 col-span-full">No finance due tasks detected yet.</div>}
              {financeDueTasks.map((task) => (
                <div key={`task-finance-${task.sourceEmailId}`} className="rounded-lg border border-border bg-background/60 p-3">
                  <div className="text-xs font-semibold line-clamp-2">{task.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{task.dueDate || 'No due date'}</div>
                  <div className="mt-2 text-[11px] text-muted-foreground line-clamp-2">{task.nextAction}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="col-span-12 lg:col-span-6 bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif italic text-lg">Upcoming Events</h3>
              <TrendingUp className="w-4 h-4 text-sky-600" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcomingEventTasks.length === 0 && <div className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-4 col-span-full">No upcoming event tasks detected yet.</div>}
              {upcomingEventTasks.map((task) => (
                <div key={`task-event-${task.sourceEmailId}`} className="rounded-lg border border-border bg-background/60 p-3">
                  <div className="text-xs font-semibold line-clamp-2">{task.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{task.dueDate || 'No scheduled time'}</div>
                  <div className="mt-2 text-[11px] text-muted-foreground line-clamp-2">{task.nextAction}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

function ActionPill({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={`px-[14px] py-[6px] rounded-full border text-[0.75rem] font-medium transition-all focus:outline-none focus:ring-1 focus:ring-accent/50 font-body ${
        active
          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
          : 'bg-background border-border text-foreground hover:bg-secondary hover:shadow-sm'
      }`}
    >
      {label}
    </motion.button>
  );
}

function CommitmentsDashboard() {
  const [bills] = useState([
    { id: 1, name: 'AMEX Gold Bill', amount: '₹12,500', dueDate: 'Jun 14', status: 'urgent', icon: CreditCard, color: '#EF4444' },
    { id: 2, name: 'Netflix Subscription', amount: '₹649', dueDate: 'Jun 16', status: 'normal', icon: Zap, color: '#F59E0B' },
  ]);

  const [subscriptions] = useState([
    { id: 1, name: 'Netflix', amount: '₹649/mo', date: 'Jun 16', status: 'active', source: 'Auto', color: '#8B5CF6' },
    { id: 2, name: 'Gym Membership', amount: '₹2,500/mo', date: 'Jun 20', status: 'active', source: 'Bank', color: '#EC4899' },
  ]);

  const { manualCommitments: injectedCommitments } = useInjectedDashboardData();
  const [manualCommitments, setManualCommitments] = useState<ManualFinancialCommitment[]>(() => loadManualFinancialCommitments());
  const [manualWorkItems, setManualWorkItems] = useState<ManualWorkCommitment[]>(() => loadManualWorkCommitments());
  const [manualFinanceTitle, setManualFinanceTitle] = useState('');
  const [manualFinanceAmount, setManualFinanceAmount] = useState('');
  const [manualFinanceDueDate, setManualFinanceDueDate] = useState('');
  const [manualFinanceNote, setManualFinanceNote] = useState('');
  const [manualFinancePriority, setManualFinancePriority] = useState<EmailActionItem['priority']>('high');
  const [manualWorkTitle, setManualWorkTitle] = useState('');
  const [manualWorkDueDate, setManualWorkDueDate] = useState('');
  const [manualWorkNote, setManualWorkNote] = useState('');
  const [manualWorkPriority, setManualWorkPriority] = useState<EmailActionItem['priority']>('medium');
  const [manualCommitmentMessage, setManualCommitmentMessage] = useState('');

  useEffect(() => {
    if (!injectedCommitments.length) {
      return;
    }

    setManualCommitments((current) => {
      const merged = mergeCommitments(current, injectedCommitments);

      if (merged.length === current.length) {
        return current;
      }

      saveManualFinancialCommitments(merged);
      return merged;
    });
  }, [injectedCommitments]);

  const addManualFinancialCommitment = () => {
    if (!manualFinanceTitle.trim() || !manualFinanceAmount.trim()) {
      setManualCommitmentMessage('Enter a title and amount for the financial commitment.');
      return;
    }

    const nextItem: ManualFinancialCommitment = {
      id: `commitment-${Date.now()}`,
      name: manualFinanceTitle.trim(),
      amount: Number(manualFinanceAmount),
      dueDate: manualFinanceDueDate || new Date().toISOString().slice(0, 10),
      priority: manualFinancePriority,
      note: manualFinanceNote.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const next = [nextItem, ...manualCommitments];
    setManualCommitments(next);
    saveManualFinancialCommitments(next);
    setManualFinanceTitle('');
    setManualFinanceAmount('');
    setManualFinanceDueDate('');
    setManualFinanceNote('');
    setManualFinancePriority('high');
    setManualCommitmentMessage('Financial commitment added.');
  };

  const addManualWorkItem = () => {
    if (!manualWorkTitle.trim()) {
      setManualCommitmentMessage('Enter a title for the work item.');
      return;
    }

    const nextItem: ManualWorkCommitment = {
      id: `work-${Date.now()}`,
      title: manualWorkTitle.trim(),
      dueDate: manualWorkDueDate || new Date().toISOString().slice(0, 10),
      priority: manualWorkPriority,
      note: manualWorkNote.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const next = [nextItem, ...manualWorkItems];
    setManualWorkItems(next);
    saveManualWorkCommitments(next);
    setManualWorkTitle('');
    setManualWorkDueDate('');
    setManualWorkNote('');
    setManualWorkPriority('medium');
    setManualCommitmentMessage('Work item added.');
  };

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-display font-semibold mb-8 text-foreground">Financial Commitments</h2>
        </motion.div>

        <div className="grid gap-8">
          {/* Quick Add Section */}
          <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <h3 className="text-lg font-semibold font-display mb-4 text-foreground">Quick Add</h3>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-background border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-medium font-body text-foreground">Manual Financial Commitment</div>
                    <div className="text-sm text-muted-foreground font-body">Add a custom payment or due item.</div>
                  </div>
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={manualFinanceTitle} onChange={(e) => setManualFinanceTitle(e.target.value)} placeholder="Title" className="px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
                  <input value={manualFinanceAmount} onChange={(e) => setManualFinanceAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="Amount" className="px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
                  <input type="date" value={manualFinanceDueDate} onChange={(e) => setManualFinanceDueDate(e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
                  <select value={manualFinancePriority} onChange={(e) => setManualFinancePriority(e.target.value as EmailActionItem['priority'])} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm">
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
                <textarea value={manualFinanceNote} onChange={(e) => setManualFinanceNote(e.target.value)} placeholder="Optional note" rows={2} className="mt-3 w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm resize-none" />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <button onClick={addManualFinancialCommitment} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Add Financial Commitment</button>
                  <span className="text-xs text-muted-foreground">Saved locally for commitments and overview</span>
                </div>
              </div>

              <div className="bg-background border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-medium font-body text-foreground">Manual Work Addition</div>
                    <div className="text-sm text-muted-foreground font-body">Add a work task or reminder.</div>
                  </div>
                  <CheckSquare className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={manualWorkTitle} onChange={(e) => setManualWorkTitle(e.target.value)} placeholder="Work title" className="px-3 py-2 rounded-lg bg-muted border border-border text-sm md:col-span-2" />
                  <input type="date" value={manualWorkDueDate} onChange={(e) => setManualWorkDueDate(e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
                  <select value={manualWorkPriority} onChange={(e) => setManualWorkPriority(e.target.value as EmailActionItem['priority'])} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm">
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
                <textarea value={manualWorkNote} onChange={(e) => setManualWorkNote(e.target.value)} placeholder="Optional note" rows={2} className="mt-3 w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm resize-none" />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <button onClick={addManualWorkItem} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Add Work Item</button>
                  <span className="text-xs text-muted-foreground">Stored locally for planning</span>
                </div>
              </div>
            </div>
            {manualCommitmentMessage && <div className="mt-3 text-sm text-muted-foreground">{manualCommitmentMessage}</div>}
          </motion.section>

          {/* Bills Section */}
          <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 className="text-lg font-semibold font-display mb-4 text-foreground">Bills Due</h3>
            <div className="space-y-3">
              {bills.map(bill => (
                <div key={bill.id} className="flex items-center justify-between p-4 rounded-lg bg-background border border-border hover:border-accent/50 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bill.color }} />
                    <div>
                      <div className="font-medium font-body text-foreground">{bill.name}</div>
                      <div className="text-sm text-muted-foreground font-body">{bill.dueDate}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="font-semibold text-right font-body text-foreground">{bill.amount}</div>
                    <button className="px-3 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 text-sm transition-colors font-body font-medium">Pay</button>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Subscriptions Section */}
          <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h3 className="text-lg font-semibold font-display mb-4 text-foreground">Active Subscriptions</h3>
            <div className="space-y-3">
              {subscriptions.map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-4 rounded-lg bg-background border border-border hover:border-accent/50 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: sub.color }} />
                    <div>
                      <div className="font-medium font-body text-foreground">{sub.name}</div>
                      <div className="text-sm text-muted-foreground font-body">{sub.date} • {sub.source}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold font-body text-foreground">{sub.amount}</div>
                      <div className="text-xs text-muted-foreground capitalize font-body">{sub.status}</div>
                    </div>
                    <button className="px-3 py-1 rounded bg-secondary text-foreground text-sm hover:bg-secondary/80 transition-colors font-body font-medium">Manage</button>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Manual Commitments Section */}
          <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h3 className="text-lg font-semibold font-display mb-4 text-foreground">Manual Financial Commitments</h3>
            <div className="space-y-3">
              {manualCommitments.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground font-body">
                  No manual commitments saved yet. Add them from Quick Add above.
                </div>
              )}

              {manualCommitments.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-background border border-border hover:border-accent/50 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.priority === 'high' ? 'bg-red-500' : item.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <div>
                      <div className="font-medium font-body text-foreground">{item.name}</div>
                      <div className="text-sm text-muted-foreground font-body">
                        Due {item.dueDate}{item.note ? ` • ${item.note}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold font-body text-foreground">₹{item.amount.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">{item.priority}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h3 className="text-lg font-semibold font-display mb-4 text-foreground">Manual Work Items</h3>
            <div className="space-y-3">
              {manualWorkItems.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground font-body">
                  No manual work items saved yet. Add them from Quick Add above.
                </div>
              )}

              {manualWorkItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-background border border-border hover:border-accent/50 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.priority === 'high' ? 'bg-red-500' : item.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <div>
                      <div className="font-medium font-body text-foreground">{item.title}</div>
                      <div className="text-sm text-muted-foreground font-body">
                        Due {item.dueDate}{item.note ? ` • ${item.note}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold font-body text-foreground capitalize">{item.priority}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">work</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </div>
      </div>
    </main>
  );
}

function ProfileDashboard() {
  const { userProfile, user, updateProfile } = useAuth();
  const [name, setName] = useState(userProfile?.full_name || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [timezone, setTimezone] = useState(userProfile?.timezone || 'UTC');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      await updateProfile({ full_name: name, phone, timezone });
      setMessage('Profile updated successfully!');
    } catch (error: any) {
      setMessage(error.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-display font-semibold mb-8 text-foreground">Edit Profile</h2>
        </motion.div>

        <motion.form 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onSubmit={handleSave} 
          className="bg-card border border-border rounded-xl p-6 flex flex-col gap-6 shadow-[0_1px_3px_rgb(0,0,0,0.05)]"
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium font-body text-foreground">Email</label>
            <input 
              type="email" 
              value={user?.email || ''} 
              disabled 
              className="w-full px-4 py-2 rounded-md bg-secondary text-muted-foreground border border-border font-body cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">Your email cannot be changed.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium font-body text-foreground">Full Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name" 
              className="w-full px-4 py-2 rounded-md bg-background border border-border focus:outline-none focus:ring-1 focus:ring-accent/50 font-body"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium font-body text-foreground">Phone Number</label>
              <input 
                type="tel" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000" 
                className="w-full px-4 py-2 rounded-md bg-background border border-border focus:outline-none focus:ring-1 focus:ring-accent/50 font-body"
              />
              <p className="text-xs text-muted-foreground">Used for WhatsApp daily briefings.</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium font-body text-foreground">Timezone</label>
              <select 
                value={timezone} 
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-background border border-border focus:outline-none focus:ring-1 focus:ring-accent/50 font-body cursor-pointer"
              >
                <option value="UTC">UTC (GMT+0)</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT+1)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Dubai">Dubai (GST)</option>
                <option value="Asia/Kolkata">India (IST)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Australia/Sydney">Sydney (AEST)</option>
              </select>
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm font-body ${message.includes('success') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
              {message}
            </div>
          )}

          <div className="pt-4 border-t border-border flex justify-end">
            <button 
              type="submit" 
              disabled={isSaving || !name.trim() || (name === userProfile?.full_name && phone === (userProfile?.phone || '') && timezone === (userProfile?.timezone || 'UTC'))}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-body"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </motion.form>
      </div>
    </main>
  );
}

function SettingsDashboard() {
  const { theme, setTheme } = useTheme();

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-display font-semibold mb-8 text-foreground">Settings</h2>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid gap-6">
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4 shadow-[0_1px_3px_rgb(0,0,0,0.05)]">
            <h3 className="font-display text-lg font-medium border-b border-border pb-3">Appearance</h3>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium font-body">Theme</div>
                <div className="text-sm text-muted-foreground font-body">Select your preferred theme.</div>
              </div>
              <select 
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
                className="px-3 py-1.5 rounded-md bg-secondary border border-border font-body text-sm outline-none cursor-pointer"
              >
                <option value="system">System Default</option>
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4 shadow-[0_1px_3px_rgb(0,0,0,0.05)]">
            <h3 className="font-display text-lg font-medium border-b border-border pb-3">Notifications</h3>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium font-body">Email Summaries</div>
                <div className="text-sm text-muted-foreground font-body">Receive a daily briefing email.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium font-body">WhatsApp Alerts</div>
                <div className="text-sm text-muted-foreground font-body">Get notified about high priority tasks.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4 shadow-[0_1px_3px_rgb(0,0,0,0.05)]">
            <h3 className="font-display text-lg font-medium border-b border-border pb-3">AI Persona</h3>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium font-body">Tone of Voice</div>
                <div className="text-sm text-muted-foreground font-body">How should the Chief of Staff talk to you?</div>
              </div>
              <select className="px-3 py-1.5 rounded-md bg-secondary border border-border font-body text-sm outline-none cursor-pointer">
                <option>Strict Professional</option>
                <option>Casual & Friendly</option>
                <option>Extremely Concise</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 pt-2 border-t border-border mt-2">
              <label className="font-medium font-body text-sm">Custom Instructions</label>
              <textarea 
                className="w-full h-24 p-3 rounded-md bg-background border border-border focus:outline-none focus:ring-1 focus:ring-accent/50 font-body text-sm resize-none"
                placeholder="e.g., 'Never schedule meetings before 10 AM', 'Prioritize emails from my boss...'"
              ></textarea>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4 shadow-[0_1px_3px_rgb(0,0,0,0.05)]">
            <h3 className="font-display text-lg font-medium border-b border-border pb-3">Integrations</h3>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <div className="font-medium font-body">Google Calendar</div>
                  <div className="text-sm text-muted-foreground font-body">Connect to schedule tasks.</div>
                </div>
              </div>
              <button className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 font-body border border-border">Connect</button>
            </div>
            
            <div className="flex items-center justify-between py-2 border-t border-border pt-4 mt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Mail className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <div className="font-medium font-body">Gmail</div>
                  <div className="text-sm text-muted-foreground font-body">Extract action items from inbox.</div>
                </div>
              </div>
              <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 font-body">Connected</button>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

function MainWorkspace({ activeSection }: { activeSection: string }) {
  const { userProfile } = useAuth();
  const [activeOverviewAction, setActiveOverviewAction] = useState<'pay' | 'snooze' | null>(null);
  const [overviewSummary, setOverviewSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const { priorityItems: injectedPriorityItems, manualCommitments: injectedManualCommitments } = useInjectedDashboardData();

  const persistedState = loadEventPriorityState();
  const mergedOverviewActionItems = mergeActionItems(persistedState.actionItems, injectedPriorityItems);
  const mergedOverviewCommitments = mergeCommitments(loadManualFinancialCommitments(), injectedManualCommitments);

  const payOptions = [
    ...mergedOverviewActionItems
      .filter((item) => item.category === 'financial')
      .map((item) => ({
        id: `pay-action-${item.sourceEmailId || item.title}`,
        title: item.title,
        subtitle: item.dueDate ? `Due ${item.dueDate}` : 'No due date',
        detail: item.nextAction,
      })),
    ...mergedOverviewCommitments.map((item) => ({
      id: `pay-commitment-${item.id}`,
      title: item.name,
      subtitle: `Due ${item.dueDate}`,
      detail: `₹${item.amount.toLocaleString('en-IN')}${item.note ? ` • ${item.note}` : ''}`,
    })),
  ];

  const snoozeOptions = mergedOverviewActionItems
    .filter((item) => item.category !== 'financial')
    .map((item) => ({
      id: `snooze-${item.sourceEmailId || item.title}`,
      title: item.title,
      subtitle: item.dueDate ? `Scheduled ${item.dueDate}` : 'No schedule',
      detail: item.nextAction,
    }));

  const formatOverviewDate = (value?: string | null) => {
    if (!value) {
      return 'No due date';
    }

    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return value;
    }

    return new Date(parsed).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const timelineItems = [
    ...mergedOverviewActionItems.map((item) => ({
      id: `timeline-action-${item.sourceEmailId || item.title}`,
      date: item.dueDate || '',
      label: item.title,
      source: item.sourceType === 'calendar' ? 'Calendar' : item.category === 'financial' ? 'Finance' : 'Inbox',
      priority: item.priority,
    })),
    ...mergedOverviewCommitments.map((item) => ({
      id: `timeline-commitment-${item.id}`,
      date: item.dueDate,
      label: item.name,
      source: 'Commitment',
      priority: item.priority,
    })),
  ]
    .sort((a, b) => {
      const aTime = a.date ? Date.parse(a.date) : Number.MAX_SAFE_INTEGER;
      const bTime = b.date ? Date.parse(b.date) : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })
    .slice(0, 6);

  const overviewHighlights = timelineItems.slice(0, 5).map((item) => `${item.label} (${item.source})`);
  const highPriorityCount = mergedOverviewActionItems.filter((item) => item.priority === 'high').length;
  const financialItemCount = mergedOverviewActionItems.filter((item) => item.category === 'financial').length;
  const financialCommitmentTotal = mergedOverviewCommitments.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0);

  const amountByPriority = mergedOverviewCommitments.reduce(
    (accumulator, item) => {
      accumulator[item.priority] += Number.isFinite(item.amount) ? item.amount : 0;
      return accumulator;
    },
    { high: 0, medium: 0, low: 0 },
  );

  const maxPriorityAmount = Math.max(amountByPriority.high, amountByPriority.medium, amountByPriority.low, 1);
  const buildFallbackOverviewSummary = () => {
    const highPriorityCount = mergedOverviewActionItems.filter((item) => item.priority === 'high').length;
    const financialCount = mergedOverviewActionItems.filter((item) => item.category === 'financial').length;
    const totalDueValue = mergedOverviewCommitments.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0);
    const nextPriorityItems = mergedOverviewActionItems
      .slice(0, 3)
      .map((item) => item.title)
      .join(', ');

    return [
      `Snapshot: ${mergedOverviewActionItems.length} tracked items and ${mergedOverviewCommitments.length} commitments are active today.`,
      `Priorities: ${highPriorityCount} high-priority tasks, ${financialCount} finance-related items, and total due value of ₹${totalDueValue.toLocaleString('en-IN')}.`,
      `Next steps: Focus on ${nextPriorityItems || 'the earliest due items'} and complete critical payments first.`,
      'Note: Showing offline summary because AI response is currently unavailable.',
    ].join('\n');
  };

  const summarizeOverview = async () => {
    setIsSummarizing(true);
    setSummaryError('');

    try {
      const summaryPayload = {
        userName: userProfile?.full_name || 'User',
        priorityItems: mergedOverviewActionItems.slice(0, 12).map((item) => ({
          title: item.title,
          category: item.category,
          priority: item.priority,
          dueDate: item.dueDate || null,
          nextAction: item.nextAction,
        })),
        commitments: mergedOverviewCommitments.slice(0, 10).map((item) => ({
          name: item.name,
          amount: item.amount,
          dueDate: item.dueDate,
          priority: item.priority,
          note: item.note || null,
        })),
      };

      const summary = await generateChatResponse([
        {
          role: 'system',
          content: 'You are Nexora overview assistant. Produce a concise operational summary in plain text with exactly three titled lines: Snapshot, Priorities, Next steps. Keep total response under 120 words and do not use markdown formatting.',
        },
        {
          role: 'user',
          content: `Summarize this dashboard state for the user. Data: ${JSON.stringify(summaryPayload)}`,
        },
      ]);

      setOverviewSummary(summary.trim());
    } catch (error) {
      const fallbackSummary = buildFallbackOverviewSummary();
      setOverviewSummary(fallbackSummary);
      setSummaryError('');
      console.error('LLM summary failed, using fallback summary.', error);
    } finally {
      setIsSummarizing(false);
    }
  };

  if (activeSection === 'profile') {
    return <ProfileDashboard />;
  }

  if (activeSection === 'settings') {
    return <SettingsDashboard />;
  }

  if (activeSection === 'commitments') {
    return <CommitmentsDashboard />;
  }

  if (activeSection === 'events') {
    return <EventPriorityDashboard />;
  }

  if (activeSection === 'tasks') {
    return <TasksDashboard />;
  }

  if (activeSection === 'documents') {
    return <Documents />;
  }

  if (activeSection === 'automations') {
    return <Automations />;
  }

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8 relative scrollbar-hide">
      <div className="max-w-4xl mx-auto flex flex-col gap-12">

        {/* Header / Brief */}
        <section className="flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground font-display">
              Greetings, <span className="text-2xl font-bold text-foreground">{userProfile?.full_name || 'User'}</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="p-6 rounded-xl bg-background border border-border shadow-sm relative flex items-center justify-between"
          >
            <div>
              <h1 className="text-2xl font-display font-semibold text-foreground mb-3">
                You have <span className="text-accent pr-1">{mergedOverviewActionItems.length || 0} things</span> that need attention today.
              </h1>

              <ul className="text-sm text-muted-foreground w-max grid grid-cols-2 gap-x-6 gap-y-2 font-body">
                {overviewHighlights.length > 0 ? (
                  overviewHighlights.map((highlight) => (
                    <li key={highlight} className="flex items-center gap-2">
                      <span className="text-accent font-bold leading-none">•</span>
                      <span>{highlight}</span>
                    </li>
                  ))
                ) : (
                  <li className="flex items-center gap-2">
                    <span className="text-accent font-bold leading-none">•</span>
                    <span>No active highlights yet. Connect inbox and calendar to populate this panel.</span>
                  </li>
                )}
              </ul>
            </div>

            <button
              onClick={summarizeOverview}
              disabled={isSummarizing}
              className="h-10 px-5 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all outline-none font-body disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSummarizing ? 'Summarising...' : 'Summarise'}
            </button>
          </motion.div>

          {(overviewSummary || summaryError) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border text-sm whitespace-pre-line ${
                summaryError
                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                  : 'border-border bg-card text-foreground'
              }`}
            >
              {summaryError || overviewSummary}
            </motion.div>
          )}
        </section>

        {/* Action Strip */}
        <motion.section
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <ActionPill
              label="Pay"
              active={activeOverviewAction === 'pay'}
              onClick={() => setActiveOverviewAction((prev) => (prev === 'pay' ? null : 'pay'))}
            />
            <ActionPill
              label="Snooze"
              active={activeOverviewAction === 'snooze'}
              onClick={() => setActiveOverviewAction((prev) => (prev === 'snooze' ? null : 'snooze'))}
            />
          </div>

          {activeOverviewAction === 'pay' && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm font-semibold font-display text-foreground mb-3">To Be Paid</div>
              {payOptions.length === 0 ? (
                <div className="text-sm text-muted-foreground font-body">No payable items found in your stored data.</div>
              ) : (
                <div className="space-y-2">
                  {payOptions.slice(0, 8).map((item) => (
                    <div key={item.id} className="p-3 rounded-lg border border-border bg-background/70">
                      <div className="text-sm font-medium text-foreground font-body">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-body">{item.subtitle}</div>
                      <div className="text-xs text-muted-foreground mt-1 font-body">{item.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeOverviewAction === 'snooze' && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm font-semibold font-display text-foreground mb-3">Snooze Suggestions</div>
              {snoozeOptions.length === 0 ? (
                <div className="text-sm text-muted-foreground font-body">No snoozable non-financial items found in stored data.</div>
              ) : (
                <div className="space-y-2">
                  {snoozeOptions.slice(0, 8).map((item) => (
                    <div key={item.id} className="p-3 rounded-lg border border-border bg-background/70">
                      <div className="text-sm font-medium text-foreground font-body">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-body">{item.subtitle}</div>
                      <div className="text-xs text-muted-foreground mt-1 font-body">{item.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.section>

        {/* Grid Modules */}
        <section className="grid grid-cols-12 gap-6 pb-12">

          {/* Life Map */}
          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="col-span-12 lg:col-span-7 bg-background rounded-xl border border-border p-4"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-lg mb-0 text-foreground">
                  Life Map
                </h3>
              </div>
              <span className="text-[0.7rem] text-muted-foreground uppercase tracking-widest font-body">TIMELINE VIEW</span>
            </div>

            <div className="flex flex-col gap-3">
              {timelineItems.length > 0 ? (
                timelineItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-[100px_1fr_90px] items-center text-[0.8125rem] pb-2 border-b border-border font-body">
                    <span className="text-muted-foreground">{formatOverviewDate(item.date)}</span>
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.priority === 'high' ? 'bg-accent shadow-[0_0_8px_rgba(239,68,68,0.4)]' : item.priority === 'medium' ? 'bg-[#F59E0B]' : 'bg-[#10B981]'}`} />
                      {item.label}
                    </span>
                    <span className="text-right text-muted-foreground">{item.source}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground font-body">
                  Timeline will appear here when your events and commitments are available.
                </div>
              )}

            </div>
          </motion.div>

          <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">

            {/* Financial Commitments */}
            <motion.div
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-background rounded-xl border border-border p-4 flex flex-col"
            >
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-semibold font-display text-foreground">Financial Load</span>
                <span className="text-sm font-semibold font-body text-foreground">₹{financialCommitmentTotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="mt-2 flex flex-col gap-2">
                {([
                  { key: 'high', label: 'High priority', amount: amountByPriority.high, color: 'bg-red-500/70' },
                  { key: 'medium', label: 'Medium priority', amount: amountByPriority.medium, color: 'bg-amber-500/70' },
                  { key: 'low', label: 'Low priority', amount: amountByPriority.low, color: 'bg-emerald-500/70' },
                ] as const).map((bar) => (
                  <div key={bar.key} className="space-y-1">
                    <div className="flex items-center justify-between text-[0.7rem] text-muted-foreground font-body">
                      <span>{bar.label}</span>
                      <span>₹{bar.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full ${bar.color}`} style={{ width: `${Math.max((bar.amount / maxPriorityAmount) * 100, bar.amount > 0 ? 8 : 0)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-[0.7rem] text-muted-foreground mt-2 font-body">
                {highPriorityCount} high-priority items • {financialItemCount} finance signals detected
              </div>
            </motion.div>

          </div>

        </section>
      </div>
    </main>
  );
}

function ContextPanel() {
  const { userProfile } = useAuth();
  const userName = userProfile?.full_name?.split(' ')[0] || 'User';
  const hasGeminiKey = Boolean(import.meta.env.VITE_GEMINI_API_KEY);

  const [messages, setMessages] = useState([
    { id: 1, text: `Hi ${userName}! I'm your Chief of Staff. How can I assist you today?`, sender: 'bot', timestamp: new Date() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const quickResponses = [
    "What's urgent today?",
    "Handle all bills",
    "Remind me later"
  ];

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: text,
      sender: 'user',
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsTyping(true);

    try {
      if (!hasGeminiKey) {
        throw new Error('Missing VITE_GEMINI_API_KEY in environment variables.');
      }

      const apiMessages: ChatMessage[] = [
        { role: 'system', content: `You are the Chief of Staff for Nexora. You help ${userName} manage their day, track commitments, and prioritize emails. Be concise, professional, and helpful.` },
        ...newMessages.map(m => ({
          role: (m.sender === 'bot' ? 'model' : 'user') as ChatMessage['role'],
          content: m.text
        }))
      ];
      
      const responseText = await generateChatResponse(apiMessages);
      
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: responseText,
        sender: 'bot',
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: "I'm having trouble connecting to my brain right now. Please check your API key.",
        sender: 'bot',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickResponse = (response) => {
    handleSendMessage(response);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  return (
    <aside className="w-[280px] flex-shrink-0 border-l border-border bg-background flex flex-col h-full p-6">
      <div className="text-[0.75rem] text-muted-foreground uppercase tracking-widest mb-5 font-body">
        Chief of Staff {hasGeminiKey ? '• LLM enabled' : '• LLM unavailable'}
      </div>

      <div className="flex flex-col h-full">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-3">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-[0.8125rem] p-3 rounded-[12px] leading-snug max-w-[85%] font-body ${message.sender === 'bot'
                ? 'bg-secondary text-foreground rounded-bl-[0] mr-auto'
                : 'bg-primary text-primary-foreground rounded-br-[0] ml-auto'
                }`}
            >
              {message.text}
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-secondary text-[0.8125rem] p-3 rounded-[12px] rounded-bl-[0] mr-auto max-w-[85%] text-foreground"
            >
              <div className="flex items-center gap-1">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Quick Responses */}
        <div className="flex flex-col gap-2 mb-4">
          {quickResponses.map((response, index) => (
            <button
              key={index}
              onClick={() => handleQuickResponse(response)}
              className="text-[0.75rem] px-3 py-2 border border-border rounded-lg cursor-pointer text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-left font-body"
            >
              {response}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="border-t border-border pt-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              className="flex-1 text-sm px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-accent/50 font-body placeholder:text-muted-foreground"
            />
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim()}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-foreground antialiased selection:bg-secondary selection:text-foreground font-body">
      <TopNav setActiveSection={setActiveSection} />
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
        <MainWorkspace activeSection={activeSection} />
        <ContextPanel />
      </div>
    </div>
  )
}
