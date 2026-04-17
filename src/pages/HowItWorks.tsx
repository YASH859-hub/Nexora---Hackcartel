import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Play, Shield, Lightbulb, Zap } from 'lucide-react';
import { useState } from 'react';

const steps = [
  {
    title: 'Connect your accounts',
    description: 'Link your email, calendar, and payment sources to let Nexora discover subscriptions, bills, and events automatically. Your data stays encrypted and secure.',
    details: 'We support Gmail, Outlook, Apple Calendar, and major payment networks. Integration takes less than 2 minutes.',
    icon: Shield,
  },
  {
    title: 'Review insights',
    description: 'See everything organized into cards with due dates, monthly impact, and smart recommendations. Our AI analyzes patterns to help you save.',
    details: 'Get personalized insights on spending trends, recurring expenses, and optimization opportunities.',
    icon: Lightbulb,
  },
  {
    title: 'Take action faster',
    description: 'Pay, pause, renew, or cancel services from the dashboard with fewer clicks. One-click actions powered by enterprise APIs.',
    details: 'Manage everything from a single interface. No more bouncing between apps.',
    icon: Zap,
  },
];

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

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
          Simple 3-step process
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center font-display text-5xl md:text-6xl lg:text-[5rem] leading-[0.95] tracking-tight text-foreground max-w-xl"
        >
          How It <em className="font-display italic">Works</em>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 text-center text-base md:text-lg text-muted-foreground max-w-[650px] leading-relaxed font-body"
        >
          Get up and running in minutes with our streamlined setup process. No complex configurations, just intelligent automation.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex items-center gap-3"
        >
          <Link to='/Auth' className="rounded-full px-6 py-3 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
            Get Started
          </Link>
          
        </motion.div>

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 w-full max-w-4xl space-y-6"
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = activeStep === index;

            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                onClick={() => setActiveStep(index)}
                className={`rounded-2xl border transition-all duration-300 cursor-pointer p-6 ${
                  isActive ? 'border-accent bg-accent/5 shadow-lg' : 'border-border bg-background'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 flex-shrink-0 ${
                    isActive ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold uppercase tracking-[0.25em] text-accent">Step {index + 1}</span>
                    </div>
                    <h3 className="text-xl font-semibold font-display mb-2">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground font-body mb-4">{step.description}</p>

                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3 }}
                        className="p-4 bg-muted/50 rounded-xl border border-border"
                      >
                        <p className="text-sm text-foreground font-body">{step.details}</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
        </div>
      </div>
    </div>
  );
}
