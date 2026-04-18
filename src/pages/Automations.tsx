import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  FileText,
  Link2,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { buildAutofillPlan, parseFieldList, type AutofillFieldPlan } from '../lib/autofill';
import {
  buildVaultProfileSnapshot,
  loadVaultDocuments,
  type VaultDocument,
} from '../lib/documentVault';

const DEFAULT_FORM_FIELDS = [
  'Full Name',
  'Email Address',
  'Phone Number',
  'Home Address',
  'Date of Birth',
  'Passport Number',
  'Policy Number',
  'Company Name',
];

function sourceBadgeClass(source: AutofillFieldPlan['source']) {
  if (source === 'profile') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (source === 'document') return 'bg-violet-50 text-violet-700 border-violet-100';
  if (source === 'suggested') return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-zinc-50 text-zinc-700 border-zinc-200';
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function extractEntryIdsFromUrl(rawUrl: string) {
  try {
    const parsedUrl = new URL(rawUrl);
    return Array.from(parsedUrl.searchParams.keys())
      .filter((key) => key.startsWith('entry.'))
      .map((key) => key.replace('entry.', ''));
  } catch {
    return [];
  }
}

function parseEntryMap(rawMap: string) {
  return rawMap
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, line) => {
      const separator = line.includes('=') ? '=' : line.includes(':') ? ':' : '';
      if (!separator) {
        return accumulator;
      }

      const [leftPart, rightPart] = line.split(separator, 2).map((part) => part.trim());
      if (!leftPart || !rightPart) {
        return accumulator;
      }

      if (leftPart.toLowerCase().startsWith('entry.')) {
        accumulator[normalizeKey(rightPart)] = leftPart.replace(/^entry\./i, '');
        return accumulator;
      }

      if (rightPart.toLowerCase().startsWith('entry.')) {
        accumulator[normalizeKey(leftPart)] = rightPart.replace(/^entry\./i, '');
      }

      return accumulator;
    }, {});
}

function buildPrefilledGoogleFormUrl(rawUrl: string, valuesByEntryId: Record<string, string>) {
  const parsedUrl = new URL(rawUrl);
  parsedUrl.searchParams.set('usp', 'pp_url');

  Object.entries(valuesByEntryId).forEach(([entryId, value]) => {
    if (entryId) {
      parsedUrl.searchParams.set(`entry.${entryId}`, value);
    }
  });

  return parsedUrl.toString();
}

function formatSourceLabel(source: AutofillFieldPlan['source']) {
  if (source === 'profile') return 'Profile';
  if (source === 'document') return 'Vault';
  if (source === 'suggested') return 'Suggested';
  return 'Manual';
}

export default function Automations() {
  const { user, userProfile } = useAuth();
  const [documents] = useState<VaultDocument[]>(() => loadVaultDocuments());
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>(() => loadVaultDocuments()[0]?.id || '');
  const [googleFormUrl, setGoogleFormUrl] = useState('https://docs.google.com/forms/d/e/FORM_ID/viewform');
  const [fieldLabelsText, setFieldLabelsText] = useState(DEFAULT_FORM_FIELDS.join('\n'));
  const [entryMapText, setEntryMapText] = useState('Full Name = entry.123456789\nEmail Address = entry.234567891\nPhone Number = entry.345678912');
  const [fieldPlan, setFieldPlan] = useState<AutofillFieldPlan[]>([]);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const profileSnapshot = buildVaultProfileSnapshot(userProfile, user?.email || '');
  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) || documents[0] || null,
    [documents, selectedDocumentId],
  );

  const importedEntryIds = useMemo(() => extractEntryIdsFromUrl(googleFormUrl), [googleFormUrl]);
  const manualEntryMap = useMemo(() => parseEntryMap(entryMapText), [entryMapText]);

  const runAutomation = async () => {
    const fields = parseFieldList(fieldLabelsText);

    if (!fields.length) {
      setMessage('Add at least one form field label.');
      return;
    }

    setIsGenerating(true);
    setMessage('');

    try {
      const plan = await buildAutofillPlan({
        fields,
        profile: profileSnapshot,
        documents,
        selectedDocumentId: selectedDocument?.id,
      });

      setFieldPlan(plan);

      const valuesByEntryId = plan.reduce<Record<string, string>>((accumulator, item, index) => {
        const normalizedField = normalizeKey(item.field);
        const entryIdFromManualMap = manualEntryMap[normalizedField];
        const entryIdFromUrl = importedEntryIds[index];
        const entryId = entryIdFromManualMap || entryIdFromUrl;

        if (entryId && item.value) {
          accumulator[entryId] = item.value;
        }

        return accumulator;
      }, {});

      if (!Object.keys(valuesByEntryId).length) {
        setGeneratedUrl('');
        setMessage('Add entry IDs from a real Google Form prefilled link or map field labels to entry IDs.');
        return;
      }

      const url = buildPrefilledGoogleFormUrl(googleFormUrl, valuesByEntryId);
      setGeneratedUrl(url);
      setMessage('Google Form prefilled link generated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to generate Google Form automation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyGeneratedUrl = async () => {
    if (!generatedUrl) {
      setMessage('Generate a prefilled link first.');
      return;
    }

    await navigator.clipboard.writeText(generatedUrl);
    setMessage('Prefilled Google Form link copied to clipboard.');
  };

  const openGeneratedUrl = () => {
    if (!generatedUrl) {
      setMessage('Generate a prefilled link first.');
      return;
    }

    window.open(generatedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-8 pb-8">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                <Zap className="w-3.5 h-3.5" />
                Automations
              </div>
              <h2 className="mt-4 text-3xl font-display font-semibold text-foreground">Generate real Google Form prefilled links.</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground max-w-2xl">
                Use your stored profile and document vault to fill genuine Google Form links. Paste a real form URL, map its entry IDs, and Nexora builds the prefilled link for you.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 min-w-[280px]">
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Vault docs</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{documents.length}</div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mapped fields</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{fieldPlan.filter((item) => item.value).length}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border bg-background px-2.5 py-1">Profile: {profileSnapshot.fullName || 'Not set'}</span>
            <span className="rounded-full border border-border bg-background px-2.5 py-1">Document: {selectedDocument?.name || 'None selected'}</span>
            <span className="rounded-full border border-border bg-background px-2.5 py-1">Google Form ready</span>
          </div>
        </motion.section>

        {message && (
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
            {message}
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xl font-display font-semibold text-foreground">Google Form link</h3>
                <p className="text-sm text-muted-foreground mt-1">Paste a real docs.google.com/forms link or a prefilled template URL.</p>
              </div>
              <Link2 className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Form URL</label>
              <input
                value={googleFormUrl}
                onChange={(event) => setGoogleFormUrl(event.target.value)}
                placeholder="https://docs.google.com/forms/d/e/.../viewform"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent/50"
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Detected form fields</label>
                <textarea
                  value={fieldLabelsText}
                  onChange={(event) => setFieldLabelsText(event.target.value)}
                  rows={10}
                  className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-1 focus:ring-accent/50 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Field to entry ID map</label>
                <textarea
                  value={entryMapText}
                  onChange={(event) => setEntryMapText(event.target.value)}
                  rows={10}
                  placeholder="Full Name = entry.123456789"
                  className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-1 focus:ring-accent/50 resize-none"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={runAutomation}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                <Wand2 className="w-4 h-4" />
                {isGenerating ? 'Generating...' : 'Generate prefilled link'}
              </button>
              <button
                onClick={copyGeneratedUrl}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
              >
                <ClipboardCopy className="w-4 h-4" />
                Copy link
              </button>
              <button
                onClick={openGeneratedUrl}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
              >
                <ExternalLink className="w-4 h-4" />
                Open link
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
              Entry IDs discovered from pasted URL: {importedEntryIds.length ? importedEntryIds.join(', ') : 'none yet'}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xl font-display font-semibold text-foreground">Autofill plan</h3>
                <p className="text-sm text-muted-foreground mt-1">This is the value plan generated from your profile and vault documents.</p>
              </div>
              <Sparkles className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {fieldPlan.map((item) => (
                <div key={`${item.field}-${item.documentId || 'plan'}`} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium text-foreground">{item.field}</label>
                    <span className={`rounded-full border px-2 py-1 text-[0.65rem] uppercase tracking-[0.18em] ${sourceBadgeClass(item.source)}`}>
                      {formatSourceLabel(item.source)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-foreground break-words">{item.value || 'No stored value'}</div>
                  <div className="mt-2 text-xs text-muted-foreground leading-relaxed">{item.reason}</div>
                </div>
              ))}

              {fieldPlan.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Generate a Google Form prefill link to see the mapped autofill plan here.
                </div>
              )}
            </div>
          </motion.div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xl font-display font-semibold text-foreground">Generated prefilled link</h3>
              <p className="text-sm text-muted-foreground mt-1">This is the actual Google Form URL with entry parameters filled in.</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
          </div>

          <textarea
            value={generatedUrl}
            readOnly
            rows={4}
            placeholder="Your generated prefilled Google Form link will appear here."
            className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none resize-none"
          />
        </section>
      </div>
    </main>
  );
}
