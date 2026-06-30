/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, RotateCcw, HelpCircle } from 'lucide-react';
import { ERPState } from '../data';

interface AIAssistantProps {
  state: ERPState;
  activeCompanyId: string;
  activeBranchId: string;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export default function AIAssistant({ state, activeCompanyId, activeBranchId }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Hello! I am your Noja Intelligent Business Optimizer. I have real-time access to your current ERP ledger, inventory matrices, CRM pipeline, and employee rosters.\n\nHow can I help optimize your business today? Try one of the quick suggestions below!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const activeCompany = state.companies.find(c => c.id === activeCompanyId);
  const activeBranch = state.branches.find(b => b.id === activeBranchId);

  // Extract a summarized snapshot of ERP state to send as model context (so we don't exceed token limits while remaining highly specific)
  const currentERPContext = {
    activeCompany: activeCompany?.name || 'All',
    activeBranch: activeBranch?.name || 'All',
    metrics: {
      totalEmployees: state.employees.filter(e => e.companyId === activeCompanyId).length,
      totalInventoryItems: state.inventory.filter(i => i.companyId === activeCompanyId).length,
      totalFinanceEntries: state.finance.filter(f => f.companyId === activeCompanyId).length,
      crmLeadsCount: state.crmLeads.filter(c => c.companyId === activeCompanyId).length,
      outstandingProcurements: state.procurement.filter(p => p.companyId === activeCompanyId && p.status === 'Pending Approval').length,
    },
    sampleEmployees: state.employees
      .filter(e => e.companyId === activeCompanyId)
      .slice(0, 5)
      .map(e => ({ name: `${e.firstName} ${e.lastName}`, role: e.role, dept: e.department, salary: e.baseSalary, status: e.status })),
    lowStockAlerts: state.inventory
      .filter(i => i.companyId === activeCompanyId && i.stock <= i.minStockAlert)
      .map(i => ({ name: i.name, stock: i.stock, threshold: i.minStockAlert, barcode: i.barcode })),
    crmLeads: state.crmLeads
      .filter(l => l.companyId === activeCompanyId)
      .slice(0, 4)
      .map(l => ({ name: l.name, company: l.companyName, status: l.status, value: l.value })),
    financeOverview: state.finance
      .filter(f => f.companyId === activeCompanyId)
      .slice(0, 8)
      .map(f => ({ description: f.description, category: f.category, type: f.type, amount: f.amount, date: f.date }))
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    if (!textToSend) setInput('');
    setErrorMsg(null);

    const userMsg: Message = {
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          history: messages,
          context: currentERPContext,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error communicating with AI Assistant.');
      }

      const assistantMsg: Message = {
        role: 'assistant',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Unable to fetch response from the AI assistant. Ensure process.env.GEMINI_API_KEY is defined in secrets panel.');
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([
      {
        role: 'assistant',
        text: "Conversation restarted. What can I calculate, summarize, or optimize for you today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setErrorMsg(null);
  };

  const quickPrompts = [
    "Give me an active cash flow optimization audit.",
    "Which inventory items need immediate procurement?",
    "Analyze our active CRM leads and suggest priorities.",
    "Explain how we can optimize our employee payroll budget."
  ];

  return (
    <div id="noja-ai-module" className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[600px] overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#1E293B] px-5 py-4 flex justify-between items-center text-white border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-slate-850 dark:bg-[#0F172A] rounded-lg">
            <Bot className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold tracking-tight">Noja Intelligent AI Consultant</h4>
            <p className="text-[10px] text-slate-400 font-mono">Running gemini-3.5-flash server-side</p>
          </div>
        </div>
        <button
          onClick={clearHistory}
          title="Clear Conversation"
          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50 dark:bg-[#0F172A] scrollbar-thin">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div className={`flex items-start max-w-[85%] space-x-2.5 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`p-1.5 rounded-full ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div>
                <div className={`p-3 rounded-xl text-xs whitespace-pre-line leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white dark:bg-slate-800' : 'bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100'}`}>
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-400 font-mono mt-1 block px-1">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-start max-w-[85%] space-x-2.5">
              <div className="p-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                <Bot className="w-3.5 h-3.5 animate-bounce" />
              </div>
              <div className="p-3 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm text-xs text-slate-500 font-mono flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                <span>Noja AI is compiling cash accounts and inventory structures...</span>
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/50 p-4 rounded-xl flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold">Gemini API Connection Required</p>
              <p className="mt-1">{errorMsg}</p>
              <div className="mt-2 text-[10px] font-mono text-slate-500">
                Please verify that <span className="font-bold">GEMINI_API_KEY</span> is populated in your build's Secrets console panel. Noja ERP continues to function with off-line core rules.
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A]/90 flex flex-wrap gap-2">
        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider w-full mb-1 flex items-center">
          <HelpCircle className="w-3 h-3 mr-1" /> Core Optimization suggestions:
        </div>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            disabled={loading}
            onClick={() => handleSend(p)}
            className="text-[10px] font-mono font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-950 hover:text-white dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs transition-all text-left"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input controls */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSend();
        }}
        className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-3 bg-white dark:bg-[#1E293B]"
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Ask about cash reserves, employees at "${activeCompany?.name || 'HQ'}"...`}
          disabled={loading}
          className="flex-1 bg-slate-50 dark:bg-[#0F172A] text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-slate-950 dark:focus:border-slate-500 font-sans"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-3 bg-slate-950 dark:bg-[#0F172A] hover:bg-slate-900 dark:hover:bg-slate-800 text-white rounded-xl transition-all disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
