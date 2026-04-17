import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type BriefingSubscriber = {
  id: string;
  displayName: string;
  /** E.164 e.g. +918767604204 */
  phoneE164: string;
  tasks: string[];
  updatedAt: string;
};

type StoreFile = {
  subscribers: BriefingSubscriber[];
};

function resolveDataDir(): string {
  if (process.env.BRIEFING_DATA_DIR?.trim()) {
    return path.resolve(process.env.BRIEFING_DATA_DIR.trim());
  }
  return path.resolve(__dirname, '..', '..', 'data');
}

export function getBriefingSubscribersPath(): string {
  return path.join(resolveDataDir(), 'briefing-subscribers.json');
}

async function ensureDataDir(): Promise<void> {
  await mkdir(resolveDataDir(), { recursive: true });
}

async function readStore(): Promise<StoreFile> {
  const file = getBriefingSubscribersPath();
  try {
    const raw = await readFile(file, 'utf-8');
    const parsed = JSON.parse(raw) as StoreFile;
    if (!parsed.subscribers || !Array.isArray(parsed.subscribers)) {
      return { subscribers: [] };
    }
    return parsed;
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return { subscribers: [] };
    }
    throw e;
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  await ensureDataDir();
  const file = getBriefingSubscribersPath();
  await writeFile(file, JSON.stringify(store, null, 2), 'utf-8');
}

export async function listSubscribers(): Promise<BriefingSubscriber[]> {
  const { subscribers } = await readStore();
  return subscribers;
}

export async function getSubscriber(id: string): Promise<BriefingSubscriber | undefined> {
  const { subscribers } = await readStore();
  return subscribers.find((s) => s.id === id);
}

export async function addSubscriber(input: {
  displayName: string;
  phoneE164: string;
  tasks: string[];
}): Promise<BriefingSubscriber> {
  const store = await readStore();
  const sub: BriefingSubscriber = {
    id: randomUUID(),
    displayName: input.displayName.trim(),
    phoneE164: input.phoneE164.trim(),
    tasks: input.tasks.map((t) => String(t).trim()).filter(Boolean),
    updatedAt: new Date().toISOString(),
  };
  store.subscribers.push(sub);
  await writeStore(store);
  return sub;
}

export async function updateSubscriber(
  id: string,
  patch: Partial<Pick<BriefingSubscriber, 'displayName' | 'phoneE164' | 'tasks'>>
): Promise<BriefingSubscriber | undefined> {
  const store = await readStore();
  const idx = store.subscribers.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;

  const cur = store.subscribers[idx];
  if (patch.displayName !== undefined) {
    cur.displayName = String(patch.displayName).trim();
  }
  if (patch.phoneE164 !== undefined) {
    cur.phoneE164 = String(patch.phoneE164).trim();
  }
  if (patch.tasks !== undefined) {
    cur.tasks = patch.tasks.map((t) => String(t).trim()).filter(Boolean);
  }
  cur.updatedAt = new Date().toISOString();
  await writeStore(store);
  return cur;
}

export async function removeSubscriber(id: string): Promise<boolean> {
  const store = await readStore();
  const before = store.subscribers.length;
  store.subscribers = store.subscribers.filter((s) => s.id !== id);
  if (store.subscribers.length === before) return false;
  await writeStore(store);
  return true;
}
