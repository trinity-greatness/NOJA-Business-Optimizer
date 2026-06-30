/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  DollarSign,
  Plus,
  Briefcase,
  Calendar,
  Layers,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Printer,
  Trash2,
  Mail
} from 'lucide-react';
import { ERPState, addAuditEntry, addNotificationEntry } from '../data';
import { Employee, PayrollRecord } from '../types';

interface HRAndPayrollProps {
  state: ERPState;
  setState: React.Dispatch<React.SetStateAction<ERPState>>;
  activeCompanyId: string;
  activeBranchId: string;
}

export default function HRAndPayroll({ state, setState, activeCompanyId, activeBranchId }: HRAndPayrollProps) {
  // Navigation tabs for the module
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'payroll'>('directory');

  // Employee states
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [newEmp, setNewEmp] = useState<Partial<Employee>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: 'Engineering',
    role: '',
    baseSalary: 3000,
  });

  // Payroll states
  const [selectedMonth, setSelectedMonth] = useState('June 2026');
  const [activePaySlip, setActivePaySlip] = useState<PayrollRecord | null>(null);
  const [salaryAdjustments, setSalaryAdjustments] = useState<{
    [empId: string]: { allowances: number; deductions: number };
  }>({});

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return state.employees.filter(
      emp => emp.companyId === activeCompanyId && (activeBranchId === 'all' || emp.branchId === activeBranchId)
    );
  }, [state.employees, activeCompanyId, activeBranchId]);

  // Filter payroll records for active month
  const activePayrolls = useMemo(() => {
    const empIds = new Set(filteredEmployees.map(e => e.id));
    return state.payrolls.filter(p => p.month === selectedMonth && empIds.has(p.employeeId));
  }, [state.payrolls, filteredEmployees, selectedMonth]);

  // Handle employee addition
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.firstName || !newEmp.lastName || !newEmp.email || !newEmp.role || !newEmp.baseSalary) {
      alert('Please fill in all required employee details.');
      return;
    }

    const branchToUse = activeBranchId === 'all'
      ? (state.branches.find(b => b.companyId === activeCompanyId)?.id || 'b1')
      : activeBranchId;

    const empObj: Employee = {
      id: `emp-${Date.now()}`,
      companyId: activeCompanyId,
      branchId: branchToUse,
      firstName: newEmp.firstName,
      lastName: newEmp.lastName,
      email: newEmp.email,
      phone: newEmp.phone || '+44 0000 0000',
      department: newEmp.department as Employee['department'],
      role: newEmp.role,
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      baseSalary: Number(newEmp.baseSalary),
    };

    let updated = { ...state, employees: [...state.employees, empObj] };

    // Trigger Audit Log and Notification
    const user = { name: 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
    updated = addAuditEntry(
      updated,
      'Create Employee Record',
      'HR',
      `Registered employee ${empObj.firstName} ${empObj.lastName} to ${empObj.department}`,
      user
    );
    updated = addNotificationEntry(
      updated,
      'New Employee Onboarded',
      `Registered employee ${empObj.firstName} ${empObj.lastName} under department ${empObj.department}.`,
      'success'
    );

    setState(updated);
    setShowAddEmp(false);
    setNewEmp({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: 'Engineering',
      role: '',
      baseSalary: 3000,
    });
  };

  // Delete employee
  const handleDeleteEmployee = (id: string, name: string) => {
    const updatedEmployees = state.employees.filter(e => e.id !== id);
    let updated = { ...state, employees: updatedEmployees };

    const user = { name: 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
    updated = addAuditEntry(
      updated,
      'Delete Employee Record',
      'HR',
      `Removed employee ${name} from ledger`,
      user
    );

    setState(updated);
  };

  // Change employee status
  const handleUpdateStatus = (id: string, newStatus: Employee['status']) => {
    const updatedEmployees = state.employees.map(e => {
      if (e.id === id) {
        return { ...e, status: newStatus };
      }
      return e;
    });

    let updated = { ...state, employees: updatedEmployees };
    const emp = state.employees.find(e => e.id === id);
    const user = { name: 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
    updated = addAuditEntry(
      updated,
      'Update Employee Status',
      'HR',
      `Updated status of ${emp?.firstName} ${emp?.lastName} to "${newStatus}"`,
      user
    );

    setState(updated);
  };

  // Run payroll engine for the active company
  const runPayrollEngine = () => {
    const freshPayrolls: PayrollRecord[] = [];

    filteredEmployees.forEach(emp => {
      // Skip terminated or inactive if needed, let's process for active ones
      if (emp.status === 'Terminated') return;

      const adjustments = salaryAdjustments[emp.id] || { allowances: 0, deductions: 0 };
      const allowances = adjustments.allowances;
      const deductions = adjustments.deductions || Math.round(emp.baseSalary * 0.15); // Default 15% taxes/deductions

      const netSalary = emp.baseSalary + allowances - deductions;

      freshPayrolls.push({
        id: `pay-${emp.id}-${selectedMonth.replace(/\s+/g, '')}`,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        month: selectedMonth,
        baseSalary: emp.baseSalary,
        allowances,
        deductions,
        netSalary,
        status: 'Draft',
      });
    });

    // Remove old drafts for the month and add new ones
    const filteredGlobalPayrolls = state.payrolls.filter(
      p => !(p.month === selectedMonth && filteredEmployees.some(e => e.id === p.employeeId))
    );

    let updated = { ...state, payrolls: [...filteredGlobalPayrolls, ...freshPayrolls] };

    const user = { name: 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
    updated = addAuditEntry(
      updated,
      'Run Payroll Batch Calculations',
      'Payroll',
      `Computed salary sheets for month ${selectedMonth} (${freshPayrolls.length} entries)`,
      user
    );
    updated = addNotificationEntry(
      updated,
      'Salary Sheets Recomputed',
      `Calculated payroll parameters for month ${selectedMonth}. Review in Draft section.`,
      'info'
    );

    setState(updated);
  };

  // Adjust payroll single row
  const updateAdjustment = (empId: string, field: 'allowances' | 'deductions', value: number) => {
    setSalaryAdjustments(prev => {
      const existing = prev[empId] || { allowances: 0, deductions: 0 };
      return {
        ...prev,
        [empId]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  // Change single payroll status (Approved / Paid)
  const setPayrollRecordStatus = (payId: string, newStatus: PayrollRecord['status']) => {
    const updatedPayrolls = state.payrolls.map(p => {
      if (p.id === payId) {
        const paymentDate = newStatus === 'Paid' ? new Date().toISOString().split('T')[0] : undefined;
        return { ...p, status: newStatus, paymentDate };
      }
      return p;
    });

    let updated = { ...state, payrolls: updatedPayrolls };

    const targetPay = state.payrolls.find(p => p.id === payId);

    // If marked as Paid, trigger a mock Finance expense ledger item and a trigger to simulated email system!
    if (newStatus === 'Paid' && targetPay) {
      const financeItem = {
        id: `f-pay-${targetPay.id}`,
        companyId: activeCompanyId,
        branchId: activeBranchId === 'all' ? (state.branches.find(b => b.companyId === activeCompanyId)?.id || 'b1') : activeBranchId,
        date: new Date().toISOString().split('T')[0],
        description: `Salary payout to ${targetPay.employeeName} (${targetPay.month})`,
        category: 'Payroll' as const,
        type: 'Expense' as const,
        amount: targetPay.netSalary,
        referenceId: targetPay.id,
      };

      updated.finance = [...updated.finance, financeItem];

      // Add audit, notification, and mock email
      const user = { name: 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
      updated = addAuditEntry(
        updated,
        'Disburse Employee Salary',
        'Payroll',
        `Disbursed net salary of $${targetPay.netSalary} to ${targetPay.employeeName}`,
        user
      );

      const emailObj = {
        id: `em-pay-${targetPay.id}-${Date.now()}`,
        sender: 'payroll@nojagroup.com',
        recipient: state.employees.find(e => e.id === targetPay.employeeId)?.email || 'employee@noja.com',
        subject: `Salary Payslip Processed - ${targetPay.month}`,
        body: `Hi ${targetPay.employeeName},\n\nYour salary of $${targetPay.netSalary.toLocaleString()} has been paid into your account for ${targetPay.month}.\nBase salary: $${targetPay.baseSalary}\nAllowances: $${targetPay.allowances}\nDeductions: $${targetPay.deductions}\n\nPlease contact HR for support.\n\nWarm regards,\nNoja Business Team`,
        sentAt: new Date().toISOString(),
        status: 'sent' as const,
        template: 'payroll',
      };
      updated.emails = [emailObj, ...updated.emails];
    }

    setState(updated);
  };

  return (
    <div id="noja-hr-payroll-module" className="space-y-6">
      {/* Module Title & Tab bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <Users className="w-5 h-5 mr-2 text-slate-800 dark:text-slate-200" /> Human Resource & Capital Management
          </h2>
          <p className="text-xs text-slate-400">Manage employee directories, performance rosters, and monthly salary sheets.</p>
        </div>
        <div className="flex space-x-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveSubTab('directory')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeSubTab === 'directory' ? 'bg-slate-950 dark:bg-slate-700 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            Staff Directory
          </button>
          <button
            onClick={() => setActiveSubTab('payroll')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeSubTab === 'payroll' ? 'bg-slate-950 dark:bg-slate-700 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            Payroll Systems
          </button>
        </div>
      </div>

      {/* Directory Tab */}
      {activeSubTab === 'directory' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-xs text-slate-400 font-mono">
              Total staff: <span className="font-bold text-slate-700 dark:text-slate-300">{filteredEmployees.length} registered</span>
            </div>
            <button
              onClick={() => setShowAddEmp(true)}
              className="px-3.5 py-2 bg-slate-950 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          </div>

          {/* Employee Directory Grid */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#0F172A] text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Contact Info</th>
                    <th className="p-4 font-semibold">Department & Role</th>
                    <th className="p-4 font-semibold">Joining Date</th>
                    <th className="p-4 font-semibold">Salary Grade</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No employees registered under this company branch directory.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">
                          {emp.firstName} {emp.lastName}
                        </td>
                        <td className="p-4 font-mono text-slate-500">
                          <div>{emp.email}</div>
                          <div className="text-[10px] mt-0.5 text-slate-400">{emp.phone}</div>
                        </td>
                        <td className="p-4">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300 font-medium text-[10px] mb-1">
                            {emp.department}
                          </span>
                          <div className="text-slate-400 font-medium text-[10px]">{emp.role}</div>
                        </td>
                        <td className="p-4 font-mono text-slate-400">{emp.joiningDate}</td>
                        <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          ${emp.baseSalary.toLocaleString()}/mo
                        </td>
                        <td className="p-4">
                          <select
                            value={emp.status}
                            onChange={e => handleUpdateStatus(emp.id, e.target.value as Employee['status'])}
                            className={`px-2 py-1 rounded text-[10px] font-semibold border-none bg-slate-100 dark:bg-slate-800 focus:outline-none ${emp.status === 'Active' ? 'text-emerald-700 dark:text-emerald-400' : emp.status === 'On Leave' ? 'text-blue-700 dark:text-blue-400' : 'text-rose-700 dark:text-rose-400'}`}
                          >
                            <option value="Active">Active</option>
                            <option value="On Leave">On Leave</option>
                            <option value="Suspended">Suspended</option>
                            <option value="Terminated">Terminated</option>
                          </select>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteEmployee(emp.id, `${emp.firstName} ${emp.lastName}`)}
                            title="Delete Employee"
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded text-rose-500 hover:text-rose-700 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Payroll Systems Tab */}
      {activeSubTab === 'payroll' && (
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Run Payroll Automation Engine</h4>
              <p className="text-xs text-slate-400">Instantly generate salary parameters, bonuses, taxes, and payslips.</p>
            </div>
            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs px-3 py-2 text-slate-800 dark:text-slate-200"
                >
                  <option value="June 2026">June 2026</option>
                  <option value="July 2026">July 2026</option>
                  <option value="August 2026">August 2026</option>
                </select>
              </div>
              <button
                onClick={runPayrollEngine}
                className="flex-1 md:flex-none px-4 py-2 bg-slate-950 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs"
              >
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Compute Salary Batches</span>
              </button>
            </div>
          </div>

          {/* Calculated Sheets */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payroll Processing Ledger - {selectedMonth}</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#0F172A] text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 font-semibold">Employee</th>
                    <th className="p-4 font-semibold">Base Salary</th>
                    <th className="p-4 font-semibold">Monthly Allowances</th>
                    <th className="p-4 font-semibold">Taxes & Deductions</th>
                    <th className="p-4 font-semibold">Net Salary Payout</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {activePayrolls.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No payroll sheets calculated yet for {selectedMonth}. Press "Compute Salary Batches" to initialize.
                      </td>
                    </tr>
                  ) : (
                    activePayrolls.map(pay => {
                      const hasAdjustments = salaryAdjustments[pay.employeeId] !== undefined;
                      const customAllow = hasAdjustments ? salaryAdjustments[pay.employeeId].allowances : pay.allowances;
                      const customDeduct = hasAdjustments ? salaryAdjustments[pay.employeeId].deductions : pay.deductions;
                      const calcNet = pay.baseSalary + Number(customAllow) - Number(customDeduct);

                      return (
                        <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-4 font-semibold text-slate-900 dark:text-white">
                            {pay.employeeName}
                          </td>
                          <td className="p-4 font-mono font-bold">${pay.baseSalary.toLocaleString()}</td>
                          <td className="p-4">
                            {pay.status === 'Draft' ? (
                              <input
                                type="number"
                                placeholder="0"
                                value={salaryAdjustments[pay.employeeId]?.allowances || 0}
                                onChange={e => updateAdjustment(pay.employeeId, 'allowances', Number(e.target.value))}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 w-20 text-xs text-right font-mono text-slate-800 dark:text-white"
                              />
                            ) : (
                              <span className="font-mono text-emerald-600">+${pay.allowances}</span>
                            )}
                          </td>
                          <td className="p-4">
                            {pay.status === 'Draft' ? (
                              <input
                                type="number"
                                placeholder="0"
                                value={salaryAdjustments[pay.employeeId]?.deductions || 0}
                                onChange={e => updateAdjustment(pay.employeeId, 'deductions', Number(e.target.value))}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 w-20 text-xs text-right font-mono text-slate-800 dark:text-white"
                              />
                            ) : (
                              <span className="font-mono text-rose-600">-${pay.deductions}</span>
                            )}
                          </td>
                          <td className="p-4 font-mono font-extrabold text-slate-950 dark:text-white">
                            ${(pay.status === 'Draft' ? calcNet : pay.netSalary).toLocaleString()}
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${pay.status === 'Paid' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : pay.status === 'Approved' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-[#0F172A] text-slate-600'}`}>
                              {pay.status}
                            </span>
                          </td>
                          <td className="p-4 text-right flex justify-end space-x-1.5 items-center">
                            {pay.status === 'Draft' && (
                              <button
                                onClick={() => setPayrollRecordStatus(pay.id, 'Approved')}
                                className="px-2.5 py-1.5 bg-slate-900 text-white rounded text-[10px] font-semibold hover:bg-slate-800"
                              >
                                Approve
                              </button>
                            )}
                            {pay.status === 'Approved' && (
                              <button
                                onClick={() => setPayrollRecordStatus(pay.id, 'Paid')}
                                className="px-2.5 py-1.5 bg-emerald-600 text-white rounded text-[10px] font-semibold hover:bg-emerald-700"
                              >
                                Pay Out
                              </button>
                            )}
                            <button
                              onClick={() => {
                                // For viewing pay slip overlay
                                const workingPay = pay.status === 'Draft'
                                  ? { ...pay, allowances: customAllow, deductions: customDeduct, netSalary: calcNet }
                                  : pay;
                                setActivePaySlip(workingPay);
                              }}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 hover:text-slate-950 hover:bg-slate-200 transition-all"
                              title="Invoice Pay Slip"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
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

      {/* Add Employee Slideover Modal */}
      {showAddEmp && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex justify-center items-center z-50">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-md space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                <Plus className="w-4.5 h-4.5 text-emerald-500 mr-1" /> Register New Personnel
              </h4>
              <button onClick={() => setShowAddEmp(false)} className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John"
                    value={newEmp.firstName}
                    onChange={e => setNewEmp(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Doe"
                    value={newEmp.lastName}
                    onChange={e => setNewEmp(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="john.doe@company.com"
                  value={newEmp.email}
                  onChange={e => setNewEmp(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Phone Contact</label>
                  <input
                    type="text"
                    placeholder="+44 7700 900011"
                    value={newEmp.phone}
                    onChange={e => setNewEmp(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Department</label>
                  <select
                    value={newEmp.department}
                    onChange={e => setNewEmp(prev => ({ ...prev, department: e.target.value as any }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Job Title / Role</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cloud Architect"
                    value={newEmp.role}
                    onChange={e => setNewEmp(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Base Salary (UGX)</label>
                  <input
                    type="number"
                    required
                    placeholder="4000000"
                    value={newEmp.baseSalary}
                    onChange={e => setNewEmp(prev => ({ ...prev, baseSalary: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddEmp(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-950 dark:bg-slate-800 text-white hover:bg-slate-900 dark:hover:bg-slate-750 rounded-lg font-semibold"
                >
                  Onboard Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Slip Modal Overlay */}
      {activePaySlip && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex justify-center items-center z-50">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-xl space-y-6 animate-scale-up font-sans text-xs">
            {/* Header branding */}
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">NOJA ENTERPRISE GROUP</h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Corporate Capital Payroll Receipt</p>
                <p className="text-[10px] text-slate-400 mt-1">Ref ID: {activePaySlip.id}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wide ${activePaySlip.status === 'Paid' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 text-amber-600'}`}>
                  {activePaySlip.status}
                </span>
                <p className="text-[10px] text-slate-400 font-mono mt-1.5">{selectedMonth}</p>
              </div>
            </div>

            {/* Personnel & Bank Meta */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-[#0F172A] p-4 rounded-xl font-mono text-[10px]">
              <div>
                <p className="text-slate-400 uppercase tracking-wider text-[8px] font-bold">Employee Credentials</p>
                <p className="text-slate-800 dark:text-slate-100 font-semibold mt-1 text-[11px]">{activePaySlip.employeeName}</p>
                <p className="text-slate-500 mt-0.5">
                  ID: {activePaySlip.employeeId} | Dept: {state.employees.find(e => e.id === activePaySlip.employeeId)?.department || 'Engineering'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 uppercase tracking-wider text-[8px] font-bold">Transaction Meta</p>
                <p className="text-slate-800 dark:text-slate-100 mt-1">Disbursed via: Bank Direct Transfer</p>
                <p className="text-slate-500 mt-0.5">Date: {activePaySlip.paymentDate || 'Pending Approval'}</p>
              </div>
            </div>

            {/* Ledger Line Items */}
            <div className="space-y-3">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                <span>Description</span>
                <span className="text-right">Amount (UGX)</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-600 dark:text-slate-300">1. Base Monthly Remuneration</span>
                  <span className="text-right text-slate-800 dark:text-slate-100 font-bold">UGX {activePaySlip.baseSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-600 dark:text-slate-300">2. Extra Allowances (Bonus / Fuel)</span>
                  <span className="text-right text-emerald-600 font-bold">+UGX {activePaySlip.allowances.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-600 dark:text-slate-300">3. Standard Income Deductions (Taxes)</span>
                  <span className="text-right text-rose-600 font-bold">-UGX {activePaySlip.deductions.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Net Total block */}
            <div className="border-t border-b border-slate-100 dark:border-slate-800 py-4 flex justify-between items-center bg-slate-50 dark:bg-[#0F172A] px-4 rounded-xl">
              <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Total Net Disbursed</span>
              <span className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400">UGX {activePaySlip.netSalary.toLocaleString()}</span>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg text-[10px] font-bold flex items-center space-x-1.5 transition-all text-slate-700 dark:text-slate-300"
              >
                <Printer className="w-4.5 h-4.5" />
                <span>Print Copy</span>
              </button>
              <button
                onClick={() => setActivePaySlip(null)}
                className="px-5 py-2 bg-slate-950 dark:bg-slate-800 text-white rounded-lg text-[10px] font-bold hover:bg-slate-900"
              >
                Close Pay Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
