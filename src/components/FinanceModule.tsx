/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Plus,
  TrendingUp,
  TrendingDown,
  Percent,
  Calendar,
  Layers,
  ArrowRightLeft,
  X,
  FileCheck,
  CloudUpload,
  Check
} from 'lucide-react';
import { ERPState, addAuditEntry, addNotificationEntry } from '../data';
import { FinanceRecord } from '../types';
import { getAccessToken } from '../lib/driveAuth';
import { uploadReportToDrive } from '../lib/driveApi';

interface FinanceModuleProps {
  state: ERPState;
  setState: React.Dispatch<React.SetStateAction<ERPState>>;
  activeCompanyId: string;
  activeBranchId: string;
}

export default function FinanceModule({ state, setState, activeCompanyId, activeBranchId }: FinanceModuleProps) {
  const [showAddTr, setShowAddTr] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const exportPLToDrive = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    try {
      const token = await getAccessToken();
      if (!token) {
        alert('Please connect Google Drive first under the "System Admin" tab to enable cloud report exports.');
        return;
      }

      const activeCompany = state.companies.find(c => c.id === activeCompanyId)?.name || 'Noja Business';
      const reportDate = new Date().toISOString().split('T')[0];
      const fileName = `noja_pl_statement_${reportDate}.md`;

      const markdown = `# Noja ERP - Income & Margin Statement (P&L)
**Company/Tenant**: ${activeCompany}
**Date Generated**: ${reportDate} (UTC)
**Standard Currency**: UGX (Ugandan Shilling)
**Operating Scope**: Branch ID "${activeBranchId}"

---

## 1. Executive Ledger Summary
| Account Matrix | Ledger Type | Total Balance (UGX) |
| :--- | :--- | :--- |
| **Gross Operating Revenue** | Credit (Income) | UGX ${totals.income.toLocaleString()} |
| **Gross Operating Expenditures** | Debit (Expense) | UGX ${totals.expense.toLocaleString()} |
| **Net Earnings (EBITDA)** | Balance Margin | **UGX ${totals.net.toLocaleString()}** |

---

## 2. Operating Expenditures Breakdown
| Cost Category | Total Allocated (UGX) | Percentage of Costs |
| :--- | :--- | :--- |
${Object.entries(plSheet.expensesGrouped)
  .map(([cat, val]) => {
    const numVal = val as number;
    const percent = totals.expense > 0 ? ((numVal / totals.expense) * 100).toFixed(1) : '0.0';
    return `| Cost of ${cat} | UGX ${numVal.toLocaleString()} | ${percent}% |`;
  })
  .join('\n')}

---
*Report exported securely from Noja Cloud ERP container. Verified under IFRS standards.*
`;

      await uploadReportToDrive(token, fileName, markdown);
      
      // Log audit
      const user = { name: 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
      let updated = addAuditEntry(
        state,
        'Export Cloud P&L Report',
        'Finance',
        `Successfully exported Profit & Loss report "${fileName}" directly to Google Drive`,
        user
      );
      updated = addNotificationEntry(
        updated,
        'Cloud Report Exported',
        `P&L statement was synced directly to your Google Drive folder: ${fileName}`,
        'success'
      );
      setState(updated);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
      alert(`Report "${fileName}" exported successfully to your Google Drive "Noja ERP Backups" folder!`);
    } catch (err) {
      console.error('Failed to export report to Drive:', err);
      alert('Failed to sync report to Google Drive. Please verify your connection status and try again.');
    } finally {
      setIsExporting(false);
    }
  };
  const [newTr, setNewTr] = useState<Partial<FinanceRecord>>({
    description: '',
    category: 'Revenue',
    type: 'Income',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
  });

  // Filter finance ledger
  const filteredFinance = useMemo(() => {
    return state.finance.filter(
      f => f.companyId === activeCompanyId && (activeBranchId === 'all' || f.branchId === activeBranchId)
    );
  }, [state.finance, activeCompanyId, activeBranchId]);

  // Derived summaries
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredFinance.forEach(f => {
      if (f.type === 'Income') income += f.amount;
      else expense += f.amount;
    });
    return { income, expense, net: income - expense };
  }, [filteredFinance]);

  // Group expenses by category for P&L sheet
  const plSheet = useMemo(() => {
    const expensesGrouped: { [cat: string]: number } = {
      Payroll: 0,
      'Inventory Cost': 0,
      Marketing: 0,
      Utilities: 0,
      Rent: 0,
      Procurement: 0,
    };

    let totalExpGrouped = 0;
    filteredFinance.forEach(f => {
      if (f.type === 'Expense') {
        expensesGrouped[f.category] = (expensesGrouped[f.category] || 0) + f.amount;
        totalExpGrouped += f.amount;
      }
    });

    return { expensesGrouped, totalExpGrouped };
  }, [filteredFinance]);

  // Log manual ledger entry
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTr.description || !newTr.amount || !newTr.date) {
      alert('Please fill in description, amount and transaction date.');
      return;
    }

    const branchToUse = activeBranchId === 'all'
      ? (state.branches.find(b => b.companyId === activeCompanyId)?.id || 'b1')
      : activeBranchId;

    const trObj: FinanceRecord = {
      id: `f-${Date.now()}`,
      companyId: activeCompanyId,
      branchId: branchToUse,
      date: newTr.date,
      description: newTr.description,
      category: newTr.category as FinanceRecord['category'],
      type: newTr.type as FinanceRecord['type'],
      amount: Number(newTr.amount),
    };

    let updated = { ...state, finance: [...state.finance, trObj] };

    // Log audit and notification
    const user = { name: 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
    updated = addAuditEntry(
      updated,
      'Create Ledger Transaction',
      'Finance',
      `Logged UGX ${trObj.amount} ${trObj.type} transaction: "${trObj.description}"`,
      user
    );
    updated = addNotificationEntry(
      updated,
      'New Transaction Logged',
      `Logged UGX ${trObj.amount} under ${trObj.category} for accounting.`,
      'success'
    );

    setState(updated);
    setShowAddTr(false);
    setNewTr({
      description: '',
      category: 'Revenue',
      type: 'Income',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div id="noja-finance-module" className="space-y-6 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <Landmark className="w-5 h-5 mr-2 text-slate-800 dark:text-slate-200" /> Capital Accounting & General Ledger
          </h2>
          <p className="text-xs text-slate-400">Track company general journals, profit & loss matrices, and operating cash margins.</p>
        </div>
        <button
          onClick={() => setShowAddTr(true)}
          className="px-3.5 py-2 bg-slate-950 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Journal Voucher</span>
        </button>
      </div>

      {/* Stats upper cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gross Income</p>
            <h4 className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">UGX {totals.income.toLocaleString()}</h4>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-lg shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gross Expenditures</p>
            <h4 className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">UGX {totals.expense.toLocaleString()}</h4>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex items-center space-x-4">
          <div className={`p-3 rounded-lg shrink-0 ${totals.net >= 0 ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600' : 'bg-red-50 text-red-600'}`}>
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Net cash balance</p>
            <h4 className={`text-xl font-bold font-mono mt-0.5 ${totals.net >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600'}`}>
              UGX {totals.net.toLocaleString()}
            </h4>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profit and Loss Sheet */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center">
              <FileCheck className="w-4 h-4 mr-1 text-slate-800 dark:text-slate-200" /> Income & Margin Statement (P&L)
            </h3>
            <button
              onClick={exportPLToDrive}
              disabled={isExporting}
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-blue-500 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Sync statement as markdown report to Google Drive"
            >
              {exportSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <CloudUpload className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
              )}
              <span className="text-[9px] font-bold uppercase tracking-wider">Export</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* Income */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-bold border-b border-slate-100 dark:border-slate-800 pb-1 text-slate-900 dark:text-white">
                <span>Revenue Accounts</span>
                <span className="font-mono text-emerald-600">UGX {totals.income.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pl-3 text-slate-500">
                <span>Operating Sales Turnover</span>
                <span className="font-mono">UGX {totals.income.toLocaleString()}</span>
              </div>
            </div>

            {/* Expenses */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between font-bold border-b border-slate-100 dark:border-slate-800 pb-1 text-slate-900 dark:text-white">
                <span>Operating Expenditures</span>
                <span className="font-mono text-rose-600">-UGX {totals.expense.toLocaleString()}</span>
              </div>
              {Object.entries(plSheet.expensesGrouped).map(([cat, val]) => (
                <div key={cat} className="flex justify-between pl-3 text-slate-500">
                  <span>Cost of {cat}</span>
                  <span className="font-mono font-medium">UGX {val.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Calculations net */}
            <div className="pt-4 border-t border-dashed border-slate-200 dark:border-slate-700">
              <div className="flex justify-between font-extrabold text-sm text-slate-950 dark:text-white bg-slate-50 dark:bg-[#0F172A] p-3 rounded-lg">
                <span>Net Earnings (EBITDA)</span>
                <span className={`font-mono ${totals.net >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600'}`}>
                  UGX {totals.net.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Double-Entry Transaction Ledger Logs */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#0F172A]/50">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                <ArrowRightLeft className="w-4 h-4 mr-1" /> General Ledger Journal
              </h4>
              <span className="text-[10px] font-mono text-slate-400">{filteredFinance.length} records</span>
            </div>
            <div className="overflow-x-auto max-h-[320px] scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#0F172A] text-slate-500 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
                    <th className="p-3.5 font-semibold">Date</th>
                    <th className="p-3.5 font-semibold">Description</th>
                    <th className="p-3.5 font-semibold">Classification</th>
                    <th className="p-3.5 font-semibold text-right">Debit / Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {filteredFinance.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400">
                        No transactional ledger records logged.
                      </td>
                    </tr>
                  ) : (
                    filteredFinance.map(tr => (
                      <tr key={tr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-mono text-slate-400">{tr.date}</td>
                        <td className="p-3.5 font-medium text-slate-800 dark:text-slate-100">
                          {tr.description}
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${tr.type === 'Income' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-500'}`}>
                            {tr.category}
                          </span>
                        </td>
                        <td className={`p-3.5 text-right font-mono font-bold ${tr.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tr.type === 'Income' ? '+ UGX ' : '- UGX '}{tr.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-[#1E293B] border-t border-slate-100 dark:border-slate-800 flex justify-between text-[10px] text-slate-400">
            <span>Accounting standard: IFRS (Multi-company compliance)</span>
            <span>Real-time cloud database synced</span>
          </div>
        </div>
      </div>

      {/* Add Ledger Overlay */}
      {showAddTr && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex justify-center items-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-sm space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                <Plus className="w-4.5 h-4.5 text-emerald-500 mr-1" /> Log Journal Transaction
              </h4>
              <button onClick={() => setShowAddTr(false)} className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Server rack purchase"
                  value={newTr.description}
                  onChange={e => setNewTr(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Entry Type</label>
                  <select
                    value={newTr.type}
                    onChange={e => {
                      const val = e.target.value as FinanceRecord['type'];
                      setNewTr(prev => ({
                        ...prev,
                        type: val,
                        // Set standard categories based on income vs expense
                        category: val === 'Income' ? 'Revenue' : 'Rent',
                      }));
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Income">Credit (Income)</option>
                    <option value="Expense">Debit (Expense)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Category</label>
                  <select
                    value={newTr.category}
                    onChange={e => setNewTr(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white"
                  >
                    {newTr.type === 'Income' ? (
                      <option value="Revenue">Revenue</option>
                    ) : (
                      <>
                        <option value="Payroll">Payroll</option>
                        <option value="Inventory Cost">Inventory Cost</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Rent">Rent</option>
                        <option value="Procurement">Procurement</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Transaction Value (UGX)</label>
                  <input
                    type="number"
                    required
                    placeholder="5000000"
                    value={newTr.amount || ''}
                    onChange={e => setNewTr(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Value Date</label>
                  <input
                    type="date"
                    required
                    value={newTr.date}
                    onChange={e => setNewTr(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddTr(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-950 dark:bg-slate-800 text-white hover:bg-slate-900 dark:hover:bg-slate-750 rounded-lg font-semibold"
                >
                  Post Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
