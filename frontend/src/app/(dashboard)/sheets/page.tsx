'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ExternalLink,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import api from '@/lib/api';

interface SpreadsheetSummary {
  id: string;
  name: string;
  google_spreadsheet_id: string | null;
  google_spreadsheet_url: string | null;
  created_at: string;
  creator: { email: string };
  tabCount: number;
  recordCount: number;
}

interface GoogleIntegrationStatus {
  ready: boolean;
  source: string | null;
  clientEmail: string | null;
  credentialPath: string | null;
  issue: string | null;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    return response?.data?.error || fallback;
  }

  return fallback;
};

export default function SheetsPage() {
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetSummary[]>([]);
  const [integration, setIntegration] = useState<GoogleIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ name: '', spreadsheetId: '' });
  const [serviceAccountJson, setServiceAccountJson] = useState('');

  useEffect(() => {
    let active = true;

    const loadPage = async () => {
      try {
        const [sheetsResponse, integrationResponse] = await Promise.all([
          api.get<SpreadsheetSummary[]>('/sheets/spreadsheets'),
          api.get<GoogleIntegrationStatus>('/sheets/google/integration-status'),
        ]);

        if (active) {
          setSpreadsheets(sheetsResponse.data);
          setIntegration(integrationResponse.data);
        }
      } catch (error) {
        if (active) {
          setBanner({ type: 'error', text: getErrorMessage(error, 'Unable to load sheets workspace.') });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadPage();

    return () => {
      active = false;
    };
  }, []);

  const refreshIntegration = async () => {
    const response = await api.get<GoogleIntegrationStatus>('/sheets/google/integration-status');
    setIntegration(response.data);
  };

  const refreshSpreadsheets = async () => {
    const response = await api.get<SpreadsheetSummary[]>('/sheets/spreadsheets');
    setSpreadsheets(response.data);
  };

  const saveCredentials = async () => {
    if (!serviceAccountJson.trim()) {
      setBanner({ type: 'error', text: 'Paste the Google service-account JSON first.' });
      return;
    }

    setSavingCredentials(true);
    setBanner(null);

    try {
      await api.patch('/sheets/google/integration-status', {
        serviceAccountJson: serviceAccountJson.trim(),
      });

      setServiceAccountJson('');
      setBanner({ type: 'success', text: 'Google credentials saved successfully.' });
      await refreshIntegration();
    } catch (error) {
      setBanner({ type: 'error', text: getErrorMessage(error, 'Unable to save Google credentials.') });
    } finally {
      setSavingCredentials(false);
    }
  };

  const createSpreadsheet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.spreadsheetId.trim()) {
      setBanner({ type: 'error', text: 'Enter both a display name and a spreadsheet ID or URL.' });
      return;
    }

    setSaving(true);
    setBanner(null);

    try {
      const response = await api.post<{ importedTabsCount: number }>('/sheets/spreadsheets', {
        name: form.name.trim(),
        spreadsheetId: form.spreadsheetId.trim(),
      });

      setForm({ name: '', spreadsheetId: '' });
      setShowCreateForm(false);
      setBanner({
        type: 'success',
        text: `Spreadsheet linked successfully. Imported ${response.data.importedTabsCount} tab${response.data.importedTabsCount === 1 ? '' : 's'}.`,
      });
      await refreshSpreadsheets();
    } catch (error) {
      setBanner({ type: 'error', text: getErrorMessage(error, 'Unable to link spreadsheet.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel overflow-hidden p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="eyebrow">Sheet operations</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
              Link master spreadsheets, discover tabs automatically, and keep sync setup visible.
            </h2>
            <p className="mt-4 max-w-2xl text-base muted">
              The workflow is now organized around files first, then tabs inside each file. That keeps Google integration and review operations easier to reason about in production.
            </p>
          </div>

          <div className="panel-soft p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Google sync status</p>
                <p className="text-sm muted">
                  {integration?.ready ? 'Ready to create and sync tabs.' : 'Credentials still need to be configured.'}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-3xl border border-[var(--line)] bg-white/55 p-4 dark:bg-white/5">
              <p className="text-sm font-semibold">Service account</p>
              <p className="mt-2 break-all text-sm muted">
                {integration?.clientEmail || 'Service account email will appear here after configuration.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-lg font-semibold">Google setup</p>
            <p className="mt-1 text-sm muted">
              Share each target spreadsheet with the service account as an editor before syncing tabs.
            </p>
          </div>
          <button
            className="button-primary"
            onClick={() => setShowCreateForm((current) => !current)}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Link spreadsheet
          </button>
        </div>

        <div className={`mt-5 rounded-[28px] border p-5 ${
          integration?.ready ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-amber-500/20 bg-amber-500/10'
        }`}>
          <p className="text-sm font-semibold">
            {integration?.ready ? 'Credentials detected' : 'Credentials required'}
          </p>
          <p className="mt-2 text-sm muted">
            {integration?.issue || (integration?.ready
              ? `Configured from ${integration.source || 'saved service account'}.`
              : 'Paste a service-account JSON below or provide the backend file path in production.')}
          </p>
          {integration?.credentialPath && !integration.ready && (
            <p className="mt-2 text-xs text-mono-soft">Expected local file path: {integration.credentialPath}</p>
          )}
        </div>

        {!integration?.ready && (
          <div className="mt-5 rounded-[28px] border border-[var(--line)] bg-white/55 p-5 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-[color:var(--accent)]" />
              <div>
                <p className="text-sm font-semibold">Quick setup</p>
                <p className="text-sm muted">Paste the full Google service-account JSON to unlock sheet syncing.</p>
              </div>
            </div>
            <textarea
              className="field mt-4 min-h-44 resize-y py-3 font-mono text-xs"
              onChange={(event) => setServiceAccountJson(event.target.value)}
              placeholder='{"type":"service_account","project_id":"...","client_email":"..."}'
              value={serviceAccountJson}
            />
            <div className="mt-4 flex justify-end">
              <button className="button-secondary" disabled={savingCredentials} onClick={saveCredentials} type="button">
                {savingCredentials ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Save credentials
              </button>
            </div>
          </div>
        )}

        {showCreateForm && (
          <motion.form
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-5 rounded-[28px] border border-[var(--line)] bg-white/55 p-5 dark:bg-white/5"
            initial={{ opacity: 0, height: 0 }}
            onSubmit={createSpreadsheet}
          >
            <p className="text-lg font-semibold">Link a new spreadsheet</p>
            <p className="mt-1 text-sm muted">
              Paste either the spreadsheet ID or the full Google Sheets URL.
            </p>
            <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.3fr_auto]">
              <input
                className="field"
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Display name"
                type="text"
                value={form.name}
              />
              <input
                className="field"
                onChange={(event) => setForm((current) => ({ ...current, spreadsheetId: event.target.value }))}
                placeholder="Spreadsheet ID or URL"
                type="text"
                value={form.spreadsheetId}
              />
              <button className="button-primary" disabled={saving} type="submit">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Link
              </button>
            </div>
          </motion.form>
        )}

        {banner && (
          <div
            className={`mt-5 rounded-3xl border px-4 py-3 text-sm ${
              banner.type === 'success'
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/20 bg-red-500/10 text-red-300'
            }`}
          >
            {banner.text}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {loading ? (
          <div className="panel col-span-full px-6 py-14 text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-[color:var(--accent)]" />
            <p className="mt-3 text-sm muted">Loading linked spreadsheets...</p>
          </div>
        ) : !spreadsheets.length ? (
          <div className="panel col-span-full px-6 py-14 text-center">
            <FileSpreadsheet className="mx-auto h-10 w-10 text-[color:var(--accent)]" />
            <h3 className="mt-4 text-2xl font-semibold">No spreadsheets linked yet</h3>
            <p className="mt-2 text-sm muted">Link your first Google Sheet to begin managing penalty tabs.</p>
          </div>
        ) : (
          spreadsheets.map((spreadsheet) => (
            <article key={spreadsheet.id} className="panel flex h-full flex-col p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                {spreadsheet.google_spreadsheet_url && (
                  <a
                    className="button-secondary px-3 py-2 text-xs"
                    href={spreadsheet.google_spreadsheet_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Google
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              <h3 className="mt-5 text-xl font-semibold">{spreadsheet.name}</h3>
              <p className="mt-2 text-sm muted">Created by {spreadsheet.creator?.email || 'Unknown user'}</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="panel-soft p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">Tabs</p>
                  <p className="mt-2 text-2xl font-bold">{spreadsheet.tabCount}</p>
                </div>
                <div className="panel-soft p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">Records</p>
                  <p className="mt-2 text-2xl font-bold">{spreadsheet.recordCount}</p>
                </div>
              </div>

              <p className="mt-4 text-xs text-mono-soft">
                Linked on {new Date(spreadsheet.created_at).toLocaleDateString()}
              </p>

              <Link className="button-primary mt-6 w-full justify-between" href={`/sheets/view?id=${spreadsheet.id}`}>
                Open workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
