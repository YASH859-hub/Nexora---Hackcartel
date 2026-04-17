import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Play, Heart, Globe, Users, Lock, Zap, Lightbulb } from 'lucide-react';

export default function About() {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-5 font-body">
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

      {/* Hero Section */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center w-full px-6 md:px-12 lg:px-20">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted-foreground font-body mb-6"
        >
          <Heart className="w-4 h-4" />
          Built to help you focus on what matters.
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center font-display text-5xl md:text-6xl lg:text-[5rem] leading-[0.95] tracking-tight text-foreground max-w-xl"
        >
          About <em className="font-display italic">Nexora</em>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 text-center text-base md:text-lg text-muted-foreground max-w-[650px] leading-relaxed font-body"
        >
          We build tools to reduce friction and keep your life running smoothly—so the little things don't become the biggest distractions.
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

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 w-full max-w-4xl"
        >
          <div className="rounded-2xl border border-border bg-background p-8 shadow-lg">
            <p className="text-base leading-8 text-muted-foreground font-body mb-6">
              Nexora was created for people who want to simplify the administrative load of modern life. We help you keep track of commitments, stay on top of recurring payments, and manage your schedule with intelligent, low-friction tools.
            </p>

            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <div>
                <h2 className="text-lg font-semibold font-display mb-3">Our mission</h2>
                <p className="text-sm leading-7 text-muted-foreground font-body">
                  To turn daily administration into a calm, organized experience that empowers better decisions.
                </p>
              </div>
              <div>
                <h2 className="text-lg font-semibold font-display mb-3">Our values</h2>
                <p className="text-sm leading-7 text-muted-foreground font-body">
                  Privacy-first design, practical automation, and clarity over complexity.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-3 text-sm text-foreground font-body">
              <Globe className="w-4 h-4" />
              Backed by clean systems and thoughtful workflows, not noise.
            </div>
          </div>

          {/* Additional Sections */}
          <div className="grid gap-6 md:grid-cols-3 mt-8">
            {[
              {
                icon: Lock,
                title: 'Privacy First',
                desc: 'Your data stays yours. We use end-to-end encryption and never sell your information.',
              },
              {
                icon: Users,
                title: 'Built for Teams',
                desc: 'Share insights with family or colleagues while maintaining individual privacy controls.',
              },
              {
                icon: Lightbulb,
                title: 'AI-Powered',
                desc: 'Intelligent automation learns your patterns to provide smarter recommendations.',
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  className="rounded-2xl border border-border bg-background p-6 shadow-lg"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold font-display mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-body">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
