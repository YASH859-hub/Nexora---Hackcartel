function parseOriginList(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

export function buildAllowedOrigins(): string[] {
  const origins = new Set<string>([
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ]);

  for (const o of parseOriginList(process.env.FRONTEND_URL)) {
    origins.add(o);
  }
  for (const o of parseOriginList(process.env.ALLOWED_ORIGINS)) {
    origins.add(o);
  }

  return [...origins];
}

export function isOriginAllowed(origin: string, allowed: string[]): boolean {
  const normalized = origin.replace(/\/+$/, '');
  if (allowed.includes(normalized)) return true;

  if (process.env.ALLOW_VERCEL_ORIGINS === 'false') return false;

  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (hostname.endsWith('.vercel.app')) return true;
  } catch {
    return false;
  }

  return false;
}
