import { motion } from 'motion/react';
import { Play, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Hero() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden relative">
      {/* Hero Section with Video */}
      <div className="flex-1 relative overflow-hidden">
        {/* Background Video */}
        <video
          autoPlay
          muted
          loop
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_015952_e1deeb12-8fb7-4071-a42a-60779fc64ab6.mp4"
            type="video/mp4"
          />
        </video>

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/30 z-[1]" />

        {/* Navbar - Overlaid on Video */}
        <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 md:px-12 lg:px-20 py-5 font-body z-10">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white text-black">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-black">
              ✦ Nexora
            </span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#features" className="text-sm text-black/70 hover:text-black transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-black/70 hover:text-black transition-colors">
              How It Works
            </a>
            <a href="#use-cases" className="text-sm text-black/70 hover:text-black transition-colors">
              Use Cases
            </a>
            <a href="#about" className="text-sm text-black/70 hover:text-black transition-colors">
              About
            </a>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-1.5 rounded-full border border-black/20 bg-black/10 px-4 py-1.5 text-sm text-black/70 font-body backdrop-blur-sm">
              <span>✨</span>
              Your life shouldn't feel like admin work
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-[5rem] leading-[0.95] tracking-tight text-black max-w-2xl font-display"
          >
            Run Your Life Like a <span className="font-serif italic">System</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-base md:text-lg text-gray-500 max-w-[600px] leading-snug font-body font-semibold"
          >
            Subscriptions to track. Bills to pay. Deadlines to hit.
            <br />
            <br />
            Nexora monitors your email and calendar, manages what matters, and briefs you daily—so nothing slips.
          </motion.p>

          {/* CTA Container */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex items-center gap-4"
          >
            {/* Primary Button */}
            <button
              onClick={() => navigate('/dashboard')}
              className="group relative px-8 py-3 rounded-full bg-white text-black font-medium text-sm font-body transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/30 shadow-lg hover:shadow-xl"
            >
              Start
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
            </button>

            {/* Secondary Action - Play Button */}
            <button className="group h-11 w-11 rounded-full bg-black/10 shadow-lg border border-black/20 flex items-center justify-center hover:scale-110 transition-transform duration-300 focus:outline-none focus:ring-2 focus:ring-black/50">
              <Play className="w-5 h-5 text-black fill-black ml-0.5" />
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
