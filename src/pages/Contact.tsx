import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Play, Mail, MessageSquare, Phone } from 'lucide-react';

export default function Contact() {
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
          Get in touch
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center font-display text-5xl md:text-6xl lg:text-[5rem] leading-[0.95] tracking-tight text-foreground max-w-xl"
        >
          Contact <em className="font-display italic">Us</em>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 text-center text-base md:text-lg text-muted-foreground max-w-[650px] leading-relaxed font-body"
        >
          Have questions about Nexora? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
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

        {/* Contact Options */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 w-full max-w-4xl"
        >
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Mail,
                title: 'Email Us',
                desc: 'hello@nexora.com',
                action: 'Send email',
              },
              {
                icon: MessageSquare,
                title: 'Live Chat',
                desc: 'Available 9 AM - 6 PM EST',
                action: 'Start chat',
              },
              {
                icon: Phone,
                title: 'Call Us',
                desc: '+1 (555) 123-4567',
                action: 'Call now',
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  className="rounded-2xl border border-border bg-background p-6 shadow-lg text-center"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent mx-auto mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold font-display mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-body mb-4">{item.desc}</p>
                  <button className="text-sm font-medium text-accent hover:underline">{item.action}</button>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}