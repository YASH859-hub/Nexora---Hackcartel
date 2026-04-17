import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Bell, User, LayoutDashboard, CheckSquare, Calendar, 
  FileText, Zap, Mail, Settings, CheckCircle2, ChevronRight, 
  CreditCard, RefreshCw, Home, Clock, Send, Sparkles, ArrowRight,
  Command, AlertCircle, LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';
import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

function TopNav() {
  const navigate = useNavigate();
  const { user, userProfile, signOut } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = async () => {
    await signOut();
    setShowProfile(false);
    navigate('/');
  };

  return (
    <header className="h-[64px] min-h-[64px] flex items-center justify-between px-6 border-b border-border bg-card z-10 shrink-0">
      <div className="flex items-center gap-2 w-[220px]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="w-4 h-4" />
        </div>
        <span className="font-serif italic text-2xl tracking-tight leading-none pt-1">Nexora</span>
      </div>

      <div className="flex-1 max-w-md mx-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
          <input 
            type="text" 
            placeholder="Search anything (⌘K)" 
            className="w-full h-9 pl-10 pr-12 bg-muted rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring/50 transition-all placeholder:text-muted-foreground border border-transparent"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <Command className="w-3 h-3" /> K
            </kbd>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-5 w-[220px]">
        <div className="text-sm font-medium text-muted-foreground">Today</div>
        <button className="relative w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-destructive rounded-full border border-background"></span>
        </button>
        
        <div className="relative">
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="w-8 h-8 rounded-full bg-border overflow-hidden border border-border/50 hover:ring-2 hover:ring-border transition-all flex-shrink-0"
          >
            <img src="https://picsum.photos/seed/yash/100/100" alt="Profile avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </button>
          
          {showProfile && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full right-0 mt-2 bg-card rounded-lg border border-border shadow-lg p-4 w-64 z-50"
            >
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                <img src="https://picsum.photos/seed/yash/100/100" alt="Profile" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{userProfile?.full_name || 'User'}</div>
                  <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                </div>
              </div>

              <div className="space-y-2">
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <User className="w-4 h-4" />
                  Edit Profile
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors font-medium"
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
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active 
          ? "bg-secondary text-secondary-foreground font-medium" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5"
      )}
    >
      <Icon className={cn("w-4 h-4", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span>{label}</span>
    </button>
  );
}

function Sidebar({ activeSection, setActiveSection }: { activeSection: string, setActiveSection: (section: string) => void }) {
  return (
    <aside className="w-[220px] flex-shrink-0 border-r border-border bg-card flex flex-col h-full py-6 px-3">
      <div className="flex-1 flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <div className="px-3 text-xs font-semibold text-muted-foreground/50 uppercase tracking-widest mb-2">Primary</div>
          <NavItem icon={LayoutDashboard} label="Overview" active={activeSection === 'overview'} onClick={() => setActiveSection('overview')} />
          <NavItem icon={CreditCard} label="Commitments" active={activeSection === 'commitments'} onClick={() => setActiveSection('commitments')} />
          <NavItem icon={CheckSquare} label="Tasks" />
          <NavItem icon={Calendar} label="Calendar" />
          <NavItem icon={FileText} label="Documents" />
          <NavItem icon={Zap} label="Automations" />
        </div>

        <div className="flex flex-col gap-1">
          <div className="px-3 text-xs font-semibold text-muted-foreground/50 uppercase tracking-widest mb-2">Connected</div>
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all group">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4" />
              <span>Gmail</span>
            </div>
            <span className="text-xs text-[#10B981]">✓</span>
          </button>
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all group">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4" />
              <span>Calendar</span>
            </div>
            <span className="text-xs text-[#10B981]">✓</span>
          </button>
        </div>
      </div>

      <div className="mt-auto">
        <NavItem icon={Settings} label="Settings" />
      </div>
    </aside>
  );
}

function ActionPill({ label }: { label: string }) {
  return (
    <motion.button 
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      className="px-[14px] py-[6px] rounded-full bg-card border border-border text-[0.75rem] font-medium text-primary hover:shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-ring"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
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
          <h2 className="text-2xl font-serif italic mb-8">Financial Commitments</h2>
        </motion.div>

        <div className="grid gap-8">
          {/* Bills Section */}
          <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 className="text-lg font-semibold mb-4">Bills Due</h3>
            <div className="space-y-3">
              {bills.map(bill => (
                <div key={bill.id} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bill.color }} />
                    <div>
                      <div className="font-medium">{bill.name}</div>
                      <div className="text-sm text-muted-foreground">{bill.dueDate}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="font-semibold text-right">{bill.amount}</div>
                    <button className="px-3 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 text-sm transition-colors">Pay</button>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Subscriptions Section */}
          <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h3 className="text-lg font-semibold mb-4">Active Subscriptions</h3>
            <div className="space-y-3">
              {subscriptions.map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: sub.color }} />
                    <div>
                      <div className="font-medium">{sub.name}</div>
                      <div className="text-sm text-muted-foreground">{sub.date} • {sub.source}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">{sub.amount}</div>
                      <div className="text-xs text-muted-foreground capitalize">{sub.status}</div>
                    </div>
                    <button className="px-3 py-1 rounded bg-secondary text-secondary-foreground text-sm hover:opacity-80 transition-opacity">Manage</button>
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

function MainWorkspace({ activeSection }: { activeSection: string }) {
  if (activeSection === 'commitments') {
    return <CommitmentsDashboard />;
  }
  return (
    <main className="flex-1 overflow-y-auto px-8 py-8 relative scrollbar-hide">
      <div className="max-w-4xl mx-auto flex flex-col gap-12">
        
        {/* Header / Brief */}
        <section className="flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              Good morning, <span className="font-serif italic text-lg ml-0.5 font-normal">Yash</span>
            </h2>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="p-6 rounded-xl bg-card border border-border shadow-[0_1px_3px_rgb(0,0,0,0.05)] relative flex items-center justify-between"
          >
            <div>
              <h1 className="text-2xl font-serif italic text-primary mb-3">
                You have <span className="text-accent pr-1">5 things</span> that need attention today.
              </h1>
              
              <ul className="text-sm text-muted-foreground w-max grid grid-cols-2 gap-x-6 gap-y-2">
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

            <button className="h-10 px-5 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all outline-none">
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
            className="col-span-12 lg:col-span-7 bg-card rounded-xl border border-border p-4"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-serif italic text-lg font-normal mb-0">
                  Life Map
                </h3>
              </div>
              <span className="text-[0.7rem] text-muted-foreground uppercase tracking-widest">TIMELINE VIEW</span>
            </div>
            
            <div className="flex flex-col gap-3">
              
              <div className="grid grid-cols-[100px_1fr_80px] items-center text-[0.8125rem] pb-2 border-b border-muted">
                <span className="text-muted-foreground">June 14</span>
                <span className="flex items-center gap-2 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.4)]" /> AMEX Gold Bill</span>
                <span className="text-right text-muted-foreground">Gmail</span>
              </div>
              
              <div className="grid grid-cols-[100px_1fr_80px] items-center text-[0.8125rem] pb-2 border-b border-muted">
                <span className="text-muted-foreground">June 16</span>
                <span className="flex items-center gap-2 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" /> Netflix Renewal</span>
                <span className="text-right text-muted-foreground">Auto</span>
              </div>
              
              <div className="grid grid-cols-[100px_1fr_80px] items-center text-[0.8125rem] pb-2 border-b border-muted">
                <span className="text-muted-foreground">June 18</span>
                <span className="flex items-center gap-2 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" /> Rent Payment</span>
                <span className="text-right text-muted-foreground">Bank</span>
              </div>

              <div className="grid grid-cols-[100px_1fr_80px] items-center text-[0.8125rem] pb-2 border-b border-muted">
                <span className="text-muted-foreground">June 12</span>
                <span className="flex items-center gap-2 font-medium opacity-50"><div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Gym Session</span>
                <span className="text-right text-muted-foreground opacity-50">Cal</span>
              </div>

            </div>
          </motion.div>

          <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
            
            {/* Financial Commitments */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-card rounded-xl border border-border p-4 flex flex-col"
            >
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-semibold">Financial Load</span>
                <span className="text-sm font-semibold">₹24,500</span>
              </div>
              
              <div className="h-20 w-full mt-2 relative">
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                  <path d="M0,35 Q25,30 50,20 T100,5" fill="none" className="stroke-accent stroke-2" />
                </svg>
              </div>
              <div className="text-[0.7rem] text-muted-foreground mt-2">
                Projected total for this week
              </div>
            </motion.div>

            {/* Documents & Brief preview */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-card rounded-xl border border-border p-3"
              >
                <div className="text-sm font-semibold mb-3">Things you'll need soon</div>
                <div className="flex gap-2">
                  <div className="px-3 py-1.5 rounded-full bg-muted text-xs font-medium border border-transparent">📄 Passport</div>
                  <div className="px-3 py-1.5 rounded-full bg-muted text-xs font-medium border border-transparent">📄 Insurance</div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}
                className="rounded-xl p-3 bg-[#F0F9FF] border border-[#BAE6FD]"
              >
                <div className="text-[0.75rem] text-[#0369A1] font-semibold mb-1">📬 WhatsApp Brief sent</div>
                <div className="text-[0.7rem] text-[#0C4A6E] leading-snug">
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
  const [messages, setMessages] = useState([
    { id: 1, text: "Hi Yash, I've consolidated your day. Your AMEX bill is the highest priority before 5 PM.", sender: 'bot', timestamp: new Date() },
    { id: 2, text: "Shall I prepare the rent transfer for Friday?", sender: 'bot', timestamp: new Date() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const quickResponses = [
    "What's urgent today?",
    "Handle all bills",
    "Remind me later"
  ];

  const botResponses = {
    "what's urgent today?": "Your AMEX bill is due today, and you have 2 subscription renewals this week. The rent payment is scheduled for Friday.",
    "handle all bills": "I'll prepare the AMEX payment and schedule the rent transfer. Would you like me to proceed with the payments?",
    "remind me later": "I'll remind you about your financial commitments in 2 hours. Is there anything specific you'd like me to handle in the meantime?",
    "pay bills": "I'll initiate the payment process for your AMEX bill. The amount is ₹12,500. Should I proceed?",
    "schedule payment": "I can schedule the rent payment for Friday. The amount is ₹8,000. Would you like me to set this up?",
    "financial summary": "Here's your financial overview: Bills due this month: ₹23,300, Subscriptions: ₹4,267, Total: ₹27,567.",
    "help": "I can help you with: paying bills, managing subscriptions, scheduling payments, financial summaries, or answering questions about your commitments."
  };

  const getBotResponse = (userMessage) => {
    const message = userMessage.toLowerCase();
    for (const [key, response] of Object.entries(botResponses)) {
      if (message.includes(key)) {
        return response;
      }
    }
    return "I'm here to help with your financial commitments. You can ask me about bills, payments, subscriptions, or say 'help' for more options.";
  };

  const handleSendMessage = (text) => {
    if (!text.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        text: getBotResponse(text),
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
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
    <aside className="w-[280px] flex-shrink-0 border-l border-border bg-card flex flex-col h-full p-6">
      <div className="text-[0.75rem] text-muted-foreground uppercase tracking-widest mb-5">
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
              className={`text-[0.8125rem] p-3 rounded-[12px] leading-snug max-w-[85%] ${
                message.sender === 'bot'
                  ? 'bg-muted rounded-bl-[0] mr-auto'
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
              className="bg-muted text-[0.8125rem] p-3 rounded-[12px] rounded-bl-[0] mr-auto max-w-[85%]"
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
              className="text-[0.75rem] px-3 py-2 border border-border rounded-lg cursor-pointer text-muted-foreground hover:bg-muted transition-colors text-left"
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
              className="flex-1 text-sm px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring/50"
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
    <div className="h-screen flex flex-col bg-background overflow-hidden text-foreground antialiased selection:bg-muted selection:text-foreground">
      <TopNav />
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
        <MainWorkspace activeSection={activeSection} />
        <ContextPanel />
      </div>
    </div>
  )
}
