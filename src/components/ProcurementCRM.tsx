/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Compass,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Briefcase,
  AlertCircle,
  CheckCircle,
  X,
  UserCheck,
  ShoppingBag
} from 'lucide-react';
import { ERPState, addAuditEntry, addNotificationEntry } from '../data';
import { ProcurementOrder, CRMLead, SalesRecord } from '../types';

interface ProcurementCRMProps {
  state: ERPState;
  setState: React.Dispatch<React.SetStateAction<ERPState>>;
  activeCompanyId: string;
  activeBranchId: string;
}

export default function ProcurementCRM({ state, setState, activeCompanyId, activeBranchId }: ProcurementCRMProps) {
  const [activeSubTab, setActiveSubTab] = useState<'crm' | 'procurement'>('crm');

  // CRM state
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState<Partial<CRMLead>>({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    status: 'New',
    value: 5000,
    notes: '',
  });

  // Procurement state
  const [showAddPo, setShowAddPo] = useState(false);
  const [newPo, setNewPo] = useState<Partial<ProcurementOrder>>({
    itemName: '',
    category: 'Hardware',
    quantity: 1,
    estimatedCost: 500,
    supplier: '',
  });

  // Filters
  const filteredLeads = useMemo(() => {
    return state.crmLeads.filter(
      l => l.companyId === activeCompanyId && (activeBranchId === 'all' || l.branchId === activeBranchId)
    );
  }, [state.crmLeads, activeCompanyId, activeBranchId]);

  const filteredProcurement = useMemo(() => {
    return state.procurement.filter(
      p => p.companyId === activeCompanyId && (activeBranchId === 'all' || p.branchId === activeBranchId)
    );
  }, [state.procurement, activeCompanyId, activeBranchId]);

  // Summaries
  const crmSummary = useMemo(() => {
    let totalValue = 0;
    let wonValue = 0;
    filteredLeads.forEach(l => {
      totalValue += l.value;
      if (l.status === 'Won') wonValue += l.value;
    });
    return { totalValue, wonValue, count: filteredLeads.length };
  }, [filteredLeads]);

  // CRM actions
  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name || !newLead.companyName || !newLead.value) {
      alert('Please fill in lead contact name, organization, and deal value.');
      return;
    }

    const branchToUse = activeBranchId === 'all'
      ? (state.branches.find(b => b.companyId === activeCompanyId)?.id || 'b1')
      : activeBranchId;

    const leadObj: CRMLead = {
      id: `crm-${Date.now()}`,
      companyId: activeCompanyId,
      branchId: branchToUse,
      name: newLead.name,
      companyName: newLead.companyName,
      email: newLead.email || 'info@partner.com',
      phone: newLead.phone || '',
      status: newLead.status as CRMLead['status'],
      value: Number(newLead.value),
      notes: newLead.notes || '',
      updatedAt: new Date().toISOString().split('T')[0],
    };

    let updated = { ...state, crmLeads: [...state.crmLeads, leadObj] };

    // Audit and Notification
    const user = { name: 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
    updated = addAuditEntry(
      updated,
      'Add CRM Sales Lead',
      'CRM',
      `Registered sales lead "${leadObj.name}" of "${leadObj.companyName}" valued at UGX ${leadObj.value}`,
      user
    );
    updated = addNotificationEntry(
      updated,
      'Sales Lead Registered',
      `Added lead "${leadObj.name}" to deal pipelines under status: "${leadObj.status}".`,
      'success'
    );

    setState(updated);
    setShowAddLead(false);
    setNewLead({
      name: '',
      companyName: '',
      email: '',
      phone: '',
      status: 'New',
      value: 5000,
      notes: '',
    });
  };

  const updateLeadStatus = (leadId: string, newStatus: CRMLead['status']) => {
    const updatedLeads = state.crmLeads.map(l => {
      if (l.id === leadId) {
        return { ...l, status: newStatus, updatedAt: new Date().toISOString().split('T')[0] };
      }
      return l;
    });

    let updated = { ...state, crmLeads: updatedLeads };

    const lead = state.crmLeads.find(l => l.id === leadId);
    if (lead) {
      const user = { name: 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
      updated = addAuditEntry(
        updated,
        'Update Lead Stage',
        'CRM',
        `Moved deal state of "${lead.companyName}" to "${newStatus}"`,
        user
      );

      // If Won, trigger notification and mock sales revenue automatically!
      if (newStatus === 'Won') {
        const salesItem: SalesRecord = {
          id: `sal-auto-${Date.now()}`,
          companyId: activeCompanyId,
          branchId: lead.branchId,
          customerName: lead.companyName,
          date: new Date().toISOString().split('T')[0],
          items: [{ itemName: `Enterprise Solution Delivery (${lead.name})`, quantity: 1, price: lead.value }],
          totalAmount: lead.value,
          status: 'Completed',
        };

        const financeItem = {
          id: `f-sale-${salesItem.id}`,
          companyId: activeCompanyId,
          branchId: lead.branchId,
          date: new Date().toISOString().split('T')[0],
          description: `Contract Won - ${lead.companyName} Delivery`,
          category: 'Revenue' as const,
          type: 'Income' as const,
          amount: lead.value,
          referenceId: salesItem.id,
        };

        updated.sales = [...updated.sales, salesItem];
        updated.finance = [...updated.finance, financeItem];

        updated = addNotificationEntry(
          updated,
          'Contract Deal Won!',
          `Sales pipeline won! Created UGX ${lead.value} invoice contract under credit revenues.`,
          'success'
        );
      }
    }

    setState(updated);
  };

  // Procurement actions
  const handleAddProcurement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPo.itemName || !newPo.estimatedCost || !newPo.supplier) {
      alert('Please fill in required item description, cost, and vendor.');
      return;
    }

    const branchToUse = activeBranchId === 'all'
      ? (state.branches.find(b => b.companyId === activeCompanyId)?.id || 'b1')
      : activeBranchId;

    const poObj: ProcurementOrder = {
      id: `po-${Date.now().toString().substring(10)}`,
      companyId: activeCompanyId,
      branchId: branchToUse,
      itemName: newPo.itemName,
      category: newPo.category || 'Hardware',
      quantity: Number(newPo.quantity) || 1,
      estimatedCost: Number(newPo.estimatedCost),
      supplier: newPo.supplier,
      status: 'Pending Approval',
      requestedBy: 'Malotrinax (Administrator)',
      createdAt: new Date().toISOString().split('T')[0],
    };

    let updated = { ...state, procurement: [...state.procurement, poObj] };

    // Audit and Notification
    const user = { name: 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
    updated = addAuditEntry(
      updated,
      'Submit Requisition PO',
      'Procurement',
      `Submitted purchase requisition for "${poObj.itemName}" at estimated cost: UGX ${poObj.estimatedCost}`,
      user
    );

    setState(updated);
    setShowAddPo(false);
    setNewPo({
      itemName: '',
      category: 'Hardware',
      quantity: 1,
      estimatedCost: 500,
      supplier: '',
    });
  };

  const setPoStatus = (poId: string, action: 'Approved' | 'Received' | 'Rejected') => {
    const updatedPo = state.procurement.map(po => {
      if (po.id === poId) {
        return { ...po, status: action };
      }
      return po;
    });

    let updated = { ...state, procurement: updatedPo };

    const targetPo = state.procurement.find(p => p.id === poId);

    if (targetPo) {
      const user = { name: 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
      updated = addAuditEntry(
        updated,
        'Process PO Authorization',
        'Procurement',
        `Authorization changed on PO ${poId} to "${action}"`,
        user
      );

      // If Approved, trigger a debit expense on the Finance Ledger automatically!
      if (action === 'Approved') {
        const financeItem = {
          id: `f-po-${targetPo.id}`,
          companyId: activeCompanyId,
          branchId: targetPo.branchId,
          date: new Date().toISOString().split('T')[0],
          description: `Procurement Release - PO#${targetPo.id}: ${targetPo.itemName}`,
          category: 'Procurement' as const,
          type: 'Expense' as const,
          amount: targetPo.estimatedCost * targetPo.quantity,
          referenceId: targetPo.id,
        };

        updated.finance = [...updated.finance, financeItem];

        updated = addNotificationEntry(
          updated,
          'Purchase Order Approved',
          `PO#${targetPo.id} has been released. Debit of $${financeItem.amount} added to general expenses.`,
          'info'
        );
      }
    }

    setState(updated);
  };

  return (
    <div id="noja-procure-crm-module" className="space-y-6">
      {/* Module Title & Tab bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <Compass className="w-5 h-5 mr-2 text-slate-800 dark:text-slate-200" /> Commercial pipelines & Procurement
          </h2>
          <p className="text-xs text-slate-400">Track CRM customer funnels, convert qualified leads, and authorize purchase order requests.</p>
        </div>
        <div className="flex space-x-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveSubTab('crm')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeSubTab === 'crm' ? 'bg-slate-950 dark:bg-slate-700 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            CRM Customer Funnels
          </button>
          <button
            onClick={() => setActiveSubTab('procurement')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeSubTab === 'procurement' ? 'bg-slate-950 dark:bg-slate-700 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            Procurement Requisitions
          </button>
        </div>
      </div>

      {/* CRM Customer Funnels Tab */}
      {activeSubTab === 'crm' && (
        <div className="space-y-4 animate-fade-in">
          {/* Summary stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Deal Pipeline</p>
                <h4 className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">${crmSummary.totalValue.toLocaleString()}</h4>
              </div>
              <span className="text-xs text-slate-500 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-2 py-1 rounded-lg">
                {crmSummary.count} Deals
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Revenue Converted (Won)</p>
                <h4 className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">${crmSummary.wonValue.toLocaleString()}</h4>
              </div>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Lead Win Ratio</p>
                <h4 className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                  {crmSummary.totalValue > 0 ? ((crmSummary.wonValue / crmSummary.totalValue) * 100).toFixed(1) : '0.0'}%
                </h4>
              </div>
              <button
                onClick={() => setShowAddLead(true)}
                className="px-3.5 py-1.5 bg-slate-950 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Deal</span>
              </button>
            </div>
          </div>

          {/* Leads table */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#0F172A] text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 font-semibold">Contact Person</th>
                    <th className="p-4 font-semibold">Organization</th>
                    <th className="p-4 font-semibold">Deal Value</th>
                    <th className="p-4 font-semibold">Stage Status</th>
                    <th className="p-4 font-semibold">Internal Notes</th>
                    <th className="p-4 font-semibold text-right">Funnels Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No active CRM leads logged for this franchise branch.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map(lead => (
                      <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">
                          {lead.name}
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{lead.email}</div>
                        </td>
                        <td className="p-4 font-medium text-slate-700 dark:text-slate-300">{lead.companyName}</td>
                        <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-100">UGX {lead.value.toLocaleString()}</td>
                        <td className="p-4">
                          <select
                            value={lead.status}
                            onChange={e => updateLeadStatus(lead.id, e.target.value as CRMLead['status'])}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold focus:outline-none border-none bg-slate-100 dark:bg-slate-800 ${lead.status === 'Won' ? 'text-emerald-600 dark:text-emerald-400' : lead.status === 'Lost' ? 'text-rose-500' : 'text-slate-600'}`}
                          >
                            <option value="New">New</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Qualified">Qualified</option>
                            <option value="Proposal Sent">Proposal Sent</option>
                            <option value="Won">Won (Delivered)</option>
                            <option value="Lost">Lost</option>
                          </select>
                        </td>
                        <td className="p-4 text-slate-400 truncate max-w-[180px]">{lead.notes || 'N/A'}</td>
                        <td className="p-4 text-right">
                          <div className="inline-flex space-x-1.5">
                            {lead.status !== 'Won' && (
                              <button
                                onClick={() => updateLeadStatus(lead.id, 'Won')}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold text-[10px]"
                              >
                                Mark Won
                              </button>
                            )}
                          </div>
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

      {/* Procurement Tab */}
      {activeSubTab === 'procurement' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-mono">
              Requisition registry: <span className="font-bold text-slate-700 dark:text-slate-300">{filteredProcurement.length} PO entries</span>
            </span>
            <button
              onClick={() => setShowAddPo(true)}
              className="px-3.5 py-2 bg-slate-950 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Raise PO Requisition</span>
            </button>
          </div>

          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#0F172A] text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 font-semibold">PO # ID</th>
                    <th className="p-4 font-semibold">Item & Category</th>
                    <th className="p-4 font-semibold">Supplier Vendor</th>
                    <th className="p-4 font-semibold">Requisition Cost</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Requested By</th>
                    <th className="p-4 font-semibold text-right">Approval Gates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {filteredProcurement.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No active purchase order requisitions raised under branch.
                      </td>
                    </tr>
                  ) : (
                    filteredProcurement.map(po => {
                      const totalCost = po.estimatedCost * po.quantity;
                      return (
                        <tr key={po.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-400">#{po.id}</td>
                          <td className="p-4">
                            <h5 className="font-semibold text-slate-900 dark:text-white">{po.itemName}</h5>
                            <p className="text-[10px] text-slate-400 mt-0.5">{po.category}</p>
                          </td>
                          <td className="p-4 text-slate-500 font-medium">{po.supplier}</td>
                          <td className="p-4 font-mono">
                            <div className="font-bold text-slate-800 dark:text-slate-200">${totalCost.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Qty: {po.quantity} @ ${po.estimatedCost} ea</div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${po.status === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : po.status === 'Rejected' ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-600'}`}>
                              {po.status}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400">{po.requestedBy}</td>
                          <td className="p-4 text-right">
                            {po.status === 'Pending Approval' ? (
                              <div className="inline-flex space-x-1.5">
                                <button
                                  onClick={() => setPoStatus(po.id, 'Approved')}
                                  className="px-2.5 py-1.5 bg-slate-950 text-white rounded text-[10px] font-bold hover:bg-slate-800"
                                >
                                  Release PO
                                </button>
                                <button
                                  onClick={() => setPoStatus(po.id, 'Rejected')}
                                  className="px-2.5 py-1.5 border border-slate-200 text-slate-600 rounded text-[10px] font-semibold hover:bg-slate-50"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-mono font-bold text-slate-300">Authorized</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead slideover modal */}
      {showAddLead && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex justify-center items-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-md space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                <Plus className="w-4.5 h-4.5 text-emerald-500 mr-1" /> Add Sales Deal Pipeline
              </h4>
              <button onClick={() => setShowAddLead(false)} className="p-1 hover:bg-slate-50 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddLead} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Contact Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Robert Vance"
                    value={newLead.name}
                    onChange={e => setNewLead(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Company Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vance Refrigeration"
                    value={newLead.companyName}
                    onChange={e => setNewLead(prev => ({ ...prev, companyName: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Email Contact</label>
                  <input
                    type="email"
                    placeholder="bob@vanceref.com"
                    value={newLead.email}
                    onChange={e => setNewLead(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Deal Value (UGX)</label>
                  <input
                    type="number"
                    required
                    placeholder="10000"
                    value={newLead.value || ''}
                    onChange={e => setNewLead(prev => ({ ...prev, value: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Funnels Stage</label>
                <select
                  value={newLead.status}
                  onChange={e => setNewLead(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="New">New Lead</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Proposal Sent">Proposal Sent</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Pipeline Notes & Strategy</label>
                <textarea
                  placeholder="Inquired about standard consulting. Intends to migrate regional server node structures."
                  value={newLead.notes}
                  onChange={e => setNewLead(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white h-20"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddLead(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-950 dark:bg-slate-800 text-white hover:bg-slate-900 dark:hover:bg-slate-750 rounded-lg font-semibold"
                >
                  Create Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add PO Requisition Modal */}
      {showAddPo && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex justify-center items-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-md space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                <Plus className="w-4.5 h-4.5 text-emerald-500 mr-1" /> Raise Procurement PO
              </h4>
              <button onClick={() => setShowAddPo(false)} className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddProcurement} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Item Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High-performance computing nodes"
                  value={newPo.itemName}
                  onChange={e => setNewPo(prev => ({ ...prev, itemName: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Class Category</label>
                  <select
                    value={newPo.category}
                    onChange={e => setNewPo(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Office Hardware">Office Hardware</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Supplies">Supplies</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Supplier Vendor</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cisco Distributors"
                    value={newPo.supplier}
                    onChange={e => setNewPo(prev => ({ ...prev, supplier: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Unit Quantity</label>
                  <input
                    type="number"
                    required
                    value={newPo.quantity}
                    onChange={e => setNewPo(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Estimated Unit Cost (UGX)</label>
                  <input
                    type="number"
                    required
                    value={newPo.estimatedCost}
                    onChange={e => setNewPo(prev => ({ ...prev, estimatedCost: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddPo(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-950 dark:bg-slate-800 text-white hover:bg-slate-900 dark:hover:bg-slate-750 rounded-lg font-semibold"
                >
                  Raise Requisition PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
