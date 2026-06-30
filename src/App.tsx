/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Bot,
  Users,
  Landmark,
  Package,
  Compass,
  ShieldAlert,
  Bell,
  Sun,
  Moon,
  Building2,
  GitBranch,
  Menu,
  X,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';

// Core imports
import {
  loadFullERPState,
  saveFullERPState,
  ERPState,
  SEED_COMPANIES,
  SEED_BRANCHES
} from './data';

// Component imports
import Dashboard from './components/Dashboard';
import AIAssistant from './components/AIAssistant';
import HRAndPayroll from './components/HRAndPayroll';
import FinanceModule from './components/FinanceModule';
import InventoryModule from './components/InventoryModule';
import ProcurementCRM from './components/ProcurementCRM';
import SystemModules from './components/SystemModules';

export default function App() {
  // Global ERP state
  const [state, setState] = useState<ERPState>(() => loadFullERPState());

  // Workspace configurations
  const [activeCompanyId, setActiveCompanyId] = useState<string>('c1');
  const [activeBranchId, setActiveBranchId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ai' | 'finance' | 'inventory' | 'hr' | 'crm' | 'system'>('dashboard');

  // UI preferences
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  // Sync state to localstorage when edited
  useEffect(() => {
    saveFullERPState(state);
  }, [state]);

  // Adjust document element for Tailwind CSS dark mode toggles
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Derived branches corresponding to active company
  const availableBranches = useMemo(() => {
    return state.branches.filter(b => b.companyId === activeCompanyId);
  }, [state.branches, activeCompanyId]);

  // Automatically adjust selected branch if it doesn't belong to the active company
  useEffect(() => {
    if (activeBranchId !== 'all') {
      const exists = availableBranches.some(b => b.id === activeBranchId);
      if (!exists) {
        setActiveBranchId('all');
      }
    }
  }, [activeCompanyId, availableBranches, activeBranchId]);

  const activeCompany = state.companies.find(c => c.id === activeCompanyId);
  const activeBranch = state.branches.find(b => b.id === activeBranchId);

  // Unread notifications count
  const unreadCount = useMemo(() => {
    return state.notifications.filter(n => !n.read).length;
  }, [state.notifications]);

  const markAllNotificationsRead = () => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
    }));
  };

  const clearNotification = (id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id),
    }));
  };

  interface NavItem {
    id: 'dashboard' | 'ai' | 'finance' | 'inventory' | 'hr' | 'crm' | 'system';
    label: string;
    icon: any;
    highlight?: boolean;
  }

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'ai', label: 'Noja AI Consultant', icon: Bot, highlight: true },
    { id: 'finance', label: 'General Ledger', icon: Landmark },
    { id: 'inventory', label: 'Stock Control & Barcodes', icon: Package },
    { id: 'hr', label: 'HR & Payroll Systems', icon: Users },
    { id: 'crm', label: 'Sales & Procurement', icon: Compass },
    { id: 'system', label: 'System Admin & Backup', icon: ShieldAlert },
  ];

  return (
    <div className={`min-h-screen flex bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-slate-300 font-sans transition-colors duration-200`}>
      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 dark:bg-[#1E293B] text-slate-300 dark:text-slate-300 border-r border-slate-800 dark:border-slate-800 shrink-0">
        {/* Brand Banner */}
        <div className="p-6 border-b border-slate-800 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/10">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">NOJA<span className="text-indigo-400 font-normal">ERP</span></span>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest font-mono">Business Intelligence</p>
            </div>
          </div>
        </div>

        {/* Navigation catalog */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-2 px-2 tracking-widest">Core Modules</div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all border ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${item.highlight ? 'text-indigo-400' : ''}`} />
                <span>{item.label}</span>
                {item.highlight && (
                  <span className="ml-auto text-[8px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                    Smart
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom tenant meta */}
        <div className="p-4 mt-auto border-t border-slate-800 dark:border-slate-800">
          <div className="flex items-center space-x-2 px-3 py-2 text-slate-500">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono tracking-tighter uppercase font-bold">API v2.0.4 - ACTIVE</span>
              <span className="text-[8px] font-mono text-slate-500 mt-0.5">User: Malotrinax (Admin)</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-[#0F172A]">
        {/* Top bar header */}
        <header className="bg-white dark:bg-[#0F172A]/90 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-sm backdrop-blur-md">
          {/* Left panel: Toggler & Dropdowns */}
          <div className="flex items-center space-x-3 lg:space-x-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-300"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Company Selection dropdown */}
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={activeCompanyId}
                onChange={e => setActiveCompanyId(e.target.value)}
                className="bg-transparent border-none text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {state.companies.map(c => (
                  <option key={c.id} value={c.id} className="text-slate-800">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch Selection dropdown */}
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <GitBranch className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={activeBranchId}
                onChange={e => setActiveBranchId(e.target.value)}
                className="bg-transparent border-none text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="all" className="text-slate-800">All Offices</option>
                {availableBranches.map(b => (
                  <option key={b.id} value={b.id} className="text-slate-800">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right panel: Notifications & Settings */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-500 dark:text-slate-300 transition-all"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* Bell Alert Notification center trigger */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-500 dark:text-slate-300 relative transition-all"
                title="Notifications Ledger"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-600 rounded-full animate-ping" />
                )}
              </button>

              {/* Notification dropdown pop-up panel */}
              {showNotifications && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden text-xs animate-scale-up">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-[#0F172A]/70 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <span className="font-bold text-slate-700 dark:text-slate-200">System Alerts ({unreadCount})</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                      >
                        Clear Alert Status
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin">
                    {state.notifications.length === 0 ? (
                      <p className="p-4 text-center text-slate-400">No active system alerts.</p>
                    ) : (
                      state.notifications.map(noti => {
                        return (
                          <div key={noti.id} className={`p-3.5 flex items-start space-x-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${!noti.read ? 'bg-indigo-50/20 dark:bg-indigo-500/5' : ''}`}>
                            <div className="shrink-0 mt-0.5">
                              {noti.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : noti.type === 'warning' ? (
                                <AlertCircle className="w-4 h-4 text-rose-500" />
                              ) : (
                                <Info className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white leading-snug">{noti.title}</p>
                              <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">{noti.message}</p>
                              <span className="text-[8px] font-mono text-slate-400 mt-1 block">{noti.timestamp}</span>
                            </div>
                            <button
                              onClick={() => clearNotification(noti.id)}
                              className="text-slate-300 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar placeholder */}
            <div className="flex items-center space-x-2 border-l border-slate-100 dark:border-slate-800 pl-3">
              <div className="w-7 h-7 rounded-full bg-slate-950 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 flex items-center justify-center font-extrabold font-mono text-[10px] text-white">
                M
              </div>
              <div className="hidden md:block text-[10px] font-medium">
                <p className="font-bold text-slate-800 dark:text-white">Malotrinax</p>
                <p className="text-slate-400 text-[8px] uppercase tracking-wider font-semibold">HQ Administrator</p>
              </div>
            </div>
          </div>
        </header>

        {/* Core module view space */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard state={state} activeCompanyId={activeCompanyId} activeBranchId={activeBranchId} />
          )}

          {activeTab === 'ai' && (
            <AIAssistant state={state} activeCompanyId={activeCompanyId} activeBranchId={activeBranchId} />
          )}

          {activeTab === 'finance' && (
            <FinanceModule state={state} setState={setState} activeCompanyId={activeCompanyId} activeBranchId={activeBranchId} />
          )}

          {activeTab === 'inventory' && (
            <InventoryModule state={state} setState={setState} activeCompanyId={activeCompanyId} activeBranchId={activeBranchId} />
          )}

          {activeTab === 'hr' && (
            <HRAndPayroll state={state} setState={setState} activeCompanyId={activeCompanyId} activeBranchId={activeBranchId} />
          )}

          {activeTab === 'crm' && (
            <ProcurementCRM state={state} setState={setState} activeCompanyId={activeCompanyId} activeBranchId={activeBranchId} />
          )}

          {activeTab === 'system' && (
            <SystemModules state={state} setState={setState} activeCompanyId={activeCompanyId} />
          )}
        </main>
      </div>

      {/* Mobile Drawer Menu Overlays */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop screen */}
          <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs" />

          {/* Nav Container Drawer */}
          <div className="relative flex flex-col w-64 max-w-xs bg-slate-900 dark:bg-[#1E293B] text-slate-300 p-5 space-y-4 shadow-2xl border-r border-slate-800 animate-slide-right">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-indigo-500 rounded flex items-center justify-center">
                  <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-base font-bold tracking-tight text-white">NOJA<span className="text-indigo-400 font-normal">ERP</span></span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:bg-slate-800 rounded">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <nav className="flex-1 space-y-1.5">
              <div className="text-[9px] uppercase font-bold text-slate-500 mb-2 px-1 tracking-widest">Core Modules</div>
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all border ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
