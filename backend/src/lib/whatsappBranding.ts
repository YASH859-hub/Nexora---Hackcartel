/**
 * Label shown at the top of every WhatsApp body (notification preview + message).
 * Chat list "name" is still the WhatsApp Business profile for your sender number
 * (configure in Twilio / Meta Business Suite).
 */
export function getWhatsAppBrandName(): string {
  return process.env.WHATSAPP_BRAND_NAME?.trim() || 'Nexora';
}

/** Prefix body with brand line once (avoids double-prefix). */
export function brandWhatsAppBody(body: string): string {
  const text = String(body ?? '');
  const brand = getWhatsAppBrandName();
  const start = text.trimStart();
  if (start.startsWith(`${brand}\n`) || start.startsWith(`${brand}\r\n`)) {
    return text;
  }
  if (start.startsWith(`${brand} `)) {
    return text;
  }
  return `${brand}\n\n${text}`;
}
