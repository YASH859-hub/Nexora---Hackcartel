import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  FileText,
  FileType2,
  FolderOpen,
  Shield,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { buildAutofillPlan, parseFieldList, type AutofillFieldPlan } from '../lib/autofill';
import {
  buildVaultProfileSnapshot,
  createVaultDocumentFromFile,
  loadVaultDocuments,
  saveVaultDocuments,
  type VaultDocument,
  type VaultDocumentType,
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

const DOCUMENT_TYPE_OPTIONS: Array<{ value: VaultDocumentType; label: string }> = [
  { value: 'identity', label: 'Identity' },
  { value: 'address', label: 'Address Proof' },
  { value: 'financial', label: 'Financial' },
  { value: 'travel', label: 'Travel' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other' },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function sourceBadgeClass(source: AutofillFieldPlan['source']) {
  if (source === 'profile') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (source === 'document') return 'bg-violet-50 text-violet-700 border-violet-100';
  if (source === 'suggested') return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-zinc-50 text-zinc-700 border-zinc-200';
}

export default function Documents() {
  const { user, userProfile } = useAuth();
  const [documents, setDocuments] = useState<VaultDocument[]>(() => loadVaultDocuments());
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>(() => loadVaultDocuments()[0]?.id || '');
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState<VaultDocumentType>('identity');
  const [documentNotes, setDocumentNotes] = useState('');
  const [documentDetails, setDocumentDetails] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedFieldsText, setDetectedFieldsText] = useState(DEFAULT_FORM_FIELDS.join('\n'));
  const [fieldPlan, setFieldPlan] = useState<AutofillFieldPlan[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) || documents[0] || null,
    [documents, selectedDocumentId],
  );

  const profileSnapshot = buildVaultProfileSnapshot(userProfile, user?.email || '');

  useEffect(() => {
    saveVaultDocuments(documents);
  }, [documents]);

  useEffect(() => {
    if (!selectedDocumentId && documents[0]?.id) {
      setSelectedDocumentId(documents[0].id);
    }
  }, [documents, selectedDocumentId]);

  const addDocument = async () => {
    if (!selectedFile) {
      setMessage('Choose a file to store in the vault.');
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      const document = await createVaultDocumentFromFile(selectedFile, {
        name: documentName || selectedFile.name,
        type: documentType,
        notes: documentNotes,
        details: documentDetails,
      });

      setDocuments((current) => [document, ...current.filter((item) => item.id !== document.id)]);
      setSelectedDocumentId(document.id);
      setDocumentName('');
      setDocumentNotes('');
      setDocumentDetails('');
      setSelectedFile(null);
      setMessage('Document saved to your vault.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to store document.');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePlan = async () => {
    const fields = parseFieldList(detectedFieldsText);
    if (!fields.length) {
      setMessage('Add at least one detected form field.');
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
      const nextValues = plan.reduce<Record<string, string>>((accumulator, item) => {
        accumulator[item.field] = item.value;
        return accumulator;
      }, {});
      setFormValues(nextValues);
      setMessage('Autofill plan generated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to build autofill plan.');
    } finally {
      setIsGenerating(false);
    }
  };

  const fillDefaults = () => {
    setDetectedFieldsText(DEFAULT_FORM_FIELDS.join('\n'));
    setMessage('Loaded the default form template.');
  };

  const clearPlan = () => {
    setFieldPlan([]);
    setFormValues({});
    setMessage('Cleared the active autofill preview.');
  };

  const copyPlan = async () => {
    if (!fieldPlan.length) {
      setMessage('Generate a plan before copying it.');
      return;
    }

    await navigator.clipboard.writeText(JSON.stringify(fieldPlan, null, 2));
    setMessage('Autofill plan copied to clipboard.');
  };

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-8 pb-8">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5" />
                Document vault + autofill
              </div>
              <h2 className="mt-4 text-3xl font-display font-semibold text-foreground">Store documents once, keep them ready for automations.</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground max-w-2xl">
                Upload IDs, proofs, and policy documents into a digital vault. Your stored data is used by the Automations tab when you generate Google Form prefill links.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 min-w-[280px]">
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Vault docs</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{documents.length}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border bg-background px-2.5 py-1">Profile: {profileSnapshot.fullName || 'Not set'}</span>
            <span className="rounded-full border border-border bg-background px-2.5 py-1">Email: {profileSnapshot.email || 'Not set'}</span>
            <span className="rounded-full border border-border bg-background px-2.5 py-1">Timezone: {profileSnapshot.timezone}</span>
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
                <h3 className="text-xl font-display font-semibold text-foreground">Upload to vault</h3>
                <p className="text-sm text-muted-foreground mt-1">Store a document digitally and capture the details the autofill engine can reuse.</p>
              </div>
              <Upload className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Document name</label>
                <input
                  value={documentName}
                  onChange={(event) => setDocumentName(event.target.value)}
                  placeholder="Passport copy"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Document type</label>
                <select
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value as VaultDocumentType)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent/50"
                >
                  {DOCUMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Upload file</label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground hover:border-accent/50 hover:text-foreground transition-colors">
                  <FileType2 className="w-4 h-4" />
                  {selectedFile ? selectedFile.name : 'Choose a file'}
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Captured details</label>
                <textarea
                  value={documentDetails}
                  onChange={(event) => setDocumentDetails(event.target.value)}
                  placeholder="Passport number, policy number, address, date of birth..."
                  rows={4}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent/50 resize-none"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-foreground">Notes</label>
              <textarea
                value={documentNotes}
                onChange={(event) => setDocumentNotes(event.target.value)}
                placeholder="Where this document is used, renewal date, or any reminders"
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent/50 resize-none"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={addDocument}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                <Upload className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Store document'}
              </button>
              <button
                onClick={fillDefaults}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
              >
                <FileText className="w-4 h-4" />
                Load sample form
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xl font-display font-semibold text-foreground">Vault contents</h3>
                <p className="text-sm text-muted-foreground mt-1">Review the documents available to the autofill engine.</p>
              </div>
              <FolderOpen className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {documents.map((document) => {
                const isSelected = document.id === selectedDocumentId;

                return (
                  <button
                    key={document.id}
                    onClick={() => setSelectedDocumentId(document.id)}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/30'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          {document.name}
                          {isSelected && <BadgeCheck className="w-4 h-4 text-primary" />}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{document.fileName} • {formatDate(document.uploadedAt)}</div>
                      </div>
                      <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
                        {document.type}
                      </span>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-2">{document.preview || document.notes || 'No preview available.'}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {document.fields.slice(0, 4).map((field) => (
                        <span key={`${document.id}-${field.key}`} className="rounded-full border border-border bg-background px-2.5 py-1 text-[0.65rem] text-foreground">
                          {field.key}: {field.value}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-display font-semibold text-foreground">Vault ready for automation</h3>
              <p className="text-sm text-muted-foreground mt-1">Use the Automations tab to generate Google Form prefill links from these documents.</p>
            </div>
            <Shield className="w-5 h-5 text-muted-foreground" />
          </div>
        </section>
      </div>
    </main>
  );
}
