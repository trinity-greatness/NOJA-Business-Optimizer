/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Company,
  Branch,
  Employee,
  PayrollRecord,
  FinanceRecord,
  InventoryItem,
  ProcurementOrder,
  CRMLead,
  SalesRecord,
  AuditLog,
  Notification,
  EmailMessage
} from './types';

// Seed Companies
export const SEED_COMPANIES: Company[] = [
  { id: 'c1', name: 'Noja Technologies Uganda Ltd', industry: 'Software & Cloud Solutions', taxId: 'URA-992-881', address: 'Plot 12, Kampala Road, Nakasero, Kampala, Uganda' },
  { id: 'c2', name: 'Noja Logistics East Africa Ltd', industry: 'Supply Chain & Freight Services', taxId: 'URA-445-120', address: 'Plot 44, Jinja Road, Industrial Area, Kampala, Uganda' }
];

// Seed Branches
export const SEED_BRANCHES: Branch[] = [
  { id: 'b1', companyId: 'c1', name: 'Kampala Central HQ', location: 'Nakasero, Kampala', manager: 'Sarah Namubiru' },
  { id: 'b2', companyId: 'c1', name: 'Jinja Tech Hub', location: 'Jinja, Uganda', manager: 'Michael Okello' },
  { id: 'b3', companyId: 'c2', name: 'Kampala Main Warehouse', location: 'Industrial Area, Kampala', manager: 'Ivan Ssewankambo' },
  { id: 'b4', companyId: 'c2', name: 'Mbarara Logistics Hub', location: 'Mbarara, Uganda', manager: 'Hellen Mugisha' }
];

// Seed Employees
export const SEED_EMPLOYEES: Employee[] = [
  { id: 'emp1', companyId: 'c1', branchId: 'b1', firstName: 'John', lastName: 'Kato', email: 'john.kato@nojatech.co.ug', phone: '+256 772 900077', department: 'Engineering', role: 'Senior Cloud Engineer', joiningDate: '2024-01-15', status: 'Active', baseSalary: 6800000 },
  { id: 'emp2', companyId: 'c1', branchId: 'b1', firstName: 'Sarah', lastName: 'Namubiru', email: 'sarah.namubiru@nojatech.co.ug', phone: '+256 701 900124', department: 'HR', role: 'HR & Site Manager', joiningDate: '2023-05-10', status: 'Active', baseSalary: 5200000 },
  { id: 'emp3', companyId: 'c1', branchId: 'b2', firstName: 'Michael', lastName: 'Okello', email: 'm.okello@nojatech.co.ug', phone: '+256 782 555267', department: 'Operations', role: 'Branch General Manager', joiningDate: '2022-11-01', status: 'Active', baseSalary: 8500000 },
  { id: 'emp4', companyId: 'c1', branchId: 'b2', firstName: 'Jessica', lastName: 'Atwine', email: 'jessica.atwine@nojatech.co.ug', phone: '+256 755 555981', department: 'Engineering', role: 'Junior React Specialist', joiningDate: '2025-03-20', status: 'Active', baseSalary: 4500000 },
  { id: 'emp5', companyId: 'c2', branchId: 'b3', firstName: 'Ivan', lastName: 'Ssewankambo', email: 'i.ssewankambo@nojalogistics.co.ug', phone: '+256 774 555019', department: 'Operations', role: 'Logistics Supervisor', joiningDate: '2020-08-12', status: 'Active', baseSalary: 4800000 },
  { id: 'emp6', companyId: 'c2', branchId: 'b3', firstName: 'Daniel', lastName: 'Ssemwanga', email: 'd.ssemwanga@nojalogistics.co.ug', phone: '+256 702 555012', department: 'Finance', role: 'Invoicing Officer', joiningDate: '2024-06-01', status: 'Active', baseSalary: 3800000 },
  { id: 'emp7', companyId: 'c2', branchId: 'b4', firstName: 'Hellen', lastName: 'Mugisha', email: 'h.mugisha@nojalogistics.co.ug', phone: '+256 783 555087', department: 'Sales', role: 'Enterprise Account Rep', joiningDate: '2023-09-15', status: 'Active', baseSalary: 5500000 }
];

// Seed Payrolls
export const SEED_PAYROLLS: PayrollRecord[] = [
  { id: 'pay1', employeeId: 'emp1', employeeName: 'John Kato', month: 'June 2026', baseSalary: 6800000, allowances: 400000, deductions: 1200000, netSalary: 6000000, status: 'Paid', paymentDate: '2026-06-25' },
  { id: 'pay2', employeeId: 'emp2', employeeName: 'Sarah Namubiru', month: 'June 2026', baseSalary: 5200000, allowances: 200000, deductions: 900000, netSalary: 4500000, status: 'Paid', paymentDate: '2026-06-25' },
  { id: 'pay3', employeeId: 'emp3', employeeName: 'Michael Okello', month: 'June 2026', baseSalary: 8500000, allowances: 1000000, deductions: 2100000, netSalary: 7400000, status: 'Approved' },
  { id: 'pay4', employeeId: 'emp5', employeeName: 'Ivan Ssewankambo', month: 'June 2026', baseSalary: 4800000, allowances: 300000, deductions: 800000, netSalary: 4300000, status: 'Paid', paymentDate: '2026-06-26' }
];

// Seed Finance Ledger
export const SEED_FINANCE: FinanceRecord[] = [
  { id: 'f1', companyId: 'c1', branchId: 'b1', date: '2026-06-01', description: 'Enterprise Cloud License Renewal (Stanbic Bank)', category: 'Revenue', type: 'Income', amount: 24500000 },
  { id: 'f2', companyId: 'c1', branchId: 'b1', date: '2026-06-05', description: 'Office Rent Central Kampala', category: 'Rent', type: 'Expense', amount: 3500000 },
  { id: 'f3', companyId: 'c1', branchId: 'b1', date: '2026-06-10', description: 'Roke Telecom Fiber Internet', category: 'Utilities', type: 'Expense', amount: 1800000 },
  { id: 'f4', companyId: 'c1', branchId: 'b1', date: '2026-06-25', description: 'Staff Payroll June 2026', category: 'Payroll', type: 'Expense', amount: 10500000, referenceId: 'pay1' },
  { id: 'f5', companyId: 'c1', branchId: 'b2', date: '2026-06-12', description: 'Airtel Business Ad Campaign', category: 'Marketing', type: 'Expense', amount: 2500000 },
  { id: 'f6', companyId: 'c1', branchId: 'b2', date: '2026-06-18', description: 'UI UX Design Consulting (Kla Central)', category: 'Marketing', type: 'Expense', amount: 4000000 },
  { id: 'f7', companyId: 'c1', branchId: 'b2', date: '2026-06-20', description: 'SaaS Consulting Fees (Centenary Bank)', category: 'Revenue', type: 'Income', amount: 12000000 },
  { id: 'f8', companyId: 'c2', branchId: 'b3', date: '2026-06-02', description: 'Freight Cargo Inbound Invoicing #8812 (Mukwano)', category: 'Revenue', type: 'Income', amount: 48900000 },
  { id: 'f9', companyId: 'c2', branchId: 'b3', date: '2026-06-14', description: 'Warehouse Storage Rental Space (Industrial Area)', category: 'Rent', type: 'Expense', amount: 8000000 },
  { id: 'f10', companyId: 'c2', branchId: 'b3', date: '2026-06-15', description: 'Forklift Maintenance & Spares', category: 'Procurement', type: 'Expense', amount: 1450000 },
  { id: 'f11', companyId: 'c2', branchId: 'b4', date: '2026-06-22', description: 'Entebbe Expressway Operations Tolls', category: 'Utilities', type: 'Expense', amount: 750000 },
  { id: 'f12', companyId: 'c2', branchId: 'b4', date: '2026-06-24', description: 'Kakira Sugar Delivery Deposit', category: 'Revenue', type: 'Income', amount: 18500000 }
];

// Seed Inventory items with scannable Codes
export const SEED_INVENTORY: InventoryItem[] = [
  { id: 'sku-cloud-box', companyId: 'c1', branchId: 'b1', name: 'Local Cloud Server Node', category: 'Hardware', stock: 12, minStockAlert: 5, costPrice: 850000, sellingPrice: 1500000, barcode: 'NODETECH001', supplier: 'Hardware Global Corp' },
  { id: 'sku-switch-poe', companyId: 'c1', branchId: 'b1', name: '24-Port Managed PoE Switch', category: 'Networking', stock: 24, minStockAlert: 10, costPrice: 210000, sellingPrice: 399000, barcode: 'NETSWITCH24', supplier: 'Cisco Distributers Ltd' },
  { id: 'sku-ap-wifi6', companyId: 'c1', branchId: 'b2', name: 'Ubiquiti Wi-Fi 6 Access Point', category: 'Networking', stock: 4, minStockAlert: 8, costPrice: 110000, sellingPrice: 199000, barcode: 'UAP6WIFI', supplier: 'Cisco Distributers Ltd' },
  { id: 'sku-wooden-pallet', companyId: 'c2', branchId: 'b3', name: 'Industrial Heat-Treated Pallets x50', category: 'Supplies', stock: 200, minStockAlert: 50, costPrice: 15000, sellingPrice: 35000, barcode: 'PALLETHT50', supplier: 'Mombasa Timber Products' },
  { id: 'sku-shrink-wrap', companyId: 'c2', branchId: 'b3', name: 'Heavy-Duty Shrink Wrap Rolls x10', category: 'Packaging', stock: 3, minStockAlert: 10, costPrice: 45000, sellingPrice: 90000, barcode: 'WRAPROLLHD', supplier: 'Kampala Pack Depot' },
  { id: 'sku-cargo-straps', companyId: 'c2', branchId: 'b4', name: 'Ratchet Tie-Down Cargo Straps', category: 'Safety', stock: 85, minStockAlert: 20, costPrice: 8000, sellingPrice: 18000, barcode: 'STRAPRAT100', supplier: 'SecureMove East Africa' }
];

// Seed Procurement orders
export const SEED_PROCUREMENT: ProcurementOrder[] = [
  { id: 'po-101', companyId: 'c1', branchId: 'b1', itemName: 'Vite Premium Business Server Rack', category: 'Hardware', quantity: 2, estimatedCost: 3200000, supplier: 'Global Rack-Mount Co', status: 'Approved', requestedBy: 'John Kato', createdAt: '2026-06-10' },
  { id: 'po-102', companyId: 'c1', branchId: 'b2', itemName: 'Developer Workspace Monitors', category: 'Office Hardware', quantity: 6, estimatedCost: 1800000, supplier: 'ViewMax Solutions', status: 'Pending Approval', requestedBy: 'Michael Okello', createdAt: '2026-06-25' },
  { id: 'po-103', companyId: 'c2', branchId: 'b3', itemName: 'Heavy-Duty Shrink Wrap Rolls x20', category: 'Packaging', quantity: 20, estimatedCost: 900000, supplier: 'Kampala Pack Depot', status: 'Ordered', requestedBy: 'Ivan Ssewankambo', createdAt: '2026-06-18' }
];

// Seed CRM leads
export const SEED_CRM_LEADS: CRMLead[] = [
  { id: 'crm-1', companyId: 'c1', branchId: 'b1', name: 'Alex Henderson', companyName: 'Nile Breweries Ltd', email: 'a.henderson@nilebreweries.com', phone: '+256 700 946088', status: 'Qualified', value: 45000000, notes: 'Highly interested in migration of local server node systems. Requesting pricing tables.', updatedAt: '2026-06-24' },
  { id: 'crm-2', companyId: 'c1', branchId: 'b2', name: 'Brittany Spears', companyName: 'Sheraton Kampala Hotel', email: 'it.admin@sheratonkampala.com', phone: '+256 772 555101', status: 'Proposal Sent', value: 18500000, notes: 'Sent quote for office network switch configurations & access points setup.', updatedAt: '2026-06-28' },
  { id: 'crm-3', companyId: 'c1', branchId: 'b1', name: 'Robert Vance', companyName: 'Vance Agro-Processing Ltd', email: 'bob@vanceagro.co.ug', phone: '+256 752 555981', status: 'New', value: 5000000, notes: 'Inquired about simple SaaS consultation for cold-room automation.', updatedAt: '2026-06-29' },
  { id: 'crm-4', companyId: 'c2', branchId: 'b3', name: 'Herman Gorter', companyName: 'Mukwano Group of Companies', email: 'gorter@mukwano.co.ug', phone: '+256 414 555448', status: 'Won', value: 120000000, notes: 'Signed 12-month freight delivery and warehouse storage agreement.', updatedAt: '2026-06-20' },
  { id: 'crm-5', companyId: 'c2', branchId: 'b4', name: 'Teresa Lisbon', companyName: 'Mbarara Transport Ltd', email: 'tlisbon@mbararatrans.co.ug', phone: '+256 782 555124', status: 'Contacted', value: 35000000, notes: 'discussing logistics cargo insurance and safety strap requirements.', updatedAt: '2026-06-26' }
];

// Seed Sales transactions
export const SEED_SALES: SalesRecord[] = [
  { id: 'sal1', companyId: 'c1', branchId: 'b1', customerName: 'Nile Breweries Ltd', date: '2026-06-03', items: [{ itemName: 'Local Cloud Server Node', quantity: 2, price: 1500000 }, { itemName: '24-Port Managed PoE Switch', quantity: 1, price: 399000 }], totalAmount: 3399000, status: 'Completed' },
  { id: 'sal2', companyId: 'c1', branchId: 'b2', customerName: 'Jinja Tech Incubator', date: '2026-06-15', items: [{ itemName: 'Ubiquiti Wi-Fi 6 Access Point', quantity: 4, price: 199000 }], totalAmount: 796000, status: 'Completed' },
  { id: 'sal3', companyId: 'c2', branchId: 'b3', customerName: 'Mukwano Group of Companies', date: '2026-06-21', items: [{ itemName: 'Industrial Heat-Treated Pallets x50', quantity: 10, price: 35000 }], totalAmount: 350000, status: 'Completed' }
];

// Seed Audit Logs
export const SEED_AUDIT_LOGS: AuditLog[] = [
  { id: 'log1', timestamp: '2026-06-29T08:00:00.000Z', userId: 'usr-admin', userName: 'Malotrinax', role: 'Administrator', action: 'User login', module: 'System', details: 'Successful login on Chrome/macOS from Kampala HQ', ipAddress: '197.239.1.4' },
  { id: 'log2', timestamp: '2026-06-29T08:01:15.000Z', userId: 'usr-admin', userName: 'Malotrinax', role: 'Administrator', action: 'Create CRM Lead', module: 'CRM', details: 'Added lead Robert Vance for Vance Agro-Processing Ltd', ipAddress: '197.239.1.4' },
  { id: 'log3', timestamp: '2026-06-29T08:03:10.000Z', userId: 'usr-admin', userName: 'Malotrinax', role: 'Administrator', action: 'Run Stock Check', module: 'Inventory', details: 'Auto audit run. Flagged: UAP6WIFI access point under safety buffer.', ipAddress: '197.239.1.4' }
];

// Seed Notifications
export const SEED_NOTIFICATIONS: Notification[] = [
  { id: 'n1', timestamp: '2026-06-29T07:45:00.000Z', title: 'Low Inventory Alert', message: 'Ubiquiti Wi-Fi 6 Access Point is below safety buffer at Jinja Tech Hub (Stock: 4).', type: 'warning', read: false },
  { id: 'n2', timestamp: '2026-06-29T07:15:00.000Z', title: 'New CRM Lead Assigned', message: 'Robert Vance of Vance Agro-Processing Ltd added to Kampala pipeline.', type: 'info', read: false },
  { id: 'n3', timestamp: '2026-06-29T05:00:00.000Z', title: 'Payroll Ready For Approval', message: 'Michael Okello payroll for June 2026 has been finalized and is waiting for your review.', type: 'warning', read: true },
  { id: 'n4', timestamp: '2026-06-29T01:00:00.000Z', title: 'Finance Report Compiled', message: 'Monthly balance sheets generated with a positive net profit ratio.', type: 'success', read: true }
];

// Initial Email system messages
export const SEED_EMAILS: EmailMessage[] = [
  { id: 'em1', sender: 'noreply@nojaerp.co.ug', recipient: 'john.kato@nojatech.co.ug', subject: 'Your Payslip for June 2026 is Available', body: 'Dear John Kato,\n\nYour salary receipt for June 2026 is processed.\nNet credited: UGX 6,000,000.\n\nWarm regards,\nNoja HR team', sentAt: '2026-06-25T14:30:00.000Z', status: 'sent', template: 'payroll' },
  { id: 'em2', sender: 'sales@nojatech.co.ug', recipient: 'a.henderson@nilebreweries.com', subject: 'Noja Server Nodes Pricing Proposal', body: 'Hi Alex,\n\nFollowing our discussion, please find attached the quotation sheet for our Enterprise nodes.\nWe offer a 15% discount for bulk installations.\n\nBest,\nNoja Sales', sentAt: '2026-06-24T11:15:00.000Z', status: 'sent', template: 'crm' }
];

// LocalStorage helpers with type-safety
export function getStoredState<T>(key: string, defaultVal: T): T {
  try {
    const val = localStorage.getItem(`noja_erp_ug_${key}`);
    return val ? JSON.parse(val) : defaultVal;
  } catch {
    return defaultVal;
  }
}

export function setStoredState<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`noja_erp_ug_${key}`, JSON.stringify(value));
  } catch (err) {
    console.error('LocalStorage write error', err);
  }
}

// Global ERP storage orchestrator
export interface ERPState {
  companies: Company[];
  branches: Branch[];
  employees: Employee[];
  payrolls: PayrollRecord[];
  finance: FinanceRecord[];
  inventory: InventoryItem[];
  procurement: ProcurementOrder[];
  crmLeads: CRMLead[];
  sales: SalesRecord[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  emails: EmailMessage[];
}

export function loadFullERPState(): ERPState {
  return {
    companies: getStoredState<Company[]>('companies', SEED_COMPANIES),
    branches: getStoredState<Branch[]>('branches', SEED_BRANCHES),
    employees: getStoredState<Employee[]>('employees', SEED_EMPLOYEES),
    payrolls: getStoredState<PayrollRecord[]>('payrolls', SEED_PAYROLLS),
    finance: getStoredState<FinanceRecord[]>('finance', SEED_FINANCE),
    inventory: getStoredState<InventoryItem[]>('inventory', SEED_INVENTORY),
    procurement: getStoredState<ProcurementOrder[]>('procurement', SEED_PROCUREMENT),
    crmLeads: getStoredState<CRMLead[]>('crmLeads', SEED_CRM_LEADS),
    sales: getStoredState<SalesRecord[]>('sales', SEED_SALES),
    auditLogs: getStoredState<AuditLog[]>('auditLogs', SEED_AUDIT_LOGS),
    notifications: getStoredState<Notification[]>('notifications', SEED_NOTIFICATIONS),
    emails: getStoredState<EmailMessage[]>('emails', SEED_EMAILS),
  };
}

export function saveFullERPState(state: ERPState): void {
  setStoredState('companies', state.companies);
  setStoredState('branches', state.branches);
  setStoredState('employees', state.employees);
  setStoredState('payrolls', state.payrolls);
  setStoredState('finance', state.finance);
  setStoredState('inventory', state.inventory);
  setStoredState('procurement', state.procurement);
  setStoredState('crmLeads', state.crmLeads);
  setStoredState('sales', state.sales);
  setStoredState('auditLogs', state.auditLogs);
  setStoredState('notifications', state.notifications);
  setStoredState('emails', state.emails);
}

export function addAuditEntry(
  state: ERPState,
  action: string,
  module: AuditLog['module'],
  details: string,
  user: { name: string; role: string; id: string }
): ERPState {
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    role: user.role,
    action,
    module,
    details,
    ipAddress: '192.168.1.10'
  };
  const updatedLogs = [newLog, ...state.auditLogs];
  const newState = { ...state, auditLogs: updatedLogs };
  saveFullERPState(newState);
  return newState;
}

export function addNotificationEntry(
  state: ERPState,
  title: string,
  message: string,
  type: Notification['type']
): ERPState {
  const newNotification: Notification = {
    id: `n-${Date.now()}`,
    timestamp: new Date().toISOString(),
    title,
    message,
    type,
    read: false
  };
  const updatedNotifications = [newNotification, ...state.notifications];
  const newState = { ...state, notifications: updatedNotifications };
  saveFullERPState(newState);
  return newState;
}
