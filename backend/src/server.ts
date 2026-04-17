import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Twilio from 'twilio';
import {
  broadcastBriefingsToAllSubscribers,
  startBriefingScheduler,
} from './jobs/briefingScheduler.js';
import {
  createBriefingRouter,
  createLegacyWhatsAppRouter,
} from './routes/briefingRoutes.js';
import { brandWhatsAppBody } from './lib/whatsappBranding.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Single repo-root .env for frontend (Vite) + backend
dotenv.config({
  path: path.resolve(__dirname, '..', '..', '.env'),
  override: true,
});

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

if (!accountSid || !authToken || !whatsappNumber) {
  console.error('❌ Missing Twilio environment variables!');
  console.error(
    'Please set in repo root .env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER'
  );
  process.exit(1);
}

const twilioClient = Twilio(accountSid, authToken);

app.use(
  '/api/briefing',
  createBriefingRouter(twilioClient, whatsappNumber)
);
app.use(
  '/api/whatsapp',
  createLegacyWhatsAppRouter(twilioClient, whatsappNumber)
);

const stopBriefingCron = startBriefingScheduler(twilioClient, whatsappNumber);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// Send OTP via WhatsApp
app.post('/api/send-otp', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        error: 'Missing required fields: phoneNumber, otp',
      });
    }

    // Validate phone number format
    if (!/^\+\d{1,15}$/.test(phoneNumber)) {
      return res.status(400).json({
        error: 'Invalid phone number format. Use E.164 format: +1234567890',
      });
    }

    const message = await twilioClient.messages.create({
      from: whatsappNumber,
      to: `whatsapp:${phoneNumber}`,
      body: brandWhatsAppBody(
        `Your verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share this code with anyone.`
      ),
    });

    console.log(`✓ OTP sent to ${phoneNumber}. Message SID: ${message.sid}`);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      sid: message.sid,
    });
  } catch (error) {
    console.error('❌ Error sending OTP:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to send OTP',
      details: errorMessage,
    });
  }
});

// Send WhatsApp notification
app.post('/api/send-notification', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message: messageBody } = req.body;

    if (!phoneNumber || !messageBody) {
      return res.status(400).json({
        error: 'Missing required fields: phoneNumber, message',
      });
    }

    const message = await twilioClient.messages.create({
      from: whatsappNumber,
      to: `whatsapp:${phoneNumber}`,
      body: brandWhatsAppBody(String(messageBody)),
    });

    console.log(
      `✓ Notification sent to ${phoneNumber}. Message SID: ${message.sid}`
    );

    res.json({
      success: true,
      message: 'Notification sent successfully',
      sid: message.sid,
    });
  } catch (error) {
    console.error('❌ Error sending notification:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to send notification',
      details: errorMessage,
    });
  }
});

// Test Twilio connection
app.get('/api/test-twilio', async (req: Request, res: Response) => {
  try {
    const account = await twilioClient.api.accounts.list({ limit: 1 });

    if (account.length > 0) {
      res.json({
        success: true,
        message: 'Twilio connection successful',
        account: account[0].friendlyName,
      });
    } else {
      res.status(500).json({
        error: 'Could not verify Twilio account',
      });
    }
  } catch (error) {
    console.error('❌ Twilio connection error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Twilio connection failed',
      details: errorMessage,
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Nexora Backend running on http://localhost:${PORT}`);
  console.log(`📨 POST /api/send-otp — OTP`);
  console.log(`📬 POST /api/send-notification — notification`);
  console.log(`📋 GET  /api/briefing/subscribers — list briefing users`);
  console.log(`📋 POST /api/briefing/subscribers — register user + tasks`);
  console.log(`📋 POST /api/briefing/send-now — send one briefing`);
  console.log(`📋 POST /api/whatsapp/send — legacy briefing body`);
  console.log(`❤️  GET  /health`);
  console.log(
    `📤 Briefings: daily 8:00 (${process.env.BRIEFING_TZ || 'server local'}) + on startup if BRIEFING_SEND_ON_STARTUP is not false\n`
  );

  const sendOnStartup = process.env.BRIEFING_SEND_ON_STARTUP !== 'false';
  if (sendOnStartup) {
    const delayMs = Math.max(
      0,
      Number.parseInt(process.env.BRIEFING_STARTUP_DELAY_MS || '2500', 10) || 2500
    );
    setTimeout(() => {
      void broadcastBriefingsToAllSubscribers(
        twilioClient,
        whatsappNumber,
        'startup'
      ).catch((e) => {
        console.log(
          JSON.stringify({
            level: 'error',
            event: 'briefing_startup_broadcast_unhandled',
            message: e instanceof Error ? e.message : String(e),
          })
        );
      });
    }, delayMs);
  }
});

function shutdown(signal: string) {
  console.log(`\nShutting down (${signal})...`);
  stopBriefingCron();
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
