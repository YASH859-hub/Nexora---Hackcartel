import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bell, User, LayoutDashboard, CheckSquare, Calendar,
  FileText, Zap, Mail, Settings, CheckCircle2, ChevronRight,
  CreditCard, RefreshCw, Home, Clock, Send, Sparkles, ArrowRight,
  Command, AlertCircle, LogOut, TrendingUp, AlertTriangle, Activity
} from 'lucide-react';
import { cn } from '../lib/utils';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  extractActionItems,
  extractCalendarActionItems,
  createCalendarActionItem,
  fetchRecentEmails,
  fetchUpcomingCalendarEvents,
  requestGmailAccessToken,
  type EmailActionItem,
  type ExtractionResult,
  type CalendarEventSummary,
  type GmailMessageSummary,
} from '../lib/gmail';
import { generateChatResponse, type ChatMessage } from '../lib/chat';
import { useTheme } from '../lib/ThemeContext';

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
          <NavItem icon={CheckSquare} label="Tasks" />
          <NavItem icon={FileText} label="Documents" />
          <NavItem icon={Zap} label="Automations" />
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
        </div>
      </div>

      <div className="mt-auto">
        <NavItem icon={Settings} label="Settings" active={activeSection === 'settings'} onClick={() => setActiveSection('settings')} />
      </div>
    </aside>
  );
}

function EventPriorityDashboard() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [emails, setEmails] = useState<GmailMessageSummary[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventSummary[]>([]);
  const [actionItems, setActionItems] = useState<EmailActionItem[]>([]);
  const [extractionMode, setExtractionMode] = useState<ExtractionResult['mode'] | 'mixed' | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'work' | 'spenditure' | 'other'>('all');
  const [manualEventTitle, setManualEventTitle] = useState('');
  const [manualEventDate, setManualEventDate] = useState('');
  const [manualEventTime, setManualEventTime] = useState('');
  const [manualEventLocation, setManualEventLocation] = useState('');
  const [manualEventDescription, setManualEventDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const priorityClassMap: Record<EmailActionItem['priority'], string> = {
    high: 'bg-red-50 text-red-700 border-red-100',
    medium: 'bg-amber-50 text-amber-700 border-amber-100',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };

  const categoryClassMap: Record<EmailActionItem['category'], string> = {
    work: 'bg-sky-50 text-sky-700 border-sky-100',
    spenditure: 'bg-violet-50 text-violet-700 border-violet-100',
    other: 'bg-zinc-50 text-zinc-700 border-zinc-200',
  };

  const filteredActionItems =
    activeCategory === 'all'
      ? actionItems
      : actionItems.filter((item) => item.category === activeCategory);

  const totalSpendValue = actionItems
    .filter((item) => item.category === 'spenditure')
    .reduce((total, item) => {
      const amountMatch = item.summary.match(/(?:₹|INR\s?)(\d[\d,]*(?:\.\d+)?)/i) || item.title.match(/(?:₹|INR\s?)(\d[\d,]*(?:\.\d+)?)/i);
      const parsedAmount = amountMatch?.[1] ? Number(amountMatch[1].replace(/,/g, '')) : 0;
      return total + (Number.isFinite(parsedAmount) ? parsedAmount : 0);
    }, 0);

  const connectAndAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = accessToken || (await requestGmailAccessToken());
      setAccessToken(token);

      const fetchedEmails = await fetchRecentEmails(token, 12);
      setEmails(fetchedEmails);

      const fetchedCalendarEvents = await fetchUpcomingCalendarEvents(token, 12);
      setCalendarEvents(fetchedCalendarEvents);

      const emailExtraction = await extractActionItems(fetchedEmails);
      const calendarExtraction = await extractCalendarActionItems(fetchedCalendarEvents);

      setActionItems([...emailExtraction.items, ...calendarExtraction.items]);
      setExtractionMode(
        emailExtraction.mode === 'deepseek' && calendarExtraction.mode === 'deepseek'
          ? 'deepseek'
          : 'mixed',
      );
      setLastSyncedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync Gmail data.');
    } finally {
      setLoading(false);
    }
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
    setActionItems((prev) => [createCalendarActionItem(manualEvent), ...prev]);
    setExtractionMode('mixed');
    setManualEventTitle('');
    setManualEventDate('');
    setManualEventTime('');
    setManualEventLocation('');
    setManualEventDescription('');
    setError(null);
    setLastSyncedAt(new Date());
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
                Event Priority merges Gmail and Calendar into one clean view for work, spenditure, and other priority items.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={connectAndAnalyze}
                disabled={loading}
                className="h-10 px-5 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all disabled:opacity-60"
              >
                {loading ? 'Analyzing...' : accessToken ? 'Refresh Priority List' : 'Connect Gmail'}
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
            {extractionMode && (
              <span className="px-2.5 py-1 rounded-full bg-muted border border-border">
                Mode: {extractionMode === 'deepseek' ? 'DeepSeek' : extractionMode === 'mixed' ? 'Mixed' : 'Rule-based'}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-muted border border-border">
              {calendarEvents.length} Calendar Events
            </span>
            {lastSyncedAt && (
              <span className="px-2.5 py-1 rounded-full bg-muted border border-border">
                Last sync {lastSyncedAt.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-serif italic text-lg">Add Manual Calendar Event</h3>
                <p className="text-xs text-muted-foreground mt-1">Create an event locally and include it in the Event Priority list.</p>
              </div>
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <input
                value={manualEventTitle}
                onChange={(e) => setManualEventTitle(e.target.value)}
                placeholder="Event title"
                className="px-3 py-2 rounded-lg border border-border bg-muted text-sm"
              />
              <input
                type="date"
                value={manualEventDate}
                onChange={(e) => setManualEventDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-muted text-sm"
              />
              <input
                type="time"
                value={manualEventTime}
                onChange={(e) => setManualEventTime(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-muted text-sm"
              />
              <input
                value={manualEventLocation}
                onChange={(e) => setManualEventLocation(e.target.value)}
                placeholder="Location"
                className="px-3 py-2 rounded-lg border border-border bg-muted text-sm"
              />
              <button
                onClick={addManualCalendarEvent}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                Add Event
              </button>
            </div>

            <textarea
              value={manualEventDescription}
              onChange={(e) => setManualEventDescription(e.target.value)}
              placeholder="Optional notes or agenda"
              rows={3}
              className="mt-3 w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm resize-none"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {([
              { key: 'all', label: 'All' },
              { key: 'work', label: 'Work' },
              { key: 'spenditure', label: 'Spenditure' },
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
            className="col-span-12 lg:col-span-8 bg-card rounded-xl border border-border p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif italic text-lg">Priority Actions</h3>
              <span className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">
                {extractionMode === 'rules' ? 'Rule ranked' : 'DeepSeek ranked'}
              </span>
            </div>

            {!loading && filteredActionItems.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                No extracted action items yet. Connect Gmail to build your priority queue.
              </div>
            )}

            <div className="space-y-3">
              {filteredActionItems.map((item, index) => (
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-12 lg:col-span-4 bg-card rounded-xl border border-border p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif italic text-lg">Recent Emails</h3>
              <Mail className="w-4 h-4 text-muted-foreground" />
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {emails.length === 0 && (
                <div className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-4">
                  No email metadata loaded.
                </div>
              )}

              {emails.map((email) => (
                <div key={email.id} className="p-3 rounded-lg border border-border bg-background/60">
                  <div className="text-xs font-semibold truncate">{email.subject}</div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">{email.from}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{email.snippet}</div>
                </div>
              ))}
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
                Detected from spenditure-classified emails and calendar reminders.
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
                'work',
                'spenditure',
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
      </div>
    </main>
  );
}

function ActionPill({ label }: { label: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      className="px-[14px] py-[6px] rounded-full bg-background border border-border text-[0.75rem] font-medium text-foreground hover:bg-secondary hover:shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-accent/50 font-body"
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

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-display font-semibold mb-8 text-foreground">Financial Commitments</h2>
        </motion.div>

        <div className="grid gap-8">
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
                You have <span className="text-accent pr-1">5 things</span> that need attention today.
              </h1>

              <ul className="text-sm text-muted-foreground w-max grid grid-cols-2 gap-x-6 gap-y-2 font-body">
                <li className="flex items-center gap-2">
                  <span className="text-accent font-bold leading-none">•</span>
                  <span>Credit card bill due tomorrow</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent font-bold leading-none">•</span>
                  <span>2 subscriptions renewing this week</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent font-bold leading-none">•</span>
                  <span>Rent scheduled for Friday</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent font-bold leading-none">•</span>
                  <span>Form submission pending</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent font-bold leading-none">•</span>
                  <span>Passport expires in 30 days</span>
                </li>
              </ul>
            </div>

            <button className="h-10 px-5 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all outline-none font-body">
              Handle Everything
            </button>
          </motion.div>
        </section>

        {/* Action Strip */}
        <motion.section
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap items-center gap-3"
        >
          <ActionPill label="Pay" />
          <ActionPill label="Schedule" />
          <ActionPill label="Snooze" />
          <ActionPill label="Autofill Form" />
          <ActionPill label="View Source" />
          <ActionPill label="Customize" />
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

              <div className="grid grid-cols-[100px_1fr_80px] items-center text-[0.8125rem] pb-2 border-b border-border font-body">
                <span className="text-muted-foreground">June 14</span>
                <span className="flex items-center gap-2 font-medium text-foreground"><div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(239,68,68,0.4)]" /> AMEX Gold Bill</span>
                <span className="text-right text-muted-foreground">Gmail</span>
              </div>

              <div className="grid grid-cols-[100px_1fr_80px] items-center text-[0.8125rem] pb-2 border-b border-border font-body">
                <span className="text-muted-foreground">June 16</span>
                <span className="flex items-center gap-2 font-medium text-foreground"><div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" /> Netflix Renewal</span>
                <span className="text-right text-muted-foreground">Auto</span>
              </div>

              <div className="grid grid-cols-[100px_1fr_80px] items-center text-[0.8125rem] pb-2 border-b border-border font-body">
                <span className="text-muted-foreground">June 18</span>
                <span className="flex items-center gap-2 font-medium text-foreground"><div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" /> Rent Payment</span>
                <span className="text-right text-muted-foreground">Bank</span>
              </div>

              <div className="grid grid-cols-[100px_1fr_80px] items-center text-[0.8125rem] pb-2 border-b border-border font-body">
                <span className="text-muted-foreground">June 12</span>
                <span className="flex items-center gap-2 font-medium text-foreground opacity-50"><div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Gym Session</span>
                <span className="text-right text-muted-foreground opacity-50">Cal</span>
              </div>

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
                <span className="text-sm font-semibold font-body text-foreground">₹24,500</span>
              </div>

              <div className="h-20 w-full mt-2 relative">
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                  <path d="M0,35 Q25,30 50,20 T100,5" fill="none" className="stroke-accent stroke-2" />
                </svg>
              </div>
              <div className="text-[0.7rem] text-muted-foreground mt-2 font-body">
                Projected total for this week
              </div>
            </motion.div>

            {/* Documents & Brief preview */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-background rounded-xl border border-border p-3"
              >
                <div className="text-sm font-semibold mb-3 font-display text-foreground">Things you'll need soon</div>
                <div className="flex gap-2">
                  <div className="px-3 py-1.5 rounded-full bg-secondary text-xs font-medium border border-border font-body">📄 Passport</div>
                  <div className="px-3 py-1.5 rounded-full bg-secondary text-xs font-medium border border-border font-body">📄 Insurance</div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}
                className="rounded-xl p-3 bg-accent/5 border border-accent/20"
              >
                <div className="text-[0.75rem] text-accent font-semibold mb-1 font-body">📬 WhatsApp Brief sent</div>
                <div className="text-[0.7rem] text-accent/80 leading-snug font-body">
                  Good morning ☀️ • 1 bill due tomorrow • 2 renewals this week.
                </div>
              </motion.div>
            </div>

          </div>

        </section>
      </div>
    </main>
  );
}

function ContextPanel() {
  const { userProfile } = useAuth();
  const userName = userProfile?.full_name?.split(' ')[0] || 'User';

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
        Chief of Staff
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
