import type { VaultDocument, VaultProfileSnapshot } from './documentVault';

export type AutofillSource = 'profile' | 'document' | 'manual' | 'suggested';

export interface AutofillFieldPlan {
  field: string;
  label: string;
  value: string;
  source: AutofillSource;
  confidence: number;
  reason: string;
  documentId?: string;
  documentName?: string;
}

const FIELD_ALIASES: Record<string, string[]> = {
  full_name: ['full name', 'name', 'applicant name', 'legal name', 'customer name'],
  email: ['email', 'email address', 'e-mail'],
  phone: ['phone', 'phone number', 'mobile', 'contact number', 'whatsapp'],
  address: ['address', 'mailing address', 'residential address', 'current address'],
  date_of_birth: ['date of birth', 'dob', 'birth date'],
  passport_number: ['passport number', 'passport no', 'passport #'],
  pan_number: ['pan number', 'pan no', 'tax id', 'tax identifier'],
  aadhaar_number: ['aadhaar number', 'aadhar number', 'aadhaar no'],
  policy_number: ['policy number', 'policy no', 'member id', 'insurance policy'],
  company_name: ['company', 'company name', 'employer', 'organization'],
  postal_code: ['postal code', 'zip code', 'postcode', 'pincode'],
  nationality: ['nationality', 'citizenship'],
  account_number: ['account number', 'bank account', 'bank account number'],
  ifsc: ['ifsc', 'routing code', 'bank code'],
};

function normalizeField(value: string) {
  return value.trim().toLowerCase().replace(/[\*_:#()\[\]{}]/g, ' ').replace(/\s+/g, ' ');
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isFieldAlias(normalizedField: string, alias: string) {
  return normalizedField === alias || normalizedField.includes(alias) || alias.includes(normalizedField);
}

function profileLookup(profile: VaultProfileSnapshot, normalizedField: string) {
  if (FIELD_ALIASES.full_name.some((alias) => isFieldAlias(normalizedField, alias))) return profile.fullName;
  if (FIELD_ALIASES.email.some((alias) => isFieldAlias(normalizedField, alias))) return profile.email;
  if (FIELD_ALIASES.phone.some((alias) => isFieldAlias(normalizedField, alias))) return profile.phone;
  if (FIELD_ALIASES.postal_code.some((alias) => isFieldAlias(normalizedField, alias))) return '';
  return '';
}

function documentLookup(documents: VaultDocument[], normalizedField: string, selectedDocumentId?: string) {
  const prioritized = selectedDocumentId ? [...documents.filter((document) => document.id === selectedDocumentId), ...documents.filter((document) => document.id !== selectedDocumentId)] : documents;

  for (const document of prioritized) {
    const matchedField = document.fields.find((field) => {
      const fieldKey = normalizeField(field.key);
      const fieldValue = normalizeField(field.value);
      return normalizedField === fieldKey || normalizedField.includes(fieldKey) || fieldKey.includes(normalizedField) || FIELD_ALIASES[normalizedField]?.some((alias) => fieldKey.includes(alias)) || fieldValue.includes(normalizedField);
    });

    if (matchedField) {
      return {
        value: matchedField.value,
        document,
        matchedField: matchedField.key,
      };
    }
  }

  return null;
}

function buildLocalPlan(fields: string[], profile: VaultProfileSnapshot, documents: VaultDocument[], selectedDocumentId?: string): AutofillFieldPlan[] {
  return fields.map((rawField) => {
    const normalizedField = normalizeField(rawField);
    const explicitProfileValue = profileLookup(profile, normalizedField);

    if (explicitProfileValue) {
      return {
        field: rawField,
        label: titleCase(rawField),
        value: explicitProfileValue,
        source: 'profile',
        confidence: 0.96,
        reason: `Mapped from stored profile data for ${rawField}.`,
      };
    }

    const documentMatch = documentLookup(documents, normalizedField, selectedDocumentId);
    if (documentMatch) {
      return {
        field: rawField,
        label: titleCase(rawField),
        value: documentMatch.value,
        source: 'document',
        confidence: 0.9,
        reason: `Pulled from ${documentMatch.document.name}${documentMatch.matchedField ? ` (${documentMatch.matchedField})` : ''}.`,
        documentId: documentMatch.document.id,
        documentName: documentMatch.document.name,
      };
    }

    if (/date/i.test(normalizedField)) {
      return {
        field: rawField,
        label: titleCase(rawField),
        value: '',
        source: 'suggested',
        confidence: 0.2,
        reason: 'No stored date was available for this field.',
      };
    }

    return {
      field: rawField,
      label: titleCase(rawField),
      value: '',
      source: 'manual',
      confidence: 0.05,
      reason: 'No direct match found. Fill this manually or add a document that contains it.',
    };
  });
}

async function requestAiPlan(fields: string[], profile: VaultProfileSnapshot, documents: VaultDocument[], selectedDocumentId?: string) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    return null;
  }

  const selectedDocument = selectedDocumentId ? documents.find((document) => document.id === selectedDocumentId) : undefined;
  const prompt = `You map form fields to stored personal profile data and document vault values.

Return strict JSON only with this structure:
[
  {
    "field": "raw field label",
    "label": "human readable label",
    "value": "filled value or empty string",
    "source": "profile|document|manual|suggested",
    "confidence": 0.0,
    "reason": "brief reason",
    "documentId": "optional document id",
    "documentName": "optional document name"
  }
]

Rules:
- Prefer profile data for name, email, phone, timezone, and similar personal fields.
- Prefer the selected document for matching IDs, passport numbers, policy numbers, addresses, and other document-backed fields.
- If a field cannot be filled safely, return an empty value and mark it as manual or suggested.
- Do not invent values.

Profile:
${JSON.stringify(profile, null, 2)}

Selected document:
${JSON.stringify(selectedDocument || null, null, 2)}

All documents:
${JSON.stringify(documents, null, 2)}

Form fields:
${JSON.stringify(fields, null, 2)}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.filter((item): item is AutofillFieldPlan => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const candidate = item as Record<string, unknown>;
      return (
        typeof candidate.field === 'string' &&
        typeof candidate.label === 'string' &&
        typeof candidate.value === 'string' &&
        (candidate.source === 'profile' || candidate.source === 'document' || candidate.source === 'manual' || candidate.source === 'suggested') &&
        typeof candidate.confidence === 'number' &&
        typeof candidate.reason === 'string'
      );
    });
  } catch {
    return null;
  }
}

export function parseFieldList(rawFields: string) {
  return rawFields
    .split(/[\n;,]/)
    .map((field) => field.trim())
    .filter(Boolean);
}

export async function buildAutofillPlan(options: {
  fields: string[];
  profile: VaultProfileSnapshot;
  documents: VaultDocument[];
  selectedDocumentId?: string;
}): Promise<AutofillFieldPlan[]> {
  const { fields, profile, documents, selectedDocumentId } = options;

  if (!fields.length) {
    return [];
  }

  const aiPlan = await requestAiPlan(fields, profile, documents, selectedDocumentId);
  if (aiPlan && aiPlan.length === fields.length) {
    return aiPlan.map((item) => ({
      ...item,
      label: item.label || titleCase(item.field),
      value: item.value || '',
      reason: item.reason || 'AI-assisted mapping from profile and stored documents.',
    }));
  }

  return buildLocalPlan(fields, profile, documents, selectedDocumentId);
}
