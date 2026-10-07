export type NavPage =
  | 'dashboard'
  | 'quotations'
  | 'suppliers'
  | 'products'
  | 'pricelist'
  | 'comparison'
  | 'history'
  | 'calculator'
  | 'purchasing'
  | 'inventory'
  | 'stock_in'
  | 'stock_out'
  | 'adjustments'
  | 'barcode'
  | 'rfq'
  | 'reports'
  | 'favorites'
  | 'notifications'
  | 'users'
  | 'audit'
  | 'drive'
  | 'settings';

export type UserRole =
  | 'SUPER ADMIN'
  | 'ADMIN'
  | 'PURCHASING STAFF'
  | 'WAREHOUSE STAFF'
  | 'VIEWER';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  username: string;
  passwordHash: string; // SHA-256 hex digest (never plain text)
  role: UserRole;
  department: string;
  status: 'Active' | 'Disabled';
  lastLogin: string;
  createdAt: string;
  twoFactorEnabled?: boolean;
  isDemo?: boolean;
}

export type QuotationStatus = 'Active' | 'Expiring Soon' | 'Expired';

export interface QuotationItem {
  id: string;
  productId?: string;
  itemName: string;
  category: string;
  brand: string;
  specification: string;
  size: string;
  unit: string;
  quantity: number;
  unitCost: number;
  vatRate: number;
  totalCost: number;
  remarks: string;
}

export interface QuotationAttachment {
  name: string;
  type: 'PDF' | 'Excel' | 'Word' | 'JPG' | 'PNG';
  sizeLabel: string;
  dataUrl?: string;
}

export interface Quotation {
  id: string;
  quotationNo: string;
  supplierId: string;
  supplierName: string;
  contactPerson: string;
  contactNumber: string;
  email: string;
  quotationDate: string;
  validUntil: string;
  deliveryTerms: string;
  paymentTerms: string;
  vatStatus: 'VAT Inclusive' | 'VAT Exclusive' | 'Non-VAT';
  remarks: string;
  attachments: QuotationAttachment[];
  items: QuotationItem[];
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  isArchived?: boolean;
  isDemo?: boolean;
  createdAt: string;
  createdBy?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  contactNumber: string;
  email: string;
  address: string;
  website?: string;
  categories: string[];
  vatStatus: 'VAT Registered' | 'Non-VAT';
  paymentTerms: string;
  deliveryTerms: string;
  rating: number;
  remarks: string;
  status?: 'Active' | 'Inactive';
  isDemo?: boolean;
}

export interface Product {
  id: string;
  code: string;
  sku?: string;
  barcode?: string;
  qrCode?: string;
  name: string;
  category: string;
  subcategory: string;
  brand: string;
  model?: string;
  specification: string;
  size: string;
  unit: string;
  description: string;
  supplierId: string;
  supplierName: string;
  currentCost: number;
  averageCost?: number;
  standardCost?: number;
  markupPercent: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  maxStock?: number;
  location?: string;
  status?: 'Active' | 'Archived';
  remarks: string;
  isFavorite: boolean;
  isDemo?: boolean;
  updatedAt: string;
}

export interface PriceRecord {
  id: string;
  productId: string;
  productName: string;
  category: string;
  brand: string;
  specification: string;
  size: string;
  unit: string;
  supplierId: string;
  supplierName: string;
  costPrice: number;
  previousPrice?: number;
  markupPercent: number;
  sellingPrice: number;
  quotationId?: string;
  quotationNo?: string;
  dateRecorded: string;
  validUntil?: string;
  remarks?: string;
  isDemo?: boolean;
}

export interface StockTransaction {
  id: string;
  transactionNo: string; // e.g., SI-2026-001 or DR-2026-001
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  date: string; // YYYY-MM-DD
  time?: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  unit: string;
  previousStock: number;
  quantity: number; // positive number
  newStock: number;
  unitCost: number;
  totalCost: number;
  warehouse: string;
  // Stock In fields
  supplierId?: string;
  supplierName?: string;
  poNumber?: string;
  quotationNo?: string;
  purchaseRef?: string;
  receivedBy?: string;
  // Stock Out fields
  releasedTo?: string;
  clientOrDept?: string;
  drNumber?: string;
  referenceNo?: string;
  releasedBy?: string;
  approvedBy?: string;
  remarks: string;
  isDemo?: boolean;
}

export interface StockAdjustment {
  id: string;
  adjustmentNo: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  systemStock: number;
  actualStock: number;
  difference: number; // actualStock - systemStock
  reason:
    | 'Damaged items'
    | 'Lost items'
    | 'Expired chemicals'
    | 'Physical inventory correction'
    | 'Counting errors';
  requestedBy: string;
  approvedBy: string;
  status: 'Approved' | 'Pending Approval' | 'Rejected';
  remarks: string;
  isDemo?: boolean;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  quotationNo?: string;
  supplierId: string;
  supplierName: string;
  date: string;
  expectedDeliveryDate: string;
  status: 'Pending' | 'Approved' | 'Received' | 'Cancelled';
  warehouse: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  preparedBy: string;
  approvedBy: string;
  remarks: string;
  isDemo?: boolean;
}

export interface RFQItem {
  id: string;
  productName: string;
  specification: string;
  quantity: number;
  unit: string;
}

export interface RFQ {
  id: string;
  rfqNo: string;
  supplierId: string;
  supplierName: string;
  requestDate: string;
  requiredDate: string;
  requester: string;
  department: string;
  remarks: string;
  items: RFQItem[];
  status: 'Sent' | 'Pending' | 'Quoted';
  isDemo?: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // e.g. 2026-10-06 19:45:00
  user: string;
  role: UserRole;
  action:
    | 'Login'
    | 'Logout'
    | 'Add'
    | 'Edit'
    | 'Delete'
    | 'Archive'
    | 'View'
    | 'Export'
    | 'Price Change'
    | 'Stock In'
    | 'Stock Out'
    | 'Stock Adjustment'
    | 'Purchase Order'
    | 'Quotation Upload'
    | 'User Creation'
    | 'User Disable'
    | 'Permission Change'
    | 'Settings Change';
  module: string;
  recordId: string;
  details: string;
  previousValue?: string;
  newValue?: string;
  ipAddress: string;
  deviceInfo: string;
}

export interface SystemNotification {
  id: string;
  type:
    | 'Low Stock'
    | 'Out of Stock'
    | 'Quotation Expiring'
    | 'Quotation Expired'
    | 'Price Increased'
    | 'Price Decreased'
    | 'Pending Approval'
    | 'Stock Adjustment Request';
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  linkPage: NavPage;
}

export interface CategoryGroup {
  name: string;
  subcategories: string[];
}

export interface AppSettings {
  companyName: string;
  companySubtitle: string;
  companyAddress: string;
  contactNumber: string;
  email: string;
  defaultMarkupPercent: number;
  currencySymbol: string;
  currencyCode: string;
  defaultVatPercent: number;
  defaultValidityDays: number;
  lowStockThreshold: number;
  timezone: string;
  dateFormat: string;
  sessionTimeoutMinutes: number;
  userName: string;
  userRole: string;
}

export interface AppDatabase {
  users: UserAccount[];
  quotations: Quotation[];
  suppliers: Supplier[];
  products: Product[];
  priceHistory: PriceRecord[];
  stockTransactions: StockTransaction[];
  stockAdjustments: StockAdjustment[];
  purchaseOrders: PurchaseOrder[];
  rfqs: RFQ[];
  auditLogs: AuditLogEntry[];
  categories: CategoryGroup[];
  settings: AppSettings;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'warning' | 'error' | 'info';
}
