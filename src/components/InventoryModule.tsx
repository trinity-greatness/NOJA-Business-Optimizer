/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  AlertTriangle,
  Barcode,
  Search,
  CheckCircle,
  X,
  TrendingUp,
  Sliders,
  DollarSign,
  Maximize2
} from 'lucide-react';
import { ERPState, addAuditEntry, addNotificationEntry } from '../data';
import { InventoryItem } from '../types';

interface InventoryModuleProps {
  state: ERPState;
  setState: React.Dispatch<React.SetStateAction<ERPState>>;
  activeCompanyId: string;
  activeBranchId: string;
}

// Custom Alphanumeric Barcode Renderer (Generates clean 1D barcode stripes in raw SVG)
function Code128Barcode({ value }: { value: string }) {
  // Convert a string value deterministically into standard vertical bars (widths 1, 2, 3, 4)
  const barPattern = useMemo(() => {
    const chars = value.toUpperCase().split('');
    let pattern = '1101001000'; // Start guard

    chars.forEach((char, idx) => {
      const code = char.charCodeAt(0);
      // Generate deterministic bar patterns (black/white) based on char code
      const binary = (code * (idx + 1) * 313).toString(2).substring(0, 8);
      // Map 1s to wide bars, 0s to narrow
      for (const bit of binary) {
        pattern += bit === '1' ? '110' : '100';
      }
    });

    pattern += '11011011'; // End guard
    return pattern;
  }, [value]);

  return (
    <div className="flex flex-col items-center bg-white p-3 rounded-lg border border-slate-100 dark:border-slate-800">
      <svg width="220" height="70" className="opacity-90 dark:invert">
        <g fill="#000000">
          {barPattern.split('').map((bit, idx) => {
            if (bit === '1') {
              return <rect key={idx} x={idx * 2} y="0" width="1.6" height="70" />;
            }
            return null;
          })}
        </g>
      </svg>
      <span className="font-mono text-[10px] font-bold text-slate-500 tracking-widest uppercase mt-2">{value}</span>
    </div>
  );
}

export default function InventoryModule({ state, setState, activeCompanyId, activeBranchId }: InventoryModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddSku, setShowAddSku] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [activeBarcodeItem, setActiveBarcodeItem] = useState<InventoryItem | null>(null);

  // New SKU state
  const [newSku, setNewSku] = useState<Partial<InventoryItem>>({
    name: '',
    category: 'Hardware',
    stock: 10,
    minStockAlert: 5,
    costPrice: 100,
    sellingPrice: 150,
    barcode: '',
    supplier: '',
  });

  // Markup calculator states
  const [calcCost, setCalcCost] = useState(100);
  const [calcMarkup, setCalcMarkup] = useState(40); // 40% markup
  const calculatedRetail = useMemo(() => {
    return Math.round(calcCost * (1 + calcMarkup / 100));
  }, [calcCost, calcMarkup]);

  // Filter inventory
  const filteredInventory = useMemo(() => {
    return state.inventory
      .filter(inv => {
        const matchesOrg = inv.companyId === activeCompanyId && (activeBranchId === 'all' || inv.branchId === activeBranchId);
        const matchesQuery = inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.barcode.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesOrg && matchesQuery;
      });
  }, [state.inventory, activeCompanyId, activeBranchId, searchTerm]);

  // Add SKU item
  const handleAddSku = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku.name || !newSku.costPrice || !newSku.sellingPrice) {
      alert('Please fill in product name and pricing margins.');
      return;
    }

    const branchToUse = activeBranchId === 'all'
      ? (state.branches.find(b => b.companyId === activeCompanyId)?.id || 'b1')
      : activeBranchId;

    const skuCode = `sku-${newSku.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().substring(8)}`;
    const barcodeVal = newSku.barcode || `NOJA${Math.floor(100000 + Math.random() * 900000)}`;

    const skuObj: InventoryItem = {
      id: skuCode,
      companyId: activeCompanyId,
      branchId: branchToUse,
      name: newSku.name,
      category: newSku.category || 'Hardware',
      stock: Number(newSku.stock) || 0,
      minStockAlert: Number(newSku.minStockAlert) || 5,
      costPrice: Number(newSku.costPrice),
      sellingPrice: Number(newSku.sellingPrice),
      barcode: barcodeVal,
      supplier: newSku.supplier || 'General Market Vendors',
    };

    let updated = { ...state, inventory: [...state.inventory, skuObj] };

    // Log audit and notification
    const user = { name: 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
    updated = addAuditEntry(
      updated,
      'Log New Inventory SKU',
      'Inventory',
      `Registered stock catalog entry: "${skuObj.name}" with barcode: ${skuObj.barcode}`,
      user
    );
    updated = addNotificationEntry(
      updated,
      'Inventory SKU Created',
      `Product catalog expanded. Registered item: "${skuObj.name}".`,
      'success'
    );

    setState(updated);
    setShowAddSku(false);
    setNewSku({
      name: '',
      category: 'Hardware',
      stock: 10,
      minStockAlert: 5,
      costPrice: 100,
      sellingPrice: 150,
      barcode: '',
      supplier: '',
    });
  };

  // Adjust stock level directly
  const adjustStock = (id: string, delta: number) => {
    const updatedInv = state.inventory.map(item => {
      if (item.id === id) {
        const newStock = Math.max(0, item.stock + delta);
        // Check if now breaching buffer to trigger low stock notification
        return { ...item, stock: newStock };
      }
      return item;
    });

    let updated = { ...state, inventory: updatedInv };

    const item = state.inventory.find(i => i.id === id);
    if (item) {
      const user = { name: 'Malotrinax', role: 'Administrator', id: 'usr-admin' };
      updated = addAuditEntry(
        updated,
        'Adjust Stock Inventory',
        'Inventory',
        `Adjusted physical stock count of "${item.name}" by (${delta}) units.`,
        user
      );

      const targetNewStock = Math.max(0, item.stock + delta);
      if (targetNewStock <= item.minStockAlert) {
        updated = addNotificationEntry(
          updated,
          'Critical Low Stock Alert',
          `Inventory SKU "${item.name}" stock level has dropped to ${targetNewStock} units. Restocking required.`,
          'warning'
        );
      }
    }

    setState(updated);
  };

  // Barcode scanning simulation
  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = state.inventory.find(
      inv => inv.companyId === activeCompanyId &&
        (inv.barcode.toLowerCase() === scanInput.trim().toLowerCase() ||
          inv.id.toLowerCase() === scanInput.trim().toLowerCase())
    );

    if (matched) {
      // Highlighting found item by setting as active barcode view
      setActiveBarcodeItem(matched);
      setScanInput('');
      setShowScanner(false);
    } else {
      alert(`No barcode match found for "${scanInput}" in active company catalog.`);
    }
  };

  return (
    <div id="noja-inventory-module" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <Package className="w-5 h-5 mr-2 text-slate-800 dark:text-slate-200" /> Stock Control & Barcode Registers
          </h2>
          <p className="text-xs text-slate-400">Track physical item metrics, generate vector Code128 barcodes, and calculate pricing markups.</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowScanner(true)}
            className="px-3 py-2 bg-white dark:bg-[#0F172A] hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <Barcode className="w-4 h-4 text-slate-600" />
            <span>Simulate Scan</span>
          </button>
          <button
            onClick={() => setShowAddSku(true)}
            className="px-3.5 py-2 bg-slate-950 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Inventory SKU</span>
          </button>
        </div>
      </div>

      {/* Pricing Markup tool and search bar wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search & Stock Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 shadow-xs w-full">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search catalog by SKU, product name, or barcode..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#0F172A] text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 font-semibold">SKU & Product Name</th>
                    <th className="p-4 font-semibold">Class</th>
                    <th className="p-4 font-semibold">In-Stock Count</th>
                    <th className="p-4 font-semibold">Pricing Structure</th>
                    <th className="p-4 font-semibold">Barcode Value</th>
                    <th className="p-4 font-semibold text-right">Stock Adjust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No product inventories found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map(item => {
                      const isLowStock = item.stock <= item.minStockAlert;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-4">
                            <h5 className="font-semibold text-slate-900 dark:text-white">{item.name}</h5>
                            <p className="font-mono text-[9px] text-slate-400 mt-0.5">SKU ID: {item.id}</p>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300 font-medium text-[10px]">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-4 font-mono">
                            <div className="flex items-center space-x-1.5">
                              <span className={`font-bold ${isLowStock ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}`}>
                                {item.stock}
                              </span>
                              <span className="text-slate-300">/</span>
                              <span className="text-slate-400">{item.minStockAlert}</span>
                              {isLowStock && (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" title="Low stock alert" />
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-mono">
                            <div className="text-slate-500">Cost: ${item.costPrice}</div>
                            <div className="font-bold text-emerald-600">Retail: ${item.sellingPrice}</div>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => setActiveBarcodeItem(item)}
                              className="inline-flex items-center space-x-1 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white font-mono bg-slate-50 dark:bg-[#0F172A] px-2 py-1 rounded border border-slate-100 dark:border-slate-800 transition-all text-[10px]"
                            >
                              <Barcode className="w-3.5 h-3.5 text-slate-500" />
                              <span>{item.barcode}</span>
                            </button>
                          </td>
                          <td className="p-4 text-right">
                            <div className="inline-flex space-x-1">
                              <button
                                onClick={() => adjustStock(item.id, -1)}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs"
                              >
                                -
                              </button>
                              <button
                                onClick={() => adjustStock(item.id, 1)}
                                className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
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

        {/* Retail Pricing Margin Calculator */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-xs h-fit space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
              <Sliders className="w-4 h-4 mr-1 text-slate-800 dark:text-slate-200" /> Retail Markup Calculator
            </h4>
          </div>
          <div className="space-y-3 text-xs font-sans">
            <div className="space-y-1">
              <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Item Cost Price (UGX)</label>
              <input
                type="number"
                value={calcCost}
                onChange={e => setCalcCost(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Target Markup Ratio (%)</label>
              <input
                type="number"
                value={calcMarkup}
                onChange={e => setCalcMarkup(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="bg-slate-50 dark:bg-[#0F172A] p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex justify-between items-center mt-4">
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-400">Target Selling Retail</p>
                <p className="text-lg font-extrabold font-mono text-emerald-600 mt-1">${calculatedRetail}</p>
              </div>
              <div className="text-right text-[10px] text-slate-400">
                <p>Profit: ${calculatedRetail - calcCost}</p>
                <p>Margin: {((calculatedRetail - calcCost) / calculatedRetail * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scanner Simulator overlay */}
      {showScanner && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex justify-center items-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                <Barcode className="w-5 h-5 text-emerald-500 mr-1.5" /> Barcode Reader Simulator
              </h4>
              <button onClick={() => setShowScanner(false)} className="p-1 hover:bg-slate-50 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              In production, this interface maps onto high-contrast cameras or physical hand-held laser scanners. Input your barcode below to fetch SKU attributes instantly.
            </p>
            <form onSubmit={handleBarcodeScan} className="space-y-3">
              <input
                type="text"
                placeholder="e.g. NODETECH001 or NETSWITCH24"
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-mono text-slate-900 dark:text-white text-center uppercase tracking-widest"
              />
              <button
                type="submit"
                className="w-full py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Scan Code
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Display SVG Barcode Card Overlay */}
      {activeBarcodeItem && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex justify-center items-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-sm space-y-5 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">SKU Barcode Register</h4>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{activeBarcodeItem.name}</p>
              </div>
              <button onClick={() => setActiveBarcodeItem(null)} className="p-1 hover:bg-slate-50 dark:hover:bg-slate-850 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Render bar pattern */}
            <div className="py-4 flex justify-center">
              <Code128Barcode value={activeBarcodeItem.barcode} />
            </div>

            <div className="text-xs font-mono bg-slate-50 dark:bg-[#0F172A] p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <div className="flex justify-between">
                <span>SKU ID:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{activeBarcodeItem.id}</span>
              </div>
              <div className="flex justify-between">
                <span>In-stock:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{activeBarcodeItem.stock} items</span>
              </div>
              <div className="flex justify-between">
                <span>Retail price:</span>
                <span className="font-bold text-emerald-600">${activeBarcodeItem.sellingPrice}</span>
              </div>
            </div>

            <button
              onClick={() => setActiveBarcodeItem(null)}
              className="w-full py-2 bg-slate-950 dark:bg-slate-800 text-white rounded-lg text-xs font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Add SKU Item Modal */}
      {showAddSku && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex justify-center items-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-md space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                <Plus className="w-4.5 h-4.5 text-emerald-500 mr-1" /> Add Product SKU
              </h4>
              <button onClick={() => setShowAddSku(false)} className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddSku} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cisco Managed Gigabit Switch"
                  value={newSku.name}
                  onChange={e => setNewSku(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Category</label>
                  <select
                    value={newSku.category}
                    onChange={e => setNewSku(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Networking">Networking</option>
                    <option value="Supplies">Supplies</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Safety">Safety</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Supplier Vendor</label>
                  <input
                    type="text"
                    placeholder="e.g. Cisco Distributors"
                    value={newSku.supplier}
                    onChange={e => setNewSku(prev => ({ ...prev, supplier: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Initial Stock</label>
                  <input
                    type="number"
                    value={newSku.stock}
                    onChange={e => setNewSku(prev => ({ ...prev, stock: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Safety Threshold</label>
                  <input
                    type="number"
                    value={newSku.minStockAlert}
                    onChange={e => setNewSku(prev => ({ ...prev, minStockAlert: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Cost Price (UGX)</label>
                  <input
                    type="number"
                    required
                    value={newSku.costPrice}
                    onChange={e => setNewSku(prev => ({ ...prev, costPrice: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Selling Price (UGX)</label>
                  <input
                    type="number"
                    required
                    value={newSku.sellingPrice}
                    onChange={e => setNewSku(prev => ({ ...prev, sellingPrice: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Custom Alphanumeric Barcode (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. MYCUSTOMSKU12 (Leave empty to auto-generate)"
                  value={newSku.barcode}
                  onChange={e => setNewSku(prev => ({ ...prev, barcode: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-900 dark:text-white font-mono uppercase"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddSku(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-950 dark:bg-slate-800 text-white hover:bg-slate-900 dark:hover:bg-slate-750 rounded-lg font-semibold"
                >
                  Save SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
