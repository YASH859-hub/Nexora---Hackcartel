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
import { createAiRouter } from './routes/aiRoutes.js';
import { sendWhatsAppMessage } from './lib/whatsappDelivery.js';
import { brandWhatsAppBody } from './lib/whatsappBranding.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Single repo-root .env for frontend (Vite) + backend
dotenv.config({
  path: path.resolve(__dirname, '..', '..', '.env'),
  override: false,
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
app.use('/api/ai', createAiRouter());

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

app.post('/api/auth/login-notification', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, email, fullName } = req.body ?? {};

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber is required',
      });
    }

    const displayName = typeof fullName === 'string' && fullName.trim()
      ? fullName.trim()
      : typeof email === 'string' && email.trim()
        ? email.trim()
        : 'User';

    const result = await sendWhatsAppMessage(
      twilioClient,
      whatsappNumber,
      phoneNumber,
      `Welcome back, ${displayName}. You have successfully logged in to Nexora.`
    );

    if (!result.ok) {
      return res.status(502).json({
        success: false,
        error: result.error,
      });
    }

    return res.json({
      success: true,
      sid: result.sid,
    });
  } catch (error) {
    console.error('❌ Error sending login notification:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send login notification',
    });
  }
});

// Gmail Sync Endpoint - syncs encrypted emails with Supabase
app.post('/api/gmail/sync-user', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    // Note: Full Gmail sync would require:
    // 1. User's Gmail OAuth token (stored in Supabase)
    // 2. Gmail API client setup
    // 3. Incremental sync using history ID from user_sync_state
    // 4. Encryption on client-side (backend doesn't have keys)
    //
    // For now, this endpoint serves as:
    // - A placeholder for frontend to call
    // - A logging checkpoint for sync status
    // - Future expansion point for background sync jobs

    console.log(`📨 Gmail sync requested for user: ${userId}`);

    // In production, you would:
    // 1. Fetch user's Gmail OAuth token from Supabase
    // 2. Get last sync checkpoint from user_sync_state
    // 3. Fetch new emails from Gmail API
    // 4. Return email list (encrypted by client before storage)
    // 5. Update last_sync_at in user_sync_state

    return res.json({
      success: true,
      message: 'Gmail sync initiated',
      userId,
      itemsAdded: 0,
      itemsUpdated: 0,
      note: 'Full Gmail API integration coming soon. Client handles encryption.',
    });
  } catch (error) {
    console.error('❌ Error initiating Gmail sync:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
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
  console.log(`🤖 POST /api/ai/chat — Ollama chat (phi3)`);
  console.log(`🤖 POST /api/ai/intent — Ollama intent task`);
  console.log(`❤️  GET  /health`);
  console.log(`📨 POST /api/gmail/sync-user — sync encrypted inbox`);
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
