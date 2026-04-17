import cron from 'node-cron';
import twilio from 'twilio';
import { formatBriefing } from '../lib/formatBriefing.js';
import { listSubscribers } from '../lib/briefingStore.js';
import { sendWhatsAppMessage } from '../lib/whatsappDelivery.js';

type TwilioClient = ReturnType<typeof twilio>;

export type BriefingBroadcastTrigger = 'cron' | 'startup';

/** Send each subscriber their customized briefing (used by cron and startup). */
export async function broadcastBriefingsToAllSubscribers(
  client: TwilioClient,
  from: string,
  trigger: BriefingBroadcastTrigger
): Promise<void> {
  console.log(
    JSON.stringify({
      level: 'info',
      event: 'briefing_broadcast_start',
      trigger,
    })
  );

  let subs;
  try {
    subs = await listSubscribers();
  } catch (e) {
    console.log(
      JSON.stringify({
        level: 'error',
        event: 'briefing_broadcast_load_failed',
        trigger,
        message: e instanceof Error ? e.message : String(e),
      })
    );
    return;
  }

  if (subs.length === 0) {
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'briefing_broadcast_no_subscribers',
        trigger,
      })
    );
    return;
  }

  for (const sub of subs) {
    const body = formatBriefing(sub.displayName, sub.tasks);
    const r = await sendWhatsAppMessage(client, from, sub.phoneE164, body);
    if (r.ok) {
      console.log(
        JSON.stringify({
          level: 'info',
          event: 'briefing_broadcast_sent',
          trigger,
          subscriberId: sub.id,
          sid: r.sid,
        })
      );
    } else {
      console.log(
        JSON.stringify({
          level: 'error',
          event: 'briefing_broadcast_failed',
          trigger,
          subscriberId: sub.id,
          error: r.error,
        })
      );
    }
  }

  console.log(
    JSON.stringify({
      level: 'info',
      event: 'briefing_broadcast_complete',
      trigger,
      count: subs.length,
    })
  );
}

export function startBriefingScheduler(
  client: TwilioClient,
  from: string
): () => void {
  const tz = process.env.BRIEFING_TZ?.trim() || undefined;
  const options = tz ? { timezone: tz } : {};

  const job = cron.schedule(
    '0 8 * * *',
    () => {
      void broadcastBriefingsToAllSubscribers(client, from, 'cron');
    },
    options
  );

  return () => job.stop();
}
