/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Company {
  id: string;
  name: string;
  industry: string;
  taxId: string;
  address: string;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  location: string;
  manager: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Administrator' | 'HR Manager' | 'Finance Manager' | 'Inventory Specialist' | 'Sales Rep';
  companyId: string;
  branchId: string;
}

export interface AuditLog {
  id: string;
  timestamp: string; // ISO String
  userId: string;
  userName: string;
  role: string;
  action: string;
  module: 'Dashboard' | 'HR' | 'Payroll' | 'Finance' | 'Inventory' | 'Procurement' | 'CRM' | 'Sales' | 'System';
  details: string;
  ipAddress: string;
}

export interface Notification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
}

export interface CRMLead {
  id: string;
  companyId: string;
  branchId: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Proposal Sent' | 'Won' | 'Lost';
  value: number;
  notes: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  companyId: string;
  branchId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: 'Engineering' | 'Sales' | 'HR' | 'Finance' | 'Operations' | 'Marketing';
  role: string;
  joiningDate: string;
  status: 'Active' | 'Suspended' | 'On Leave' | 'Terminated';
  baseSalary: number;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // e.g. "June 2026"
  baseSalary: number;
  allowances: number;
  deductions: number; // e.g. Tax/Health Ins.
  netSalary: number;
  status: 'Draft' | 'Approved' | 'Paid';
  paymentDate?: string;
}

export interface FinanceRecord {
  id: string;
  companyId: string;
  branchId: string;
  date: string;
  description: string;
  category: 'Revenue' | 'Payroll' | 'Inventory Cost' | 'Marketing' | 'Utilities' | 'Rent' | 'Procurement';
  type: 'Income' | 'Expense';
  amount: number;
  referenceId?: string; // Links to payroll ID or sales invoice ID
}

export interface InventoryItem {
  id: string; // SKU or generated Code
  companyId: string;
  branchId: string;
  name: string;
  category: string;
  stock: number;
  minStockAlert: number;
  costPrice: number;
  sellingPrice: number;
  barcode: string; // Standard alphanumeric barcode
  supplier: string;
}

export interface ProcurementOrder {
  id: string;
  companyId: string;
  branchId: string;
  itemName: string;
  category: string;
  quantity: number;
  estimatedCost: number;
  supplier: string;
  status: 'Pending Approval' | 'Approved' | 'Ordered' | 'Received' | 'Rejected';
  requestedBy: string;
  createdAt: string;
}

export interface SalesRecord {
  id: string;
  companyId: string;
  branchId: string;
  customerName: string;
  date: string;
  items: Array<{ itemName: string; quantity: number; price: number }>;
  totalAmount: number;
  status: 'Pending' | 'Completed' | 'Refunded';
}

export interface EmailMessage {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'sent' | 'draft' | 'failed';
  template: string;
}
