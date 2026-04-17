import { Router } from 'express';
import twilio from 'twilio';
import { formatBriefing } from '../lib/formatBriefing.js';
import { sendWhatsAppMessage } from '../lib/whatsappDelivery.js';
import {
  listSubscribers,
  addSubscriber,
  getSubscriber,
  updateSubscriber,
  removeSubscriber,
} from '../lib/briefingStore.js';

type TwilioClient = ReturnType<typeof twilio>;

export function createBriefingRouter(
  twilioClient: TwilioClient,
  whatsappFrom: string
): Router {
  const router = Router();

  router.get('/subscribers', async (_req, res) => {
    try {
      const subscribers = await listSubscribers();
      res.json({ ok: true, subscribers });
    } catch (e) {
      res.status(500).json({
        ok: false,
        error: { message: e instanceof Error ? e.message : 'Failed to list' },
      });
    }
  });

  router.post('/subscribers', async (req, res) => {
    const { displayName, phoneNumber, tasks } = req.body ?? {};
    if (!displayName || typeof displayName !== 'string' || !displayName.trim()) {
      return res
        .status(400)
        .json({ ok: false, error: { message: 'displayName required' } });
    }
    if (!phoneNumber || !/^\+\d{1,15}$/.test(phoneNumber)) {
      return res.status(400).json({
        ok: false,
        error: { message: 'phoneNumber must be E.164 (+...)' },
      });
    }
    if (!Array.isArray(tasks) || !tasks.every((t: unknown) => typeof t === 'string')) {
      return res.status(400).json({
        ok: false,
        error: { message: 'tasks must be an array of strings' },
      });
    }
    try {
      const subscriber = await addSubscriber({
        displayName,
        phoneE164: phoneNumber,
        tasks: tasks as string[],
      });
      res.status(201).json({ ok: true, subscriber });
    } catch (e) {
      res.status(500).json({
        ok: false,
        error: { message: e instanceof Error ? e.message : 'Failed to add' },
      });
    }
  });

  router.put('/subscribers/:id', async (req, res) => {
    const { id } = req.params;
    const { displayName, phoneNumber, tasks } = req.body ?? {};
    const patch: {
      displayName?: string;
      phoneE164?: string;
      tasks?: string[];
    } = {};
    if (displayName !== undefined) patch.displayName = String(displayName);
    if (phoneNumber !== undefined) {
      if (!/^\+\d{1,15}$/.test(phoneNumber)) {
        return res.status(400).json({
          ok: false,
          error: { message: 'phoneNumber must be E.164' },
        });
      }
      patch.phoneE164 = phoneNumber;
    }
    if (tasks !== undefined) {
      if (!Array.isArray(tasks) || !tasks.every((t: unknown) => typeof t === 'string')) {
        return res.status(400).json({
          ok: false,
          error: { message: 'tasks must be string array' },
        });
      }
      patch.tasks = tasks as string[];
    }
    if (Object.keys(patch).length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: { message: 'No fields to update' } });
    }
    try {
      const updated = await updateSubscriber(id, patch);
      if (!updated) {
        return res
          .status(404)
          .json({ ok: false, error: { message: 'Not found' } });
      }
      res.json({ ok: true, subscriber: updated });
    } catch (e) {
      res.status(500).json({
        ok: false,
        error: { message: e instanceof Error ? e.message : 'Failed to update' },
      });
    }
  });

  router.delete('/subscribers/:id', async (req, res) => {
    try {
      const ok = await removeSubscriber(req.params.id);
      if (!ok) {
        return res
          .status(404)
          .json({ ok: false, error: { message: 'Not found' } });
      }
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({
        ok: false,
        error: { message: e instanceof Error ? e.message : 'Failed to delete' },
      });
    }
  });

  router.post('/send-now', async (req, res) => {
    try {
      const { subscriberId, userName, tasks, phoneNumber, to } = req.body ?? {};

      if (subscriberId && typeof subscriberId === 'string') {
        const sub = await getSubscriber(subscriberId);
        if (!sub) {
          return res
            .status(404)
            .json({ ok: false, error: { message: 'Subscriber not found' } });
        }
        const text = formatBriefing(sub.displayName, sub.tasks);
        const r = await sendWhatsAppMessage(
          twilioClient,
          whatsappFrom,
          sub.phoneE164,
          text
        );
        if (!r.ok) {
          const status =
            r.error.code === 'INVALID_NUMBER'
              ? 400
              : r.error.code === 'CONFIG_ERROR'
                ? 500
                : 502;
          return res.status(status).json({ ok: false, error: r.error });
        }
        return res.json({ ok: true, sid: r.sid });
      }

      if (userName && typeof userName === 'string' && Array.isArray(tasks)) {
        const recipient =
          typeof to === 'string' && to.trim()
            ? to.trim()
            : typeof phoneNumber === 'string'
              ? phoneNumber.trim()
              : null;
        if (!recipient) {
          return res.status(400).json({
            ok: false,
            error: { message: 'Provide phoneNumber or to' },
          });
        }
        if (!tasks.every((t: unknown) => typeof t === 'string')) {
          return res.status(400).json({
            ok: false,
            error: { message: 'tasks must be strings' },
          });
        }
        const text = formatBriefing(userName, tasks as string[]);
        const r = await sendWhatsAppMessage(
          twilioClient,
          whatsappFrom,
          recipient,
          text
        );
        if (!r.ok) {
          const status =
            r.error.code === 'INVALID_NUMBER'
              ? 400
              : r.error.code === 'CONFIG_ERROR'
                ? 500
                : 502;
          return res.status(status).json({ ok: false, error: r.error });
        }
        return res.json({ ok: true, sid: r.sid });
      }

      return res.status(400).json({
        ok: false,
        error: {
          message:
            'Provide subscriberId OR (userName, tasks, and phoneNumber or to)',
        },
      });
    } catch (e) {
      res.status(500).json({
        ok: false,
        error: { message: e instanceof Error ? e.message : 'Send failed' },
      });
    }
  });

  return router;
}

/** Legacy path: POST /api/whatsapp/send */
export function createLegacyWhatsAppRouter(
  twilioClient: TwilioClient,
  whatsappFrom: string
): Router {
  const router = Router();

  router.post('/send', async (req, res) => {
    try {
      const { userName, tasks, to, phoneNumber } = req.body ?? {};

      if (!userName || typeof userName !== 'string' || !userName.trim()) {
        return res.status(400).json({
          ok: false,
          error: { code: 'VALIDATION_ERROR', message: 'userName required' },
        });
      }
      if (!Array.isArray(tasks) || !tasks.every((t: unknown) => typeof t === 'string')) {
        return res.status(400).json({
          ok: false,
          error: { code: 'VALIDATION_ERROR', message: 'tasks must be string[]' },
        });
      }

      const recipient =
        typeof to === 'string' && to.trim()
          ? to.trim()
          : typeof phoneNumber === 'string' && phoneNumber.trim()
            ? phoneNumber.trim()
            : process.env.DEFAULT_USER_PHONE;

      if (!recipient) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'Provide to, phoneNumber, or set DEFAULT_USER_PHONE in .env',
          },
        });
      }

      const text = formatBriefing(userName, tasks as string[]);
      const r = await sendWhatsAppMessage(
        twilioClient,
        whatsappFrom,
        recipient,
        text
      );

      if (!r.ok) {
        const status =
          r.error.code === 'INVALID_NUMBER'
            ? 400
            : r.error.code === 'CONFIG_ERROR'
              ? 500
              : 502;
        return res.status(status).json({ ok: false, error: r.error });
      }

      return res.json({ ok: true, sid: r.sid });
    } catch (e) {
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: e instanceof Error ? e.message : 'Unexpected error',
        },
      });
    }
  });

  return router;
}
