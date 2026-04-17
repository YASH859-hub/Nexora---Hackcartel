import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Play, Briefcase, User, Users, TrendingUp, Clock, Zap } from 'lucide-react';

const useCases = [
  {
    title: 'Busy Professionals',
    description: 'Manage recurring bills, calendar deadlines, and personal budgets without distraction.',
    icon: User,
    benefits: ['Minutes per month saved', 'Never miss a payment', 'Real-time spending insights'],
  },
  {
    title: 'Freelancers & Creators',
    description: 'Keep subscriptions, invoicing reminders, and client commitments in one dashboard.',
    icon: Briefcase,
    benefits: ['Business expense tracking', 'Invoice reminders', 'Tax-ready reports'],
  },
  {
    title: 'Families & Teams',
    description: 'Coordinate shared expenses, payment dates, and household responsibilities together.',
    icon: Users,
    benefits: ['Shared budgets', 'Role-based access', 'Split payments'],
  },
];

export default function UseCases() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-5 font-body border-b border-border shrink-0">
        <Link to="/" className="text-xl font-semibold tracking-tight text-foreground">
          ✦ Nexora
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
          <Link to="/features" className="text-sm text-muted-foreground hover:text-foreground">Features</Link>
          <Link to="/how-it-works" className="text-sm text-muted-foreground hover:text-foreground">How It Works</Link>
          <Link to="/use-cases" className="text-sm text-muted-foreground hover:text-foreground">Use Cases</Link>
          <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
        </div>
        <button className="rounded-full px-5 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
          Book a demo
        </button>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-6 md:px-12 lg:px-20 py-12">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted-foreground font-body mb-6"
        >
          Built for every workflow
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center font-display text-5xl md:text-6xl lg:text-[5rem] leading-[0.95] tracking-tight text-foreground max-w-xl"
        >
          Use Cases for <em className="font-display italic">Everyone</em>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 text-center text-base md:text-lg text-muted-foreground max-w-[650px] leading-relaxed font-body"
        >
          Whether you need personal organization, freelance finance clarity, or shared planning with others, Nexora flexes to your workflow.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex items-center gap-3"
        >
          <button className="rounded-full px-6 py-3 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
            Book a demo
          </button>
          <button className="ghost h-11 w-11 rounded-full border border-border bg-background shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:bg-muted flex items-center justify-center">
            <Play className="h-4 w-4 fill-foreground" />
          </button>
        </motion.div>

        {/* Use Cases Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 w-full max-w-6xl"
        >
          <div className="grid gap-6 md:grid-cols-3">
            {useCases.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  className="rounded-2xl border border-border bg-background p-6 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent mb-4">
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-lg font-semibold font-display mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-body mb-4">{item.description}</p>

                  <div className="space-y-2">
                    {item.benefits.map((benefit) => (
                      <div key={benefit} className="flex items-center gap-2 text-sm text-foreground font-body">
                        <Zap className="w-4 h-4 text-accent" />
                        {benefit}
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Success Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 w-full max-w-4xl"
        >
          <h2 className="text-center text-2xl font-semibold font-display mb-8">Why users love Nexora</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                icon: TrendingUp,
                label: 'Average savings',
                value: '$2,400/year',
                desc: 'By identifying unused subscriptions',
              },
              {
                icon: Clock,
                label: 'Time saved monthly',
                value: '4-6 hours',
                desc: 'On financial admin tasks',
              },
            ].map((metric, idx) => {
              const MetricIcon = metric.icon;
              return (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.9 + idx * 0.1 }}
                  className="p-6 bg-muted/30 rounded-2xl border border-border"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <MetricIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-accent uppercase tracking-wider">{metric.label}</p>
                      <p className="text-2xl font-bold mt-1">{metric.value}</p>
                      <p className="text-sm text-muted-foreground mt-1">{metric.desc}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
        </div>
      </div>
    </div>
  );
}
