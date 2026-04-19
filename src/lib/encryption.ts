/**
 * End-to-End Encryption Utility
 * 
 * Encrypts/decrypts user data on the client-side before storing in Supabase.
 * Uses Web Crypto API (AES-GCM) - no sensitive data reaches the server unencrypted.
 * 
 * Key derivation: User's Supabase session token + user ID = encryption key
 * Only the authenticated user can decrypt their own data.
 * 
 * DBMS admin accessing the database only sees encrypted blobs.
 */

export interface EncryptedData {
  ciphertext: string; // base64-encoded encrypted data
  iv: string;         // base64-encoded initialization vector
  salt: string;       // base64-encoded salt
  version: number;    // encryption version for key rotation support
}

/**
 * Derives a 256-bit encryption key from user session + ID
 * This ensures each user's data is encrypted with a unique key they derive from their auth session
 */
export async function deriveEncryptionKey(
  userId: string,
  sessionToken: string
): Promise<CryptoKey> {
  // Combine user ID + session token as key material
  const keyMaterial = `${userId}:${sessionToken}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial);

  // Use PBKDF2 to derive a strong key from the material
  const importedKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new Uint8Array(16), // static salt ok since key material is unique per user
      iterations: 100000, // OWASP recommended
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

/**
 * Encrypts a string using AES-GCM
 * Returns: { ciphertext, iv, salt, version }
 */
export async function encryptData(
  plaintext: string,
  encryptionKey: CryptoKey
): Promise<EncryptedData> {
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  // Generate random IV (12 bytes recommended for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    plaintextBytes
  );

  // Convert to base64 for storage
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: '', // static salt in key derivation, can be empty here
    version: 1,
  };
}

/**
 * Decrypts encrypted data back to plaintext
 */
export async function decryptData(
  encrypted: EncryptedData,
  encryptionKey: CryptoKey
): Promise<string> {
  // Convert from base64
  const ciphertextBytes = Uint8Array.from(
    atob(encrypted.ciphertext),
    (c) => c.charCodeAt(0)
  );
  const iv = Uint8Array.from(
    atob(encrypted.iv),
    (c) => c.charCodeAt(0)
  );

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      encryptionKey,
      ciphertextBytes
    );

    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data. Key may be incorrect.');
  }
}

/**
 * Batch encrypt multiple fields at once
 * Useful for encrypting inbox items with multiple sensitive fields
 */
export async function encryptFields(
  fields: Record<string, string | null | undefined>,
  encryptionKey: CryptoKey
): Promise<Record<string, EncryptedData>> {
  const encrypted: Record<string, EncryptedData> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value) {
      encrypted[key] = await encryptData(value, encryptionKey);
    }
  }

  return encrypted;
}

/**
 * Batch decrypt multiple encrypted fields
 */
export async function decryptFields(
  encryptedFields: Record<string, EncryptedData | null | undefined>,
  encryptionKey: CryptoKey
): Promise<Record<string, string>> {
  const decrypted: Record<string, string> = {};

  for (const [key, encrypted] of Object.entries(encryptedFields)) {
    if (encrypted) {
      decrypted[key] = await decryptData(encrypted, encryptionKey);
    }
  }

  return decrypted;
}

/**
 * Convert encrypted data to database format (JSON string with base64 fields)
 */
export function serializeEncrypted(encrypted: EncryptedData): string {
  return JSON.stringify({
    c: encrypted.ciphertext,
    i: encrypted.iv,
    v: encrypted.version,
  });
}

/**
 * Convert database format back to EncryptedData
 */
export function deserializeEncrypted(dbString: string): EncryptedData {
  const parsed = JSON.parse(dbString);
  return {
    ciphertext: parsed.c,
    iv: parsed.i,
    salt: '',
    version: parsed.v || 1,
  };
}

/**
 * Security note:
 * - The encryption key is derived from the user's session token
 * - If the browser is logged out, the session token is cleared from memory
 * - Only authenticated users can access Supabase (via RLS)
 * - Supabase DBMS admins see only encrypted blobs
 * - Key rotation: When upgrading encryption_version, re-encrypt old rows with new key
 */
