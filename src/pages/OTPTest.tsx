import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useOTPVerification } from '../lib/useOTPVerification';
import { motion } from 'motion/react';
import { Sparkles, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function OTPTest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { generateAndSendOTP, verifyOTP, loading, error } = useOTPVerification();

  const [phoneNumber, setPhoneNumber] = useState('+918767604204');
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!user) {
      setMessage('Please sign in first');
      setMessageType('error');
      return;
    }

    const result = await generateAndSendOTP(user.id, phoneNumber);

    if (result.success) {
      setMessage(`✓ OTP sent to ${phoneNumber}. Check your WhatsApp!`);
      setMessageType('success');
      setStep('verify');
    } else {
      setMessage(`✗ Failed to send OTP: ${result.error}`);
      setMessageType('error');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!user) {
      setMessage('Please sign in first');
      setMessageType('error');
      return;
    }

    if (otp.length !== 6) {
      setMessage('Please enter a 6-digit code');
      setMessageType('error');
      return;
    }

    const result = await verifyOTP(user.id, otp);

    if (result.success) {
      setMessage('✓ OTP verified successfully!');
      setMessageType('success');
      setOtp('');
      setTimeout(() => navigate('/dashboard'), 2000);
    } else {
      setMessage(`✗ ${result.error}`);
      setMessageType('error');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-5 z-10">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-foreground text-background">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-foreground">✦ Nexora</span>
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to Dashboard
        </button>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              WhatsApp OTP Test
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {step === 'input'
                ? 'Send a test OTP to your WhatsApp'
                : 'Enter the 6-digit code you received'}
            </p>

            {step === 'input' ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    disabled={loading}
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 transition-all"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be joined to Twilio WhatsApp Sandbox
                  </p>
                </div>

                {(message || error) && (
                  <div
                    className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                      messageType === 'success' || !error
                        ? 'bg-green-500/10 text-green-700 border border-green-200'
                        : 'bg-destructive/10 text-red-700 border border-destructive/20'
                    }`}
                  >
                    {messageType === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    {message || error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  <Send className="w-4 h-4" />
                  {loading ? 'Sending...' : 'Send OTP to WhatsApp'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground text-center text-2xl tracking-widest placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 transition-all font-mono"
                  />
                </div>

                {(message || error) && (
                  <div
                    className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                      messageType === 'success' || !error
                        ? 'bg-green-500/10 text-green-700 border border-green-200'
                        : 'bg-destructive/10 text-red-700 border border-destructive/20'
                    }`}
                  >
                    {messageType === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    {message || error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-2 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('input');
                    setOtp('');
                    setMessage(null);
                  }}
                  className="w-full py-2 px-4 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-all"
                >
                  Send Another Code
                </button>
              </form>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>ℹ️ Test Instructions:</strong>
              </p>
              <ul className="text-xs text-blue-600 mt-2 space-y-1 list-disc list-inside">
                <li>Make sure you've joined the Twilio WhatsApp Sandbox</li>
                <li>OTP will arrive within 1-2 seconds</li>
                <li>Code expires after 10 minutes</li>
                <li>Max 3 verification attempts</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
