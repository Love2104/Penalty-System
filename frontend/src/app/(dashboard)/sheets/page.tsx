'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Plus,
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

export default function SheetsPage() {
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetSummary[]>([]);
  const [integration, setIntegration] = useState<GoogleIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ name: '', spreadsheetId: '' });
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSpreadsheets = async () => {
    const res = await api.get('/sheets/spreadsheets');
    setSpreadsheets(res.data);
  };

  const fetchIntegrationStatus = async () => {
    const res = await api.get('/sheets/google/integration-status');
    setIntegration(res.data);
  };

  useEffect(() => {
    const loadPage = async () => {
      try {
        await Promise.all([fetchSpreadsheets(), fetchIntegrationStatus()]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, []);

  const saveCredentials = async () => {
    if (!serviceAccountJson.trim()) {
      setBanner({ type: 'error', text: 'Paste the full Google service account JSON first.' });
      return;
    }

    setSavingCredentials(true);
    setBanner(null);
    try {
      await api.patch('/sheets/google/integration-status', {
        serviceAccountJson: serviceAccountJson.trim(),
      });
      setServiceAccountJson('');
      setBanner({ type: 'success', text: 'Google service account saved. You can sync tabs now.' });
      await fetchIntegrationStatus();
    } catch (error: any) {
      setBanner({ type: 'error', text: error.response?.data?.error || 'Failed to save Google credentials.' });
    } finally {
      setSavingCredentials(false);
    }
  };

  const createSpreadsheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.spreadsheetId.trim()) {
      setBanner({ type: 'error', text: 'Please enter both a display name and a Google Spreadsheet ID or URL.' });
      return;
    }

    setSaving(true);
    setBanner(null);

    try {
      const res = await api.post('/sheets/spreadsheets', {
        name: form.name.trim(),
        spreadsheetId: form.spreadsheetId.trim(),
      });

      const importedTabsCount = res.data.importedTabsCount || 0;
      setForm({ name: '', spreadsheetId: '' });
      setIsCreating(false);
      setBanner({
        type: 'success',
        text: `Spreadsheet linked successfully. Imported ${importedTabsCount} existing tab${importedTabsCount === 1 ? '' : 's'}.`
      });
      await fetchSpreadsheets();
    } catch (error: any) {
      setBanner({
        type: 'error',
        text: error.response?.data?.error || 'Failed to link spreadsheet.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">Master Sheets</h1>
          <p className="text-zinc-400">
            Link multiple Google Spreadsheet files, then manage unlimited penalty tabs inside each one.
          </p>
        </div>
        <button
          onClick={() => setIsCreating((current) => !current)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 font-semibold text-black transition-colors hover:bg-zinc-200"
        >
          <Plus className="h-5 w-5" />
          Add Spreadsheet
        </button>
      </div>

      <div className={`flex items-start gap-3 rounded-2xl border p-4 ${
        integration?.ready
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-blue-500/30 bg-blue-500/5'
      }`}>
        <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${
          integration?.ready ? 'text-green-400' : 'text-blue-400'
        }`} />
        <div>
          <h3 className={`text-sm font-semibold ${integration?.ready ? 'text-green-400' : 'text-blue-400'}`}>
            Google Sync Setup
          </h3>
          <p className="mt-1 mb-2 text-sm text-zinc-300">
            {integration?.ready
              ? <>Google sync is ready. Share each target spreadsheet with this service account and grant <strong>Editor</strong> access:</>
              : <>To enable sync, paste a Google service-account JSON below or place the credentials file on the backend. Then share each target spreadsheet with this service account and grant <strong>Editor</strong> access:</>}
          </p>
          <div className="inline-block select-all rounded-md border border-zinc-700 bg-black/50 px-3 py-1.5 font-mono text-sm text-zinc-200">
            {integration?.clientEmail || 'Service account email will appear here after credentials are configured'}
          </div>
          {integration?.source && (
            <p className="mt-2 text-xs text-zinc-500">Source: {integration.source}</p>
          )}
          {integration?.issue && (
            <p className="mt-2 text-sm text-red-300">{integration.issue}</p>
          )}
          {integration?.credentialPath && !integration.ready && (
            <p className="mt-1 text-xs text-zinc-500">Expected file path: {integration.credentialPath}</p>
          )}
        </div>
      </div>

      {!integration?.ready && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-1 text-lg font-bold text-white">Quick Fix: Paste Service Account JSON</h2>
          <p className="mb-4 text-sm text-zinc-500">
            Open your Google Cloud service-account credentials JSON and paste the full contents here. This saves it in the portal so you do not need to create a local file manually.
          </p>
          <textarea
            value={serviceAccountJson}
            onChange={(e) => setServiceAccountJson(e.target.value)}
            placeholder='{"type":"service_account","project_id":"...","client_email":"..."}'
            rows={8}
            className="w-full rounded-lg border border-zinc-800 bg-black/50 px-4 py-3 font-mono text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={saveCredentials}
              disabled={savingCredentials}
              className="flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
            >
              {savingCredentials ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save Google Credentials
            </button>
          </div>
        </div>
      )}

      {banner && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            banner.type === 'success'
              ? 'border-green-500/20 bg-green-500/10 text-green-300'
              : 'border-red-500/20 bg-red-500/10 text-red-300'
          }`}
        >
          {banner.text}
        </div>
      )}

      {isCreating && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
        >
          <h2 className="mb-1 text-xl font-bold text-white">Link a New Spreadsheet</h2>
          <p className="mb-4 text-sm text-zinc-500">
            Paste a Google Spreadsheet ID or full URL. We will detect existing tabs automatically.
          </p>

          <form onSubmit={createSpreadsheet} className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr_auto]">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              placeholder="E.g. Academics 2024"
              className="rounded-lg border border-zinc-800 bg-black/50 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={form.spreadsheetId}
                onChange={(e) => setForm((current) => ({ ...current, spreadsheetId: e.target.value }))}
                placeholder="Spreadsheet ID or full Google Sheets URL"
                className="w-full rounded-lg border border-zinc-800 bg-black/50 py-2.5 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Link File
            </button>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          </div>
        ) : spreadsheets.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-zinc-800 bg-zinc-900 py-12 text-center text-zinc-500">
            No spreadsheets linked yet. Add your first file to start creating tab-based penalty rooms.
          </div>
        ) : (
          spreadsheets.map((spreadsheet, index) => (
            <motion.div
              key={spreadsheet.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-zinc-700"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="rounded-xl border border-zinc-800 bg-black p-3">
                  <FileText className="h-6 w-6 text-zinc-400" />
                </div>
                {spreadsheet.google_spreadsheet_url && (
                  <a
                    href={spreadsheet.google_spreadsheet_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-white"
                  >
                    Open Google
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              <h3 className="mb-2 line-clamp-1 text-lg font-bold text-white">{spreadsheet.name}</h3>
              <div className="mb-6 space-y-1 text-sm text-zinc-500">
                <p>Tabs: {spreadsheet.tabCount}</p>
                <p>Penalty records: {spreadsheet.recordCount}</p>
                <p>Created by: {spreadsheet.creator?.email}</p>
                <p>Linked: {new Date(spreadsheet.created_at).toLocaleDateString()}</p>
              </div>

              <Link
                href={`/sheets/${spreadsheet.id}`}
                className="mt-auto flex items-center text-sm font-medium text-zinc-400 transition-colors hover:text-white"
              >
                Open File
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
