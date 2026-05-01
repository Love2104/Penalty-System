'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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

export default function SpreadsheetDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetDetails | null>(null);
  const [integration, setIntegration] = useState<GoogleIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateTab, setShowCreateTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [creatingTab, setCreatingTab] = useState(false);
  const [refreshingTabs, setRefreshingTabs] = useState(false);
  const [syncingTabId, setSyncingTabId] = useState<string | null>(null);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSpreadsheet = async () => {
    const res = await api.get(`/sheets/spreadsheets/${id}`);
    setSpreadsheet(res.data);
  };

  const fetchIntegrationStatus = async () => {
    const res = await api.get('/sheets/google/integration-status');
    setIntegration(res.data);
  };

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchSpreadsheet(), fetchIntegrationStatus()]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [id]);

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
      setBanner({ type: 'success', text: 'Google service account saved. Sync is ready now.' });
      await fetchIntegrationStatus();
    } catch (error: any) {
      setBanner({ type: 'error', text: error.response?.data?.error || 'Failed to save Google credentials.' });
    } finally {
      setSavingCredentials(false);
    }
  };

  const createTab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTabName.trim()) return;

    setCreatingTab(true);
    setBanner(null);

    try {
      await api.post(`/sheets/spreadsheets/${id}/tabs`, { name: newTabName.trim() });
      setNewTabName('');
      setShowCreateTab(false);
      setBanner({ type: 'success', text: 'Tab created successfully.' });
      await fetchSpreadsheet();
    } catch (error: any) {
      setBanner({ type: 'error', text: error.response?.data?.error || 'Failed to create tab.' });
    } finally {
      setCreatingTab(false);
    }
  };

  const refreshTabsFromGoogle = async () => {
    setRefreshingTabs(true);
    setBanner(null);

    try {
      const res = await api.post(`/sheets/spreadsheets/${id}/discover-tabs`);
      const count = res.data.importedTabsCount || 0;
      setBanner({
        type: 'success',
        text: count === 0 ? 'No new Google tabs were found.' : `Imported ${count} new tab${count === 1 ? '' : 's'} from Google Sheets.`
      });
      await fetchSpreadsheet();
    } catch (error: any) {
      setBanner({ type: 'error', text: error.response?.data?.error || 'Failed to detect tabs.' });
    } finally {
      setRefreshingTabs(false);
    }
  };

  const syncTab = async (tabId: string) => {
    setSyncingTabId(tabId);
    setBanner(null);

    try {
      const res = await api.post(`/sheets/tabs/${tabId}/sync-google`);
      setBanner({ type: 'success', text: res.data.message || 'Tab synced successfully.' });
      await fetchSpreadsheet();
    } catch (error: any) {
      setBanner({ type: 'error', text: error.response?.data?.error || 'Failed to sync tab.' });
    } finally {
      setSyncingTabId(null);
    }
  };

  const deleteTab = async (tabId: string) => {
    if (!confirm('Delete this local tab and all of its penalty records?')) return;

    try {
      await api.delete(`/sheets/tabs/${tabId}`);
      setBanner({ type: 'success', text: 'Tab deleted.' });
      await fetchSpreadsheet();
    } catch (error: any) {
      setBanner({ type: 'error', text: error.response?.data?.error || 'Failed to delete tab.' });
    }
  };

  const deleteSpreadsheet = async () => {
    if (!confirm('Delete this linked spreadsheet from the portal? This removes all local tabs and penalty data, but not the Google file itself.')) {
      return;
    }

    try {
      await api.delete(`/sheets/spreadsheets/${id}`);
      router.push('/sheets');
    } catch (error: any) {
      setBanner({ type: 'error', text: error.response?.data?.error || 'Failed to delete spreadsheet.' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
      case 'UNDER_REVIEW':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'FINAL_APPROVED':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'SENT':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!spreadsheet) {
    return <div className="py-20 text-center text-white">Spreadsheet not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <button
          onClick={() => router.push('/sheets')}
          className="mt-1 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">{spreadsheet.name}</h1>
            {spreadsheet.google_spreadsheet_url && (
              <a
                href={spreadsheet.google_spreadsheet_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-400 transition-colors hover:text-white"
              >
                Open Google File
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <p className="mt-2 text-zinc-400">
            Created by {spreadsheet.creator?.email}. This file currently contains {spreadsheet.tabCount} tab{spreadsheet.tabCount === 1 ? '' : 's'} and {spreadsheet.recordCount} penalty record{spreadsheet.recordCount === 1 ? '' : 's'}.
          </p>
        </div>

        <div className="ml-auto flex flex-wrap gap-3">
          <button
            onClick={refreshTabsFromGoogle}
            disabled={refreshingTabs}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {refreshingTabs ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Detect Existing Tabs
          </button>
          <button
            onClick={() => setShowCreateTab((current) => !current)}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" />
            Create Tab
          </button>
          <button
            onClick={deleteSpreadsheet}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2.5 font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
            Remove File
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Google Sheet ID</p>
            <p className="mt-2 break-all font-mono text-sm text-zinc-200">{spreadsheet.google_spreadsheet_id || 'Not linked'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Tabs</p>
            <p className="mt-2 text-2xl font-bold text-white">{spreadsheet.tabCount}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Penalty Records</p>
            <p className="mt-2 text-2xl font-bold text-white">{spreadsheet.recordCount}</p>
          </div>
        </div>
      </div>

      {!integration?.ready && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
          <h2 className="mb-1 text-lg font-bold text-white">Google Sync Needs Credentials</h2>
          <p className="mb-3 text-sm text-zinc-300">
            Paste the full Google service-account JSON here, save it once, then share this spreadsheet with the service account as <strong>Editor</strong>.
          </p>
          {integration?.issue && <p className="mb-2 text-sm text-red-300">{integration.issue}</p>}
          {integration?.credentialPath && (
            <p className="mb-3 text-xs text-zinc-500">Expected local file path: {integration.credentialPath}</p>
          )}
          <div className="mb-3 rounded-lg border border-zinc-700 bg-black/40 px-4 py-3 font-mono text-sm text-zinc-200">
            {integration?.clientEmail || 'Service account email will appear here after credentials are configured'}
          </div>
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
              className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
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

      {showCreateTab && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
        >
          <h2 className="mb-1 text-xl font-bold text-white">Create a New Tab</h2>
          <p className="mb-4 text-sm text-zinc-500">
            This adds a new local penalty room and creates the matching tab in Google Sheets.
          </p>
          <form onSubmit={createTab} className="flex flex-col gap-4 lg:flex-row">
            <input
              type="text"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              placeholder="E.g. Hostel Round 1"
              className="flex-1 rounded-lg border border-zinc-800 bg-black/50 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="submit"
              disabled={creatingTab}
              className="flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
            >
              {creatingTab ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Tab
            </button>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {spreadsheet.tabs.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-zinc-800 bg-zinc-900 py-12 text-center text-zinc-500">
            No local tabs yet. Create one here, or import existing tabs from Google Sheets.
          </div>
        ) : (
          spreadsheet.tabs.map((tab, index) => (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-zinc-700"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="rounded-xl border border-zinc-800 bg-black p-3">
                  <FileText className="h-6 w-6 text-zinc-400" />
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(tab.status)}`}>
                  {tab.status}
                </span>
              </div>

              <h3 className="mb-2 line-clamp-1 text-lg font-bold text-white">{tab.name}</h3>
              <div className="mb-6 space-y-1 text-sm text-zinc-500">
                <p>Penalty records: {tab._count.rows}</p>
                <p>Created by: {tab.creator?.email}</p>
                <p>Date: {new Date(tab.created_at).toLocaleDateString()}</p>
              </div>

              <div className="mt-auto flex flex-wrap gap-2">
                <button
                  onClick={() => syncTab(tab.id)}
                  disabled={syncingTabId === tab.id}
                  className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/20 disabled:opacity-50"
                >
                  {syncingTabId === tab.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Sync
                </button>
                <button
                  onClick={() => deleteTab(tab.id)}
                  className="rounded-lg border border-red-500/30 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                >
                  Delete
                </button>
                <Link
                  href={`/tabs/${tab.id}`}
                  className="ml-auto flex items-center gap-1 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                >
                  Open Tab
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />
        <p>
          Removing a file or tab here only deletes local portal data. It does not delete the Google Spreadsheet file or any Google tab directly.
        </p>
      </div>
    </div>
  );
}
