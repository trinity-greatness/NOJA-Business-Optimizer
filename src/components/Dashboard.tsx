/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  Users,
  DollarSign,
  Package,
  AlertTriangle,
  Building,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown
} from 'lucide-react';
import { ERPState } from '../data';

interface DashboardProps {
  state: ERPState;
  activeCompanyId: string;
  activeBranchId: string;
}

export default function Dashboard({ state, activeCompanyId, activeBranchId }: DashboardProps) {
  // Filter core items by active company and branch
  const filteredEmployees = useMemo(() => {
    return state.employees.filter(
      emp => emp.companyId === activeCompanyId && (activeBranchId === 'all' || emp.branchId === activeBranchId)
    );
  }, [state.employees, activeCompanyId, activeBranchId]);

  const filteredFinance = useMemo(() => {
    return state.finance.filter(
      f => f.companyId === activeCompanyId && (activeBranchId === 'all' || f.branchId === activeBranchId)
    );
  }, [state.finance, activeCompanyId, activeBranchId]);

  const filteredInventory = useMemo(() => {
    return state.inventory.filter(
      inv => inv.companyId === activeCompanyId && (activeBranchId === 'all' || inv.branchId === activeBranchId)
    );
  }, [state.inventory, activeCompanyId, activeBranchId]);

  const filteredSales = useMemo(() => {
    return state.sales.filter(
      sal => sal.companyId === activeCompanyId && (activeBranchId === 'all' || sal.branchId === activeBranchId)
    );
  }, [state.sales, activeCompanyId, activeBranchId]);

  // Derived KPIs
  const totalIncome = useMemo(() => {
    return filteredFinance
      .filter(f => f.type === 'Income')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [filteredFinance]);

  const totalExpense = useMemo(() => {
    return filteredFinance
      .filter(f => f.type === 'Expense')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [filteredFinance]);

  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0.0';

  const lowStockItems = useMemo(() => {
    return filteredInventory.filter(inv => inv.stock <= inv.minStockAlert);
  }, [filteredInventory]);

  // Chart 1: Cash Flow Over Time
  const cashFlowData = useMemo(() => {
    // Group transaction dates
    const map: { [date: string]: { date: string; income: number; expense: number } } = {};
    filteredFinance.forEach(f => {
      const d = f.date;
      if (!map[d]) {
        map[d] = { date: d, income: 0, expense: 0 };
      }
      if (f.type === 'Income') {
        map[d].income += f.amount;
      } else {
        map[d].expense += f.amount;
      }
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredFinance]);

  // Chart 2: Category Expenses Breakdown
  const categoryExpenses = useMemo(() => {
    const map: { [cat: string]: number } = {};
    filteredFinance
      .filter(f => f.type === 'Expense')
      .forEach(f => {
        map[f.category] = (map[f.category] || 0) + f.amount;
      });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredFinance]);

  // Chart 3: Branch Performance Comparison
  const branchData = useMemo(() => {
    const branchesForCompany = state.branches.filter(b => b.companyId === activeCompanyId);
    return branchesForCompany.map(br => {
      const brFinance = state.finance.filter(f => f.branchId === br.id);
      const income = brFinance.filter(f => f.type === 'Income').reduce((s, i) => s + i.amount, 0);
      const expense = brFinance.filter(f => f.type === 'Expense').reduce((s, i) => s + i.amount, 0);
      return {
        name: br.name,
        Income: income,
        Expense: expense,
        Net: income - expense,
      };
    });
  }, [state.branches, state.finance, activeCompanyId]);

  const COLORS = ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8'];

  return (
    <div id="noja-dashboard-module" className="space-y-6">
      {/* Upper Grid: Smart KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1 */}
        <div id="kpi-revenue" className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Gross Revenues</p>
              <h3 className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                ${totalIncome.toLocaleString()}
              </h3>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-[#0F172A] rounded-xl">
              <DollarSign className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            </div>
          </div>
          <div className="flex items-center mt-3 text-xs">
            <span className="flex items-center text-emerald-500 font-semibold mr-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +12.5%
            </span>
            <span className="text-slate-400 dark:text-slate-500">vs last month</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div id="kpi-expenses" className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Expenditures</p>
              <h3 className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                ${totalExpense.toLocaleString()}
              </h3>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-[#0F172A] rounded-xl">
              <TrendingDown className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            </div>
          </div>
          <div className="flex items-center mt-3 text-xs">
            <span className="flex items-center text-rose-500 font-semibold mr-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +4.1%
            </span>
            <span className="text-slate-400 dark:text-slate-500">vs salary batch</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div id="kpi-profit" className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all hover:shadow-md animate-fade-in">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Net Operating Cash</p>
              <h3 className={`text-2xl font-bold font-mono mt-1 ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {netProfit >= 0 ? '+' : '-'}${Math.abs(netProfit).toLocaleString()}
              </h3>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-[#0F172A] rounded-xl">
              <TrendingUp className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            </div>
          </div>
          <div className="flex items-center mt-3 text-xs">
            <span className="font-mono bg-slate-100 dark:bg-[#0F172A] px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 mr-2 border dark:border-slate-800">
              {profitMargin}% Margin
            </span>
            <span className="text-slate-400 dark:text-slate-500">efficiency ratio</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div id="kpi-staff" className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Headcount</p>
              <h3 className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {filteredEmployees.length} Employees
              </h3>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-[#0F172A] rounded-xl">
              <Users className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            </div>
          </div>
          <div className="flex items-center mt-3 text-xs">
            <span className="text-emerald-500 font-semibold mr-1.5">100% active</span>
            <span className="text-slate-400 dark:text-slate-500">across {activeBranchId === 'all' ? 'all' : 'selected'} branches</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* cash flow chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Cash Flow Movement</h4>
          <div className="h-72">
            {cashFlowData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-mono">No financial transactions logged.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" className="opacity-20" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: '11px', fontFamily: 'monospace', backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f1f5f9' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="income" name="Revenue (UGX)" stroke="#6366f1" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expense" name="Expenditures (UGX)" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Expenses Category Distribution Pie */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Expenditure Breakdown</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Top expense categories by percentage</p>
          </div>
          <div className="h-48 flex items-center justify-center relative">
            {categoryExpenses.length === 0 ? (
              <div className="text-slate-400 text-xs font-mono">No expenses registered.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryExpenses}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryExpenses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value}`} contentStyle={{ fontSize: '11px', backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f1f5f9' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 max-h-24 overflow-y-auto">
            {categoryExpenses.map((entry, idx) => (
              <div key={entry.name} className="flex items-center space-x-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-slate-600 dark:text-slate-300 truncate max-w-[80px]">{entry.name}</span>
                <span className="font-mono text-slate-400 dark:text-slate-500 font-bold ml-auto">${entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Branch comparison and low stock notification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
        {/* Branch performance chart */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Multi-Branch Cash Performance</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" className="opacity-20" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => `$${value}`} contentStyle={{ fontSize: '11px', fontFamily: 'monospace', backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f1f5f9' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="Income" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Expense" fill="#94a3b8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low inventory alert listing */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center">
                <AlertTriangle className="w-4 h-4 text-amber-500 mr-1.5" /> Core Stock Shortage Alert
              </h4>
              <span className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-medium px-2 py-0.5 rounded-full">
                {lowStockItems.length} SKU Flagged
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Products with stock levels equal or below their safety buffers.</p>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[190px] pr-1 scrollbar-thin">
            {lowStockItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-6 text-slate-400">
                <Package className="w-10 h-10 stroke-1 opacity-50 mb-2 text-slate-300" />
                <p className="text-xs font-mono">All inventories are safely buffered.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-slate-50 dark:bg-[#0F172A] p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <div>
                      <h5 className="text-xs font-semibold text-slate-900 dark:text-white">{item.name}</h5>
                      <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                        SKU: <span className="font-bold text-slate-500 dark:text-slate-300">{item.id}</span> | Barcode: {item.barcode}
                      </p>
                    </div>
                    <div className="text-right flex items-center space-x-4">
                      <div className="text-xs">
                        <span className="text-slate-400 dark:text-slate-500 mr-2">Qty:</span>
                        <span className="font-mono font-bold text-rose-500">{item.stock}</span>
                        <span className="text-slate-300 dark:text-slate-600 mx-1.5">/</span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">{item.minStockAlert}</span>
                      </div>
                      <span className="text-[10px] bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded font-medium">
                        Alert
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400 dark:text-slate-500">Restock procurement automatically suggested.</span>
            <span className="font-medium text-slate-950 dark:text-slate-300 cursor-pointer hover:underline">Go to Procurement →</span>
          </div>
        </div>
      </div>
    </div>
  );
}
