'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import api from '@/lib/api';

interface SpreadsheetTab {
  id: string;
  name: string;
  status: string;
  created_at: string;
  creator?: { email: string };
  _count: { rows: number };
}

interface SpreadsheetDetails {
  id: string;
  name: string;
  google_spreadsheet_id: string | null;
  google_spreadsheet_url: string | null;
  created_at: string;
  creator?: { email: string };
  tabCount: number;
  recordCount: number;
  tabs: SpreadsheetTab[];
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

const statusTone = (status: string) => {
  switch (status) {
    case 'UNDER_REVIEW':
      return 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'FINAL_APPROVED':
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    case 'SENT':
      return 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300';
    default:
      return 'border-[var(--line)] bg-white/55 text-[color:var(--foreground-muted)] dark:bg-white/5';
  }
};

export default function SpreadsheetDetailsPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const router = useRouter();
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetDetails | null>(null);
  const [integration, setIntegration] = useState<GoogleIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateTab, setShowCreateTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [creatingTab, setCreatingTab] = useState(false);
  const [refreshingTabs, setRefreshingTabs] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [syncingTabId, setSyncingTabId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadPage = async () => {
      try {
        const [spreadsheetResponse, integrationResponse] = await Promise.all([
          api.get<SpreadsheetDetails>(`/sheets/spreadsheets/${id}`),
          api.get<GoogleIntegrationStatus>('/sheets/google/integration-status'),
        ]);

        if (active) {
          setSpreadsheet(spreadsheetResponse.data);
          setIntegration(integrationResponse.data);
        }
      } catch (error) {
        if (active) {
          setBanner({ type: 'error', text: getErrorMessage(error, 'Unable to load spreadsheet details.') });
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
  }, [id]);

  const refreshSpreadsheet = async () => {
    const response = await api.get<SpreadsheetDetails>(`/sheets/spreadsheets/${id}`);
    setSpreadsheet(response.data);
  };

  const refreshIntegration = async () => {
    const response = await api.get<GoogleIntegrationStatus>('/sheets/google/integration-status');
    setIntegration(response.data);
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

  const createTab = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newTabName.trim()) {
      setBanner({ type: 'error', text: 'Enter a tab name first.' });
      return;
    }

    setCreatingTab(true);
    setBanner(null);

    try {
      await api.post(`/sheets/spreadsheets/${id}/tabs`, { name: newTabName.trim() });
      setNewTabName('');
      setShowCreateTab(false);
      setBanner({ type: 'success', text: 'Tab created successfully.' });
      await refreshSpreadsheet();
    } catch (error) {
      setBanner({ type: 'error', text: getErrorMessage(error, 'Unable to create a new tab.') });
    } finally {
      setCreatingTab(false);
    }
  };

  const discoverTabs = async () => {
    setRefreshingTabs(true);
    setBanner(null);

    try {
      const response = await api.post<{ importedTabsCount: number }>(`/sheets/spreadsheets/${id}/discover-tabs`);
      setBanner({
        type: 'success',
        text: response.data.importedTabsCount
          ? `Imported ${response.data.importedTabsCount} new tab${response.data.importedTabsCount === 1 ? '' : 's'} from Google Sheets.`
          : 'No new Google tabs were found.',
      });
      await refreshSpreadsheet();
    } catch (error) {
      setBanner({ type: 'error', text: getErrorMessage(error, 'Unable to detect Google tabs.') });
    } finally {
      setRefreshingTabs(false);
    }
  };

  const syncTab = async (tabId: string) => {
    setSyncingTabId(tabId);
    setBanner(null);

    try {
      const response = await api.post<{ message: string }>(`/sheets/tabs/${tabId}/sync-google`);
      setBanner({ type: 'success', text: response.data.message || 'Tab synced successfully.' });
      await refreshSpreadsheet();
    } catch (error) {
      setBanner({ type: 'error', text: getErrorMessage(error, 'Unable to sync this tab.') });
    } finally {
      setSyncingTabId(null);
    }
  };

  const deleteTab = async (tabId: string) => {
    if (!window.confirm('Delete this tab and all its local penalty rows?')) {
      return;
    }

    try {
      await api.delete(`/sheets/tabs/${tabId}`);
      setBanner({ type: 'success', text: 'Tab deleted successfully.' });
      await refreshSpreadsheet();
    } catch (error) {
      setBanner({ type: 'error', text: getErrorMessage(error, 'Unable to delete this tab.') });
    }
  };

  const deleteSpreadsheet = async () => {
    if (!window.confirm('Delete this linked spreadsheet from the portal? The Google file itself will not be deleted.')) {
      return;
    }

    try {
      await api.delete(`/sheets/spreadsheets/${id}`);
      router.push('/sheets');
    } catch (error) {
      setBanner({ type: 'error', text: getErrorMessage(error, 'Unable to delete this spreadsheet.') });
    }
  };

  if (loading) {
    return (
      <div className="panel px-6 py-14 text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-[color:var(--accent)]" />
        <p className="mt-3 text-sm muted">Loading spreadsheet workspace...</p>
      </div>
    );
  }

  if (!spreadsheet) {
    return (
      <div className="panel px-6 py-14 text-center">
        <p className="text-xl font-semibold">{id ? 'Spreadsheet not found' : 'Spreadsheet ID is missing'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-start gap-4">
          <button className="button-secondary px-4 py-2.5" onClick={() => router.push('/sheets')} type="button">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="min-w-0 flex-1">
            <p className="eyebrow">Spreadsheet workspace</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">{spreadsheet.name}</h2>
              {spreadsheet.google_spreadsheet_url && (
                <a
                  className="button-secondary px-4 py-2.5"
                  href={spreadsheet.google_spreadsheet_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open Google file
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            <p className="mt-3 text-base muted">
              Created by {spreadsheet.creator?.email || 'Unknown user'} • {spreadsheet.tabCount} tab{spreadsheet.tabCount === 1 ? '' : 's'} • {spreadsheet.recordCount} penalty record{spreadsheet.recordCount === 1 ? '' : 's'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="button-secondary" disabled={refreshingTabs} onClick={discoverTabs} type="button">
              {refreshingTabs ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Discover tabs
            </button>
            <button className="button-primary" onClick={() => setShowCreateTab((current) => !current)} type="button">
              <Plus className="h-4 w-4" />
              Create tab
            </button>
            <button className="button-secondary border-red-500/25 text-red-400 hover:bg-red-500/10" onClick={deleteSpreadsheet} type="button">
              <Trash2 className="h-4 w-4" />
              Remove file
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">Google sheet ID</p>
          <p className="mt-3 break-all text-sm">{spreadsheet.google_spreadsheet_id || 'Not linked'}</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">Tabs</p>
          <p className="mt-3 text-3xl font-bold">{spreadsheet.tabCount}</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">Penalty records</p>
          <p className="mt-3 text-3xl font-bold">{spreadsheet.recordCount}</p>
        </div>
      </section>

      {!integration?.ready && (
        <section className="panel p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 text-amber-500" />
            <div>
              <p className="text-lg font-semibold">Google sync needs credentials</p>
              <p className="mt-2 text-sm muted">
                Paste the service-account JSON here once, then share this spreadsheet with the service account as an editor.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-[var(--line)] bg-white/55 px-4 py-4 text-sm muted dark:bg-white/5">
            {integration?.clientEmail || 'Service account email will appear here after configuration.'}
          </div>

          <textarea
            className="field mt-4 min-h-44 resize-y py-3 font-mono text-xs"
            onChange={(event) => setServiceAccountJson(event.target.value)}
            placeholder='{"type":"service_account","project_id":"...","client_email":"..."}'
            value={serviceAccountJson}
          />

          <div className="mt-4 flex justify-end">
            <button className="button-secondary" disabled={savingCredentials} onClick={saveCredentials} type="button">
              {savingCredentials ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save credentials
            </button>
          </div>
        </section>
      )}

      {showCreateTab && (
        <motion.section
          animate={{ opacity: 1, height: 'auto' }}
          className="panel p-6"
          initial={{ opacity: 0, height: 0 }}
        >
          <p className="text-lg font-semibold">Create a new tab</p>
          <p className="mt-1 text-sm muted">This creates both a local workspace and the matching Google tab.</p>

          <form className="mt-5 flex flex-col gap-4 lg:flex-row" onSubmit={createTab}>
            <input
              className="field flex-1"
              onChange={(event) => setNewTabName(event.target.value)}
              placeholder="Tab name"
              type="text"
              value={newTabName}
            />
            <button className="button-primary" disabled={creatingTab} type="submit">
              {creatingTab ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
          </form>
        </motion.section>
      )}

      {banner && (
        <div
          className={`rounded-3xl border px-4 py-3 text-sm ${
            banner.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/20 bg-red-500/10 text-red-300'
          }`}
        >
          {banner.text}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {!spreadsheet.tabs.length ? (
          <div className="panel col-span-full px-6 py-14 text-center">
            <FileText className="mx-auto h-10 w-10 text-[color:var(--accent)]" />
            <h3 className="mt-4 text-2xl font-semibold">No tabs yet</h3>
            <p className="mt-2 text-sm muted">Create one now or import existing tabs from Google Sheets.</p>
          </div>
        ) : (
          spreadsheet.tabs.map((tab) => (
            <article key={tab.id} className="panel flex h-full flex-col p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
                  <FileText className="h-5 w-5" />
                </div>
                <span className={`status-pill ${statusTone(tab.status)}`}>{tab.status}</span>
              </div>

              <h3 className="mt-5 text-xl font-semibold">{tab.name}</h3>
              <div className="mt-4 space-y-1 text-sm muted">
                <p>{tab._count.rows} penalty record{tab._count.rows === 1 ? '' : 's'}</p>
                <p>Created by {tab.creator?.email || 'Unknown user'}</p>
                <p>{new Date(tab.created_at).toLocaleDateString()}</p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  className="button-secondary px-4 py-2.5"
                  disabled={syncingTabId === tab.id}
                  onClick={() => syncTab(tab.id)}
                  type="button"
                >
                  {syncingTabId === tab.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Sync
                </button>
                <button
                  className="button-secondary border-red-500/25 px-4 py-2.5 text-red-400 hover:bg-red-500/10"
                  onClick={() => deleteTab(tab.id)}
                  type="button"
                >
                  Delete
                </button>
                <Link className="button-primary ml-auto px-4 py-2.5" href={`/tabs/view?id=${tab.id}`}>
                  Open
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))
        )}
      </section>

      <div className="panel flex items-start gap-3 px-5 py-4 text-sm muted">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--foreground-soft)]" />
        <p>
          Removing a file or tab here only deletes local portal data. It does not delete the Google Spreadsheet file or any tab in Google directly.
        </p>
      </div>
    </div>
  );
}
