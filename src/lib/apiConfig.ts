/** Strip trailing slashes from a URL. */
function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Render / local backend base URL (no trailing slash).
 * Set `VITE_BACKEND_URL` in Vercel to your Render service URL, e.g.
 * https://nexora-backend.onrender.com
 */
export function getBackendUrl(): string {
  const fromEnv =
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_BACKEND_BASE ||
    import.meta.env.VITE_BACKEND_AI_BASE;

  if (fromEnv && String(fromEnv).trim()) {
    return stripTrailingSlash(String(fromEnv).trim());
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }

  throw new Error(
    'VITE_BACKEND_URL is not set. Add your Render backend URL in Vercel environment variables.'
  );
}

/** Build a full backend API URL, e.g. backendApi('/api/send-otp'). */
export function backendApi(path: string): string {
  const base = getBackendUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
