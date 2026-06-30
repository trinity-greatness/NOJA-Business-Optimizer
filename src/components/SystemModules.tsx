/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
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
  Play
} from 'lucide-react';
import { ERPState, addAuditEntry, addNotificationEntry } from '../data';

interface SystemModulesProps {
  state: ERPState;
  setState: React.Dispatch<React.SetStateAction<ERPState>>;
  activeCompanyId: string;
}

export default function SystemModules({ state, setState, activeCompanyId }: SystemModulesProps) {
  const [activeSubTab, setActiveSubTab] = useState<'backup' | 'audit' | 'api' | 'email'>('backup');

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
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
              className="px-4 py-2 bg-slate-950 dark:bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all shadow-xs"
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
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Upload Snapshot File</span>
              </button>
            </div>
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
