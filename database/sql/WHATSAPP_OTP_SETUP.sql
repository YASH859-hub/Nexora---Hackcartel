-- Add phone number to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Create OTP verification table
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '10 minutes',
  verified_at TIMESTAMP,
  is_verified BOOLEAN DEFAULT FALSE
);

-- RLS for OTP table
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own OTP" ON public.otp_verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own OTP" ON public.otp_verifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_otp_user_id ON public.otp_verifications(user_id);
CREATE INDEX idx_otp_phone ON public.otp_verifications(phone_number);
