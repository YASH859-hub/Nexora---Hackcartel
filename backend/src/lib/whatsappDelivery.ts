import twilio from 'twilio';
import { brandWhatsAppBody } from './whatsappBranding.js';

type TwilioClient = ReturnType<typeof twilio>;

const E164_REGEX = /^\+[1-9]\d{1,14}$/;

export type DeliveryError = {
  code: string;
  message: string;
  details?: string;
};

export function normalizeWhatsAppTo(
  to: string
): { ok: true; to: string } | { ok: false; error: DeliveryError } {
  if (to == null || typeof to !== 'string') {
    return {
      ok: false,
      error: {
        code: 'INVALID_NUMBER',
        message: 'Recipient must be a non-empty string',
      },
    };
  }

  let raw = to.trim();
  if (!raw) {
    return {
      ok: false,
      error: { code: 'INVALID_NUMBER', message: 'Recipient is empty' },
    };
  }

  let e164: string;
  if (raw.toLowerCase().startsWith('whatsapp:')) {
    e164 = raw.slice('whatsapp:'.length).trim();
  } else {
    e164 = raw;
  }

  if (!E164_REGEX.test(e164)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_NUMBER',
        message: 'Phone must be E.164 (e.g. +918767604204)',
        details: raw,
      },
    };
  }

  return { ok: true, to: `whatsapp:${e164}` };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const o = err as { code?: string; status?: number; message?: string };
  if (typeof o.status === 'number' && o.status >= 500) return true;
  if (o.status === 429) return true;
  if (o.code === 'ECONNRESET' || o.code === 'ETIMEDOUT' || o.code === 'ENOTFOUND')
    return true;
  const msg = String(o.message || '').toLowerCase();
  if (msg.includes('timeout') || msg.includes('network')) return true;
  return false;
}

function logStructured(entry: Record<string, unknown>): void {
  console.log(JSON.stringify(entry));
}

export async function sendWhatsAppMessage(
  client: TwilioClient,
  from: string,
  to: string,
  message: string
): Promise<
  { ok: true; sid: string } | { ok: false; error: DeliveryError }
> {
  const normalized = normalizeWhatsAppTo(to);
  if (!normalized.ok) {
    logStructured({
      level: 'error',
      event: 'whatsapp_send_validation',
      attempt: 0,
      errorCode: normalized.error.code,
      message: normalized.error.message,
    });
    return { ok: false, error: normalized.error };
  }

  if (!from) {
    const err: DeliveryError = {
      code: 'CONFIG_ERROR',
      message: 'TWILIO_WHATSAPP_NUMBER is not set',
    };
    logStructured({
      level: 'error',
      event: 'whatsapp_send_config',
      attempt: 0,
      errorCode: err.code,
      message: err.message,
    });
    return { ok: false, error: err };
  }

  const body = brandWhatsAppBody(String(message ?? ''));
  const maxAttempts = 3;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const created = await client.messages.create({
        from,
        to: normalized.to,
        body,
      });
      logStructured({
        level: 'info',
        event: 'whatsapp_send_success',
        attempt,
        sid: created.sid,
      });
      return { ok: true, sid: created.sid };
    } catch (err) {
      lastErr = err;
      const twilioCode =
        err && typeof err === 'object' && 'code' in err
          ? (err as { code: unknown }).code
          : undefined;
      const twilioStatus =
        err && typeof err === 'object' && 'status' in err
          ? (err as { status: unknown }).status
          : undefined;
      logStructured({
        level: 'error',
        event: 'whatsapp_send_failed',
        attempt,
        errorCode: twilioCode ?? twilioStatus ?? 'UNKNOWN',
        message: err instanceof Error ? err.message : String(err),
      });

      if (attempt < maxAttempts && isRetryable(err)) {
        await sleep(400 * attempt);
        continue;
      }
      break;
    }
  }

  const e = lastErr;
  const details =
    e && typeof e === 'object' && 'moreInfo' in e
      ? String((e as { moreInfo: unknown }).moreInfo)
      : undefined;

  return {
    ok: false,
    error: {
      code: 'TWILIO_ERROR',
      message: e instanceof Error ? e.message : 'Twilio request failed',
      details,
    },
  };
}
