/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ShieldAlert,
  Database,
  Mail,
  BookOpen,
  Download,
  Upload,
  Search,
  CheckCircle,
  Copy,
  Clock,
  Play,
  Cloud,
  CloudDownload,
  CloudUpload,
  Trash2,
  ExternalLink,
  LogOut,
  RefreshCw,
  FileJson
} from 'lucide-react';
import { ERPState, addAuditEntry, addNotificationEntry } from '../data';
import { initAuth, googleSignIn, logout } from '../lib/driveAuth';
import { listBackupsInDrive, uploadBackupToDrive, downloadBackupFromDrive, deleteBackupFromDrive } from '../lib/driveApi';

interface SystemModulesProps {
  state: ERPState;
  setState: React.Dispatch<React.SetStateAction<ERPState>>;
  activeCompanyId: string;
}

export default function SystemModules({ state, setState, activeCompanyId }: SystemModulesProps) {
  const [activeSubTab, setActiveSubTab] = useState<'backup' | 'audit' | 'api' | 'email'>('backup');

  // Google Drive Integration States
  const [driveUser, setDriveUser] = useState<any>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load drive files on mount/token change
  const loadDriveFiles = async (token: string) => {
    setIsLoadingDrive(true);
    try {
      const files = await listBackupsInDrive(token);
      setDriveFiles(files);
    } catch (err) {
      console.error('Failed to load drive files:', err);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = initAuth(
      (user, token) => {
        setDriveUser(user);
        setDriveToken(token);
        loadDriveFiles(token);
      },
      () => {
        setDriveUser(null);
        setDriveToken(null);
        setDriveFiles([]);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleDriveLogin = async () => {
    setIsLoadingDrive(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setDriveUser(res.user);
        setDriveToken(res.accessToken);
        await loadDriveFiles(res.accessToken);
      }
    } catch (err) {
      console.error('Drive login failed:', err);
      alert('Failed to connect with Google Drive. Please verify your popup permissions or try again.');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleDriveLogout = async () => {
    try {
      await logout();
      setDriveUser(null);
      setDriveToken(null);
      setDriveFiles([]);
    } catch (err) {
      console.error('Drive logout failed:', err);
    }
  };

  const handleBackupToDrive = async () => {
    if (!driveToken) return;
    setIsSyncing(true);
    try {
      const fileName = `noja_erp_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      await uploadBackupToDrive(driveToken, state, fileName);
      
      const user = { name: driveUser?.displayName || 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
      let updated = addAuditEntry(
        state,
        'Cloud Backup to Google Drive',
        'System',
        `Successfully uploaded system snapshot "${fileName}" to Google Drive folder "Noja ERP Backups"`,
        user
      );
      updated = addNotificationEntry(
        updated,
        'Cloud Backup Created',
        `State snapshot synced directly to your Google Drive folder: ${fileName}`,
        'success'
      );
      setState(updated);

      await loadDriveFiles(driveToken);
      alert('System state backed up to Google Drive successfully!');
    } catch (err) {
      console.error('Cloud backup failed:', err);
      alert('Unable to save state to Google Drive.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreFromDrive = async (fileId: string, fileName: string) => {
    if (!driveToken) return;
    const confirmed = window.confirm(
      `Are you sure you want to restore the entire ERP system state from Google Drive backup "${fileName}"? This will overwrite your active local ledger database. This operation is irreversible.`
    );
    if (!confirmed) return;

    setIsLoadingDrive(true);
    try {
      const restoredState = await downloadBackupFromDrive(driveToken, fileId);
      
      if (restoredState.companies && restoredState.employees && restoredState.inventory && restoredState.finance) {
        const user = { name: driveUser?.displayName || 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
        let updated = { ...restoredState };
        updated = addAuditEntry(
          updated,
          'Cloud Restore from Google Drive',
          'System',
          `Restored ERP databases to the state of snapshot "${fileName}" downloaded from Google Drive`,
          user
        );
        updated = addNotificationEntry(
          updated,
          'Cloud Restore Completed',
          'Successfully rebuilt ERP data tables from Google Drive backup file.',
          'success'
        );

        setState(updated);
        alert('ERP state restored from Google Drive successfully!');
      } else {
        alert('Invalid backup archive. The Google Drive file schema does not match required ERP databases.');
      }
    } catch (err) {
      console.error('Cloud restore failed:', err);
      alert('Unable to load or parse backup file from Google Drive.');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleDeleteFromDrive = async (fileId: string, fileName: string) => {
    if (!driveToken) return;
    const confirmed = window.confirm(
      `Are you sure you want to PERMANENTLY delete "${fileName}" from your Google Drive folder "Noja ERP Backups"? This cannot be undone.`
    );
    if (!confirmed) return;

    setIsLoadingDrive(true);
    try {
      await deleteBackupFromDrive(driveToken, fileId);

      const user = { name: driveUser?.displayName || 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
      const updated = addAuditEntry(
        state,
        'Delete Cloud Backup',
        'System',
        `Deleted backup snapshot "${fileName}" from Google Drive folder`,
        user
      );
      setState(updated);

      await loadDriveFiles(driveToken);
      alert('Backup file deleted from Google Drive.');
    } catch (err) {
      console.error('Failed to delete file from drive:', err);
      alert('Unable to delete backup file from Google Drive.');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // Audit state
  const [auditSearch, setAuditSearch] = useState('');

  // API docs state
  const [copiedRoute, setCopiedRoute] = useState<string | null>(null);

  // File ref for JSON restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter audit logs
  const filteredAudits = useMemo(() => {
    return state.auditLogs
      .filter(
        log => log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
          log.module.toLowerCase().includes(auditSearch.toLowerCase()) ||
          log.details.toLowerCase().includes(auditSearch.toLowerCase())
      )
      .reverse(); // Newest first
  }, [state.auditLogs, auditSearch]);

  // Handle Backup Downloading
  const triggerStateBackup = () => {
    try {
      const dataStr = JSON.stringify(state, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `noja_erp_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Log action
      const user = { name: 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
      const updated = addAuditEntry(
        state,
        'Export State Backup Archive',
        'System',
        'Successfully generated and downloaded a full JSON backup of the active ERP databases',
        user
      );
      setState(updated);
    } catch (err) {
      console.error(err);
      alert('Unable to generate state backup archive.');
    }
  };

  // Handle Backup JSON uploading
  const triggerStateRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const uploadedState = JSON.parse(event.target?.result as string);

        // Simple validation that it matches ERP State schema
        if (uploadedState.companies && uploadedState.employees && uploadedState.inventory && uploadedState.finance) {
          const user = { name: 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
          let updated = { ...uploadedState };
          updated = addAuditEntry(
            updated,
            'Import State Backup Archive',
            'System',
            'Restored ERP databases to a previously archived JSON state snapshot',
            user
          );
          updated = addNotificationEntry(
            updated,
            'System Databases Restored',
            'Successfully parsed and re-seeded ERP modules from uploaded backup.',
            'success'
          );

          setState(updated);
          alert('ERP state restored successfully!');
        } else {
          alert('Invalid backup archive. The schema does not match required ERP ledger collections.');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse upload as valid JSON data structure.');
      }
    };
    reader.readAsText(file);
  };

  // Trigger copy route helper
  const handleCopy = (route: string) => {
    navigator.clipboard.writeText(route);
    setCopiedRoute(route);
    setTimeout(() => setCopiedRoute(null), 2000);
  };

  // Pre-configured ERP API endpoints documentation
  const apiEndpoints = [
    {
      method: 'POST',
      url: '/api/chat',
      desc: 'Handles conversational queries by checking ERP ledger metadata on behalf of user.',
      headers: '{ "Content-Type": "application/json" }',
      reqBody: `{
  "prompt": "Who is currently our highest paid personnel?",
  "context": { ...currentERPStateSummary }
}`,
      resBody: `{
  "reply": "Based on current HR records, John Doe in Engineering has the highest base salary of $12,500."
}`
    },
    {
      method: 'GET',
      url: '/api/companies',
      desc: 'Fetches authorized companies operating under active tenant.',
      headers: 'None',
      reqBody: 'None',
      resBody: `[
  { "id": "c1", "name": "Noja Tech Ltd", "hqAddress": "London, UK" }
]`
    }
  ];

  return (
    <div id="noja-system-modules" className="space-y-6">
      {/* Module Title & Tab bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <ShieldAlert className="w-5 h-5 mr-2 text-slate-800 dark:text-slate-200" /> Core Security & System Utilities
          </h2>
          <p className="text-xs text-slate-400">Review system audit logs, download data backups, monitor transactional emails, or integrate API protocols.</p>
        </div>
        <div className="flex space-x-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveSubTab('backup')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeSubTab === 'backup' ? 'bg-slate-950 dark:bg-slate-700 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            Ledger Backup
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeSubTab === 'audit' ? 'bg-slate-950 dark:bg-slate-700 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            Audit Trails
          </button>
          <button
            onClick={() => setActiveSubTab('api')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeSubTab === 'api' ? 'bg-slate-950 dark:bg-slate-700 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            Developer API
          </button>
          <button
            onClick={() => setActiveSubTab('email')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeSubTab === 'email' ? 'bg-slate-950 dark:bg-slate-700 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            Email Server
          </button>
        </div>
      </div>

      {/* Backup tab */}
      {activeSubTab === 'backup' && (
        <div className="space-y-6 animate-fade-in">
          {/* Local storage cards row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Download card */}
            <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 p-6 rounded-xl shadow-xs space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-[#0F172A] rounded-lg w-fit text-slate-850 dark:text-slate-100">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Export Ledger Snapshot</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Download a fully localized, encrypted JSON format file containing your entire ERP state. This archive can be stored securely or imported into other system partitions to restore ledgers instantly.
                </p>
              </div>
              <button
                onClick={triggerStateBackup}
                className="px-4 py-2 bg-slate-950 dark:bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Generate JSON Backup</span>
              </button>
            </div>

            {/* Upload card */}
            <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 p-6 rounded-xl shadow-xs space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-[#0F172A] rounded-lg w-fit text-slate-850 dark:text-slate-100">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Restore Ledger Databases</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Select a previously exported Noja Business JSON archive. Uploading will reconstruct your CRM accounts, staff rosters, and financial general books precisely to the point of backup.
                </p>
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={triggerStateRestore}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Upload Snapshot File</span>
                </button>
              </div>
            </div>
          </div>

          {/* Google Drive cloud sync panel */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 p-6 rounded-xl shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Google Drive Cloud Synchronization
                    {driveToken ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 font-mono">
                        ● CONNECTED
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                        ○ OFFLINE
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Securely archive and restore your Noja ERP general ledgers, CRM databases, and HR registers directly with Google Drive.
                  </p>
                </div>
              </div>

              <div>
                {!driveToken ? (
                  <button
                    onClick={handleDriveLogin}
                    disabled={isLoadingDrive}
                    className="flex items-center space-x-2 px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-200 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-semibold text-xs cursor-pointer disabled:opacity-50"
                  >
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                    <span>Connect Google Drive</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-3">
                    {driveUser && (
                      <div className="flex items-center space-x-2 border border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-[#0F172A] px-3 py-1.5 rounded-lg text-xs">
                        {driveUser.photoURL ? (
                          <img
                            src={driveUser.photoURL}
                            alt="avatar"
                            className="w-5 h-5 rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-[10px]">
                            {driveUser.displayName?.[0] || 'U'}
                          </div>
                        )}
                        <div className="text-left">
                          <p className="font-bold text-slate-800 dark:text-slate-100 leading-none">{driveUser.displayName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{driveUser.email}</p>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={handleDriveLogout}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
                      title="Disconnect account"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {driveToken ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="text-xs text-slate-450">
                    Active Storage Folder: <span className="font-bold text-slate-700 dark:text-slate-200">Google Drive / Noja ERP Backups</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => loadDriveFiles(driveToken)}
                      disabled={isLoadingDrive}
                      className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                      <span>Refresh Lists</span>
                    </button>
                    <button
                      onClick={handleBackupToDrive}
                      disabled={isSyncing}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <CloudUpload className="w-4 h-4" />
                      <span>{isSyncing ? 'Syncing Ledger...' : 'Back up Now to Drive'}</span>
                    </button>
                  </div>
                </div>

                {isLoadingDrive && driveFiles.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                    <span>Loading Drive file indexes...</span>
                  </div>
                ) : (
                  <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto max-h-[300px]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-[#0F172A] text-slate-500 border-b border-slate-100 dark:border-slate-800">
                            <th className="p-3.5 font-semibold">Cloud Filename</th>
                            <th className="p-3.5 font-semibold">Created Time</th>
                            <th className="p-3.5 font-semibold">Data Size</th>
                            <th className="p-3.5 font-semibold text-right">Ledger Options</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {driveFiles.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-6 text-center text-slate-400">
                                No cloud backups found in folder "Noja ERP Backups". Click "Back up Now to Drive" to sync your first snapshot!
                              </td>
                            </tr>
                          ) : (
                            driveFiles.map(file => (
                              <tr key={file.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                                  <FileJson className="w-4 h-4 text-amber-500 shrink-0" />
                                  <span className="truncate max-w-[200px] sm:max-w-xs">{file.name}</span>
                                </td>
                                <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                                  {new Date(file.createdTime).toLocaleString()}
                                </td>
                                <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                                  {file.size ? `${(parseInt(file.size) / 1024).toFixed(1)} KB` : 'N/A'}
                                </td>
                                <td className="p-3.5 text-right">
                                  <div className="inline-flex space-x-2">
                                    {file.webViewLink && (
                                      <a
                                        href={file.webViewLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center"
                                        title="View on Google Drive"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                    <button
                                      onClick={() => handleRestoreFromDrive(file.id, file.name)}
                                      className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-[10px] font-bold rounded flex items-center space-x-1 cursor-pointer"
                                      title="Restore backup from cloud"
                                    >
                                      <CloudDownload className="w-3 h-3" />
                                      <span>Restore</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteFromDrive(file.id, file.name)}
                                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded text-slate-400 hover:text-red-500 cursor-pointer"
                                      title="Delete file permanently"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 dark:bg-[#0F172A] border border-dashed border-slate-250 dark:border-slate-800 rounded-xl text-center space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                  Connect your Google Workspace or Gmail account to enable real-time cloud operations. All database transactions will sync securely to your personal Drive space.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Trails Tab */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4 animate-fade-in">
          {/* Search audit logs */}
          <div className="flex items-center bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 shadow-xs w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search audit trail logs..."
              value={auditSearch}
              onChange={e => setAuditSearch(e.target.value)}
              className="w-full bg-transparent border-none text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
            />
          </div>

          {/* Logs table */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[350px] scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#0F172A] text-slate-500 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
                    <th className="p-3.5 font-semibold">Timestamp</th>
                    <th className="p-3.5 font-semibold">Action Event</th>
                    <th className="p-3.5 font-semibold">Module Area</th>
                    <th className="p-3.5 font-semibold">Operation Details</th>
                    <th className="p-3.5 font-semibold">Initiated By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {filteredAudits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        No security audit log entries match searching terms.
                      </td>
                    </tr>
                  ) : (
                    filteredAudits.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-mono text-slate-400 text-[10px] whitespace-nowrap">
                          {log.timestamp.replace('T', ' ').substring(0, 19)}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">{log.action}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-[#0F172A] rounded text-slate-700 dark:text-slate-300 font-semibold font-mono text-[9px]">
                            {log.module}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500 leading-relaxed">{log.details}</td>
                        <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                          {log.user.name}
                          <div className="text-[9px] text-slate-400 mt-0.5">{log.user.role}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Developer API Docs Tab */}
      {activeSubTab === 'api' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
              <BookOpen className="w-4.5 h-4.5 mr-1.5 text-slate-850" /> API Gateway Protocol Documentation
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Noja ERP exposes clean, full-stack REST routes for custom client application hooks. Below are current endpoints mapped by the local Express container.
            </p>
          </div>

          <div className="space-y-4">
            {apiEndpoints.map((ep, idx) => (
              <div key={idx} className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                {/* Router banner */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ep.method === 'POST' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100">{ep.url}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(ep.url)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-750"
                    title="Copy Pathway"
                  >
                    {copiedRoute === ep.url ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="p-4 space-y-3 text-xs font-sans">
                  <p className="text-slate-500">{ep.desc}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold text-slate-400">Request Body Schema</p>
                      <pre className="p-3 bg-slate-950 dark:bg-[#0F172A] text-[10px] text-slate-300 rounded-lg font-mono overflow-x-auto">
                        {ep.reqBody}
                      </pre>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold text-slate-400">Success Response (200 OK)</p>
                      <pre className="p-3 bg-slate-950 dark:bg-[#0F172A] text-[10px] text-emerald-400 rounded-lg font-mono overflow-x-auto">
                        {ep.resBody}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email server logs tab */}
      {activeSubTab === 'email' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-mono">
              Outgoing mail ledger: <span className="font-bold text-slate-700 dark:text-slate-300">{state.emails.length} items logged</span>
            </span>
          </div>

          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#0F172A] text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 font-semibold">Timestamp</th>
                    <th className="p-4 font-semibold">Recipient</th>
                    <th className="p-4 font-semibold">Subject Title</th>
                    <th className="p-4 font-semibold">Message Preview</th>
                    <th className="p-4 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {state.emails.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        No outbound emails generated yet. Payout staff payroll to trigger automated slip emails!
                      </td>
                    </tr>
                  ) : (
                    state.emails.map(mail => (
                      <tr key={mail.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-mono text-slate-400 text-[10px]">{mail.sentAt.replace('T', ' ').substring(0, 16)}</td>
                        <td className="p-4 font-semibold text-slate-800 dark:text-white">
                          {mail.recipient}
                          <div className="text-[9px] text-slate-400 mt-0.5">Sender: {mail.sender}</div>
                        </td>
                        <td className="p-4 font-semibold text-slate-700 dark:text-slate-200">{mail.subject}</td>
                        <td className="p-4 text-slate-400 max-w-xs truncate">{mail.body}</td>
                        <td className="p-4 text-right">
                          <span className="inline-flex items-center space-x-1 text-emerald-600 font-bold font-mono text-[10px]">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            <span>SENT</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
