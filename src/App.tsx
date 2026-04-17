import { motion } from 'motion/react';
import { 
  Search, Bell, User, LayoutDashboard, CheckSquare, Calendar, 
  FileText, Zap, Mail, Settings, CheckCircle2, ChevronRight, 
  CreditCard, RefreshCw, Home, Clock, Send, Sparkles, ArrowRight,
  Command, AlertCircle
} from 'lucide-react';
import { cn } from './lib/utils';
import React from 'react';

function TopNav() {
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
        <button className="w-8 h-8 rounded-full bg-border overflow-hidden border border-border/50 hover:ring-2 hover:ring-border transition-all">
          <img src="https://picsum.photos/seed/yash/100/100" alt="Yash avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </button>
      </div>
    </header>
  );
}

function NavItem({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <button 
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

function Sidebar() {
  return (
    <aside className="w-[220px] flex-shrink-0 border-r border-border bg-card flex flex-col h-full py-6 px-3">
      <div className="flex-1 flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <div className="px-3 text-xs font-semibold text-muted-foreground/50 uppercase tracking-widest mb-2">Primary</div>
          <NavItem icon={LayoutDashboard} label="Overview" active />
          <NavItem icon={CheckSquare} label="Tasks" />
          <NavItem icon={CreditCard} label="Commitments" />
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

function MainWorkspace() {
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
  return (
    <aside className="w-[280px] flex-shrink-0 border-l border-border bg-card flex flex-col h-full bg-card p-6">
      <div className="text-[0.75rem] text-muted-foreground uppercase tracking-widest mb-5">
        Chief of Staff
      </div>
      
      <div className="flex flex-col gap-4">
         <div className="bg-muted text-[0.8125rem] p-3 rounded-[12px] rounded-bl-[0] leading-snug">
           Hi Yash, I've consolidated your day. Your AMEX bill is the highest priority before 5 PM.
         </div>
         <div className="bg-transparent border border-border text-[0.8125rem] p-3 rounded-[12px] rounded-bl-[0] leading-snug">
           Shall I prepare the rent transfer for Friday?
         </div>
         
         <div className="mt-5 flex flex-col gap-2">
           <div className="text-[0.75rem] px-3 py-2 border border-border rounded-lg cursor-pointer text-muted-foreground hover:bg-muted transition-colors">
             “What’s urgent today?”
           </div>
           <div className="text-[0.75rem] px-3 py-2 border border-border rounded-lg cursor-pointer text-muted-foreground hover:bg-muted transition-colors">
             “Handle all bills”
           </div>
           <div className="text-[0.75rem] px-3 py-2 border border-border rounded-lg cursor-pointer text-muted-foreground hover:bg-muted transition-colors">
             “Remind me later”
           </div>
         </div>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-foreground antialiased selection:bg-muted selection:text-foreground">
      <TopNav />
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar />
        <MainWorkspace />
        <ContextPanel />
      </div>
    </div>
  )
}
