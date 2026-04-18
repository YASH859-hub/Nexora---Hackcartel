export type VaultDocumentType = 'identity' | 'address' | 'financial' | 'travel' | 'insurance' | 'education' | 'other';

export interface VaultDocumentField {
  key: string;
  value: string;
  source: 'profile' | 'document' | 'manual';
}

export interface VaultDocument {
  id: string;
  name: string;
  type: VaultDocumentType;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  notes: string;
  preview: string;
  fields: VaultDocumentField[];
}

export interface VaultProfileSnapshot {
  fullName: string;
  email: string;
  phone: string;
  timezone: string;
}

const DOCUMENT_VAULT_STORAGE_KEY = 'nexora_document_vault_v1';

const DEFAULT_DOCUMENTS: VaultDocument[] = [
  {
    id: 'demo-passport',
    name: 'Passport copy',
    type: 'identity',
    fileName: 'passport-demo.txt',
    mimeType: 'text/plain',
    size: 0,
    uploadedAt: '2026-04-18T00:00:00.000Z',
    notes: 'Demo identity document for testing one-click autofill.',
    preview: 'Passport number: P1234567\nDate of birth: 1992-08-14\nNationality: Indian',
    fields: [
      { key: 'passport_number', value: 'P1234567', source: 'document' },
      { key: 'date_of_birth', value: '1992-08-14', source: 'document' },
      { key: 'nationality', value: 'Indian', source: 'document' },
    ],
  },
  {
    id: 'demo-address',
    name: 'Proof of address',
    type: 'address',
    fileName: 'utility-bill-demo.txt',
    mimeType: 'text/plain',
    size: 0,
    uploadedAt: '2026-04-18T00:00:00.000Z',
    notes: 'Demo address document for contact forms.',
    preview: 'Address: 221B Baker Street, London, UK\nPostal code: NW1 6XE',
    fields: [
      { key: 'address', value: '221B Baker Street, London, UK', source: 'document' },
      { key: 'postal_code', value: 'NW1 6XE', source: 'document' },
    ],
  },
  {
    id: 'demo-insurance',
    name: 'Insurance policy',
    type: 'insurance',
    fileName: 'policy-demo.txt',
    mimeType: 'text/plain',
    size: 0,
    uploadedAt: '2026-04-18T00:00:00.000Z',
    notes: 'Demo policy used by the autofill sandbox.',
    preview: 'Policy number: HIC-99220\nProvider: Nexora Care\nMember ID: NX-44821',
    fields: [
      { key: 'policy_number', value: 'HIC-99220', source: 'document' },
      { key: 'provider', value: 'Nexora Care', source: 'document' },
      { key: 'member_id', value: 'NX-44821', source: 'document' },
    ],
  },
];

function safeParseDocuments(raw: string | null): VaultDocument[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isVaultDocument);
  } catch {
    return [];
  }
}

function isVaultDocument(value: unknown): value is VaultDocument {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.fileName === 'string' &&
    typeof candidate.mimeType === 'string' &&
    typeof candidate.size === 'number' &&
    typeof candidate.uploadedAt === 'string' &&
    typeof candidate.notes === 'string' &&
    typeof candidate.preview === 'string' &&
    Array.isArray(candidate.fields)
  );
}

export function loadVaultDocuments(): VaultDocument[] {
  if (typeof window === 'undefined') {
    return DEFAULT_DOCUMENTS;
  }

  const parsed = safeParseDocuments(localStorage.getItem(DOCUMENT_VAULT_STORAGE_KEY));
  return parsed.length > 0 ? parsed : DEFAULT_DOCUMENTS;
}

export function saveVaultDocuments(documents: VaultDocument[]) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(DOCUMENT_VAULT_STORAGE_KEY, JSON.stringify(documents));
}

function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };

    reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return normalizeText(match[1]);
    }
  }

  return '';
}

function inferFieldsFromText(text: string): VaultDocumentField[] {
  const normalized = text.trim();

  if (!normalized) {
    return [];
  }

  const fields: VaultDocumentField[] = [];
  const pushField = (key: string, value: string) => {
    const trimmed = normalizeText(value);
    if (!trimmed || fields.some((field) => field.key === key)) {
      return;
    }

    fields.push({ key, value: trimmed, source: 'document' });
  };

  const email = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = normalized.match(/(?:\+?\d[\d\s()-]{7,}\d)/)?.[0];
  const passportNumber = firstMatch(normalized, [/passport(?:\s*(?:no|number|#))?[:\s-]*([A-Z0-9]{6,12})/i, /\b([A-Z]{1,2}\d{6,8})\b/]);
  const panNumber = firstMatch(normalized, [/pan(?:\s*(?:no|number|#))?[:\s-]*([A-Z0-9]{10})/i]);
  const aadhaarNumber = firstMatch(normalized, [/aadhaar(?:\s*(?:no|number|#))?[:\s-]*([\d\s]{12,14})/i, /(\d{4}\s?\d{4}\s?\d{4})/]);
  const policyNumber = firstMatch(normalized, [/policy(?:\s*(?:no|number|#))?[:\s-]*([A-Z0-9-]{4,})/i, /member(?:\s*(?:id|number|#))?[:\s-]*([A-Z0-9-]{4,})/i]);
  const postalCode = firstMatch(normalized, [/(?:postal\s*code|zip\s*code|postcode)[:\s-]*([A-Z0-9\- ]{3,12})/i]);
  const dateOfBirth = firstMatch(normalized, [/(?:date\s*of\s*birth|dob)[:\s-]*([0-9]{4}-[0-9]{2}-[0-9]{2})/i, /(?:date\s*of\s*birth|dob)[:\s-]*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i]);
  const address = firstMatch(normalized, [/(?:address|residential address|mailing address)[:\s-]*([^\n]+)/i]);
  const company = firstMatch(normalized, [/(?:company|employer|organization)[:\s-]*([^\n]+)/i]);
  const fullName = firstMatch(normalized, [/(?:full name|name)[:\s-]*([^\n]+)/i]);

  if (fullName) pushField('full_name', fullName);
  if (email) pushField('email', email);
  if (phone) pushField('phone', phone);
  if (dateOfBirth) pushField('date_of_birth', dateOfBirth);
  if (passportNumber) pushField('passport_number', passportNumber);
  if (panNumber) pushField('pan_number', panNumber);
  if (aadhaarNumber) pushField('aadhaar_number', aadhaarNumber.replace(/\s+/g, ''));
  if (policyNumber) pushField('policy_number', policyNumber);
  if (postalCode) pushField('postal_code', postalCode);
  if (address) pushField('address', address);
  if (company) pushField('company_name', company);

  return fields;
}

function inferDocumentType(file: File, explicitType?: VaultDocumentType): VaultDocumentType {
  if (explicitType) {
    return explicitType;
  }

  const searchable = `${file.name} ${file.type}`.toLowerCase();

  if (searchable.includes('passport') || searchable.includes('id')) return 'identity';
  if (searchable.includes('address') || searchable.includes('utility') || searchable.includes('bill')) return 'address';
  if (searchable.includes('invoice') || searchable.includes('bank') || searchable.includes('statement')) return 'financial';
  if (searchable.includes('insurance') || searchable.includes('policy')) return 'insurance';
  if (searchable.includes('education') || searchable.includes('degree') || searchable.includes('certificate')) return 'education';
  if (searchable.includes('travel') || searchable.includes('visa') || searchable.includes('ticket')) return 'travel';

  return 'other';
}

export async function createVaultDocumentFromFile(
  file: File,
  options: {
    name?: string;
    type?: VaultDocumentType;
    notes?: string;
    details?: string;
  } = {},
): Promise<VaultDocument> {
  const readableText = file.type.startsWith('text/') || /\.(txt|md|json|csv|log|xml)$/i.test(file.name) ? await fileToText(file) : '';
  const textBundle = [options.name || file.name, options.notes || '', options.details || '', readableText].filter(Boolean).join('\n');
  const inferredFields = inferFieldsFromText(textBundle);

  if (!inferredFields.some((field) => field.key === 'full_name') && options.name) {
    inferredFields.unshift({ key: 'document_name', value: normalizeText(options.name), source: 'manual' });
  }

  return {
    id: `vault-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: options.name?.trim() || file.name,
    type: inferDocumentType(file, options.type),
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    uploadedAt: new Date().toISOString(),
    notes: options.notes?.trim() || '',
    preview: textBundle.slice(0, 240) || file.name,
    fields: inferredFields,
  };
}

export function buildVaultProfileSnapshot(profile: { full_name?: string; phone?: string; timezone?: string } | null | undefined, email: string): VaultProfileSnapshot {
  return {
    fullName: profile?.full_name || '',
    email,
    phone: profile?.phone || '',
    timezone: profile?.timezone || 'UTC',
  };
}
