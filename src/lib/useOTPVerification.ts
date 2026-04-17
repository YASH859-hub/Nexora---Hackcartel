import { useState } from 'react';
import { supabase } from './supabase';

export interface OTPVerification {
  id: string;
  userId: string;
  phoneNumber: string;
  isVerified: boolean;
  createdAt: string;
  expiresAt: string;
}

export function useOTPVerification() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpData, setOtpData] = useState<OTPVerification | null>(null);

  const generateAndSendOTP = async (userId: string, phoneNumber: string) => {
    setLoading(true);
    setError(null);

    try {
      // Generate 6-digit OTP
      const otp = Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, '0');

      // Save OTP to database
      const { data, error: dbError } = await supabase
        .from('otp_verifications')
        .insert([
          {
            user_id: userId,
            phone_number: phoneNumber,
            otp_code: otp,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // Send OTP via WhatsApp (server-side)
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otp }),
      });

      if (!response.ok) {
        throw new Error('Failed to send OTP');
      }

      setOtpData(data);
      return { success: true, expiresAt: data.expires_at };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (userId: string, otpCode: string) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch the latest OTP for this user
      const { data, error: fetchError } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) throw new Error('OTP not found');

      // Check if OTP is expired
      const expiresAt = new Date(data.expires_at);
      if (new Date() > expiresAt) {
        throw new Error('OTP has expired');
      }

      // Check if OTP matches
      if (data.otp_code !== otpCode) {
        // Increment attempts
        const newAttempts = (data.attempts || 0) + 1;
        await supabase
          .from('otp_verifications')
          .update({ attempts: newAttempts })
          .eq('id', data.id);

        if (newAttempts >= 3) {
          throw new Error('Too many attempts. Request a new OTP.');
        }

        throw new Error('Incorrect OTP. Try again.');
      }

      // Mark OTP as verified
      const { error: updateError } = await supabase
        .from('otp_verifications')
        .update({ is_verified: true, verified_at: new Date().toISOString() })
        .eq('id', data.id);

      if (updateError) throw updateError;

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OTP verification failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async (userId: string, phoneNumber: string) => {
    // Mark old OTP as expired and send new one
    return generateAndSendOTP(userId, phoneNumber);
  };

  return {
    loading,
    error,
    otpData,
    generateAndSendOTP,
    verifyOTP,
    resendOTP,
  };
}
