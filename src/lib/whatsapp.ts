import fetch from 'node-fetch';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string;
}

let twilioConfig: TwilioConfig | null = null;

export function initializeTwilio(config: TwilioConfig) {
  twilioConfig = config;
}

export async function sendWhatsAppOTP(phoneNumber: string, otp: string): Promise<boolean> {
  if (!twilioConfig) {
    console.error('Twilio not initialized');
    return false;
  }

  try {
    const auth = Buffer.from(`${twilioConfig.accountSid}:${twilioConfig.authToken}`).toString('base64');
    
    const formData = new URLSearchParams({
      From: twilioConfig.whatsappNumber,
      To: `whatsapp:${phoneNumber}`,
      Body: `Your Nexora verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share this code with anyone.`
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioConfig.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      }
    );

    if (!response.ok) {
      throw new Error(`Twilio API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    console.log('WhatsApp OTP sent:', data.sid);
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
}

export async function sendWhatsAppLoginNotification(phoneNumber: string, userName: string): Promise<boolean> {
  if (!twilioConfig) {
    console.error('Twilio not initialized');
    return false;
  }

  try {
    const auth = Buffer.from(`${twilioConfig.accountSid}:${twilioConfig.authToken}`).toString('base64');
    
    const formData = new URLSearchParams({
      From: twilioConfig.whatsappNumber,
      To: `whatsapp:${phoneNumber}`,
      Body: `👋 Welcome to Nexora, ${userName}!\n\nYou have successfully logged in. Start managing your bills and subscriptions now! 💰`
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioConfig.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      }
    );

    if (!response.ok) {
      throw new Error(`Twilio API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    console.log('WhatsApp notification sent:', data.sid);
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);
    return false;
  }
}

export function generateOTP(length: number = 6): string {
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0');
}
