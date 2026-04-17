import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Play, CheckCircle2, Sparkles, TrendingUp, Calendar, Zap } from 'lucide-react';

export default function Features() {
  const features = [
    {
      title: 'Subscription Tracking',
      description: 'Auto-sync recurring payments and see your monthly commitment at a glance. Never miss a renewal.',
      icon: TrendingUp,
      benefits: ['Real-time sync', 'Auto-categorization', 'Spend insights'],
    },
    {
      title: 'Bill Reminders',
      description: 'Never miss due dates with calendar alerts and payment previews. Stay on top of deadlines.',
      icon: Calendar,
      benefits: ['Smart alerts', 'Calendar integration', 'Payment tracking'],
    },
    {
      title: 'Inbox Intelligence',
      description: 'Extract payments and subscriptions from email automatically using AI. Zero manual entry.',
      icon: Sparkles,
      benefits: ['AI extraction', 'Auto-parsing', 'Instant updates'],
    },
    {
      title: 'Daily Briefings',
      description: 'Get a morning summary of pending tasks, bills, and calendar events. Start informed.',
      icon: Zap,
      benefits: ['Daily digest', 'Personalized', 'Action items'],
    },
  ];

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
        <Link to="/Auth" className="rounded-full px-5 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
          Get Started
        </Link>
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
            Powerful automation tools
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center font-display text-5xl md:text-6xl lg:text-[5rem] leading-[0.95] tracking-tight text-foreground max-w-xl"
          >
            The Future of <em className="font-display italic">Smarter</em> Automation
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-center text-base md:text-lg text-muted-foreground max-w-[650px] leading-relaxed font-body"
          >
            Automate your busywork with intelligent agents that learn, adapt, and execute—so your team can focus on what matters most.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex items-center gap-3"
          >
            <Link to="/Auth" className="rounded-full px-6 py-3 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
              Get Started
            </Link>
            
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 w-full max-w-6xl"
          >
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                    className="rounded-2xl border border-border bg-background p-6 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold font-display mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground font-body mb-4">{feature.description}</p>
                    <div className="space-y-2">
                      {feature.benefits.map((benefit) => (
                        <div key={benefit} className="flex items-center gap-2 text-sm text-foreground font-body">
                          <CheckCircle2 className="w-4 h-4 text-accent" />
                          {benefit}
                        </div>
                      ))}
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
