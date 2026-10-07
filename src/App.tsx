/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  DollarSign,
  Scale,
  History,
  Calculator,
  FileSpreadsheet,
  BarChart3,
  Star,
  Settings,
  Search,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  QrCode,
  Bell,
  Shield,
  ShieldAlert,
  Printer,
  FolderDown,
  Cloud,
} from 'lucide-react';
import {
  AppDatabase,
  AppSettings,
  AuditLogEntry,
  NavPage,
  PriceRecord,
  Product,
  PurchaseOrder,
  Quotation,
  RFQ,
  StockAdjustment,
  StockTransaction,
  Supplier,
  ToastMessage,
  UserAccount,
} from './types';
import { INITIAL_DATABASE } from './initialData';
import { getManilaTimestamp, triggerSystemPrint } from './utils';
import { downloadAllFilesAsFolderZip } from './downloadPackage';
import { LoginPage } from './components/LoginPage';
import { DashboardView } from './components/DashboardView';
import { QuotationsView } from './components/QuotationsView';
import { SuppliersView } from './components/SuppliersView';
import { ProductsView } from './components/ProductsView';
import { PriceListView } from './components/PriceListView';
import { PriceComparisonView } from './components/PriceComparisonView';
import { PriceHistoryView } from './components/PriceHistoryView';
import { MarkupCalculatorView } from './components/MarkupCalculatorView';
import { PurchasingView } from './components/PurchasingView';
import { InventorySuiteView } from './components/InventorySuiteView';
import { BarcodeView } from './components/BarcodeView';
import { RFQView } from './components/RFQView';
import { ReportsView } from './components/ReportsView';
import { UsersView } from './components/UsersView';
import { AuditNotificationsView } from './components/AuditNotificationsView';
import { SettingsView } from './components/SettingsView';
import { GoogleDriveView } from './components/GoogleDriveView';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { SmsiLogo } from './components/SmsiLogo';
import { PrintSectionBar, PrintFooterSignatures } from './components/PrintSectionBar';

const STORAGE_KEY = 'SOL_CLEANING_MATERIALS_DB_V2';
const AUTH_KEY = 'SOL_CLEANING_MATERIALS_AUTH_V2';
const AUTH_USER_ID_KEY = 'SOL_CLEANING_MATERIALS_USER_ID_V2';

export default function App() {
  // Persistent Database State in LocalStorage (with automatic schema upgrade)
  const [db, setDb] = useState<AppDatabase>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.quotations)) {
          return {
            ...INITIAL_DATABASE,
            ...parsed,
            users: Array.isArray(parsed.users) ? parsed.users : INITIAL_DATABASE.users,
            stockTransactions: Array.isArray(parsed.stockTransactions)
              ? parsed.stockTransactions
              : INITIAL_DATABASE.stockTransactions,
            stockAdjustments: Array.isArray(parsed.stockAdjustments)
              ? parsed.stockAdjustments
              : INITIAL_DATABASE.stockAdjustments,
            purchaseOrders: Array.isArray(parsed.purchaseOrders)
              ? parsed.purchaseOrders
              : INITIAL_DATABASE.purchaseOrders,
            auditLogs: Array.isArray(parsed.auditLogs)
              ? parsed.auditLogs
              : INITIAL_DATABASE.auditLogs,
          };
        }
      }
    } catch (err) {
      console.error('Failed to read LocalStorage database:', err);
    }
    return INITIAL_DATABASE;
  });

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTH_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      return localStorage.getItem(AUTH_USER_ID_KEY) || 'USR-001';
    } catch {
      return 'USR-001';
    }
  });

  const currentUser: UserAccount =
    db.users.find((u) => u.id === currentUserId) || db.users[0] || INITIAL_DATABASE.users[0];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (err) {
      console.error('Failed to save LocalStorage database:', err);
    }
  }, [db]);

  // Navigation & UI Layout State
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPrintPreviewMode, setIsPrintPreviewMode] = useState(false);

  // Global Search Bar State
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Cross-View Modal Triggers
  const [openAddQuotationModal, setOpenAddQuotationModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
  const [openAddProductModal, setOpenAddProductModal] = useState(false);
  const [openAddSupplierModal, setOpenAddSupplierModal] = useState(false);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (text: string, type: ToastMessage['type'] = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  // Delete Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Helper to append an immutable Audit Log entry (#28)
  const createAuditEntry = (
    action: AuditLogEntry['action'],
    module: string,
    recordId: string,
    details: string,
    previousValue?: string,
    newValue?: string,
    userOverride?: UserAccount
  ): AuditLogEntry => {
    const u = userOverride || currentUser;
    return {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: getManilaTimestamp(),
      user: u.name,
      role: u.role,
      action,
      module,
      recordId,
      details,
      previousValue,
      newValue,
      ipAddress: '192.168.1.101 (Asia/Manila)',
      deviceInfo: 'Authorized Workstation Terminal',
    };
  };

  // Login / Logout Handlers (#3)
  const handleLogin = (user: UserAccount, remember: boolean) => {
    setIsAuthenticated(true);
    setCurrentUserId(user.id);
    if (remember) {
      try {
        localStorage.setItem(AUTH_KEY, 'true');
        localStorage.setItem(AUTH_USER_ID_KEY, user.id);
      } catch {
        // ignore
      }
    }
    const stamp = getManilaTimestamp();
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === user.id ? { ...u, lastLogin: stamp } : u)),
      auditLogs: [
        createAuditEntry(
          'Login',
          'Authentication Terminal',
          user.id,
          `Authenticated session started for ${user.name} (${user.role})`,
          undefined,
          undefined,
          user
        ),
        ...prev.auditLogs,
      ],
    }));
    showToast(`Welcome back, ${user.name} (${user.role}).`);
  };

  const handleLogout = () => {
    setDb((prev) => ({
      ...prev,
      auditLogs: [
        createAuditEntry(
          'Logout',
          'Authentication Terminal',
          currentUser.id,
          `Session signed out by ${currentUser.name}`
        ),
        ...prev.auditLogs,
      ],
    }));
    setIsAuthenticated(false);
    try {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(AUTH_USER_ID_KEY);
    } catch {
      // ignore
    }
  };

  const handleResetPasswordByUsername = (
    usernameOrEmail: string,
    newPasswordHash: string
  ): boolean => {
    const clean = usernameOrEmail.toLowerCase();
    const target = db.users.find(
      (u) =>
        (u.username.toLowerCase() === clean || u.email.toLowerCase() === clean) &&
        u.status === 'Active'
    );
    if (!target) return false;

    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === target.id ? { ...u, passwordHash: newPasswordHash } : u
      ),
      auditLogs: [
        createAuditEntry(
          'Edit',
          'Authentication / Password Reset',
          target.id,
          `Password SHA-256 hash updated for ${target.name} (${target.username})`,
          'Old SHA-256 Hash',
          'New SHA-256 Hash',
          target
        ),
        ...prev.auditLogs,
      ],
    }));
    return true;
  };

  // User Management Handlers (#5)
  const handleSaveUser = (user: UserAccount, isEdit: boolean) => {
    setDb((prev) => ({
      ...prev,
      users: isEdit
        ? prev.users.map((u) => (u.id === user.id ? user : u))
        : [...prev.users, user],
      auditLogs: [
        createAuditEntry(
          isEdit ? 'Permission Change' : 'User Creation',
          'Users & RBAC',
          user.id,
          isEdit
            ? `Updated user profile/role for ${user.name} (${user.role})`
            : `Created new user account ${user.name} (${user.username}) as ${user.role}`
        ),
        ...prev.auditLogs,
      ],
    }));
    showToast(isEdit ? 'User account updated.' : 'New user account created.');
  };

  const handleToggleUserStatus = (userId: string) => {
    const target = db.users.find((u) => u.id === userId);
    if (!target || target.id === 'USR-001') return;
    const nextStatus = target.status === 'Active' ? 'Disabled' : 'Active';
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId ? { ...u, status: nextStatus } : u
      ),
      auditLogs: [
        createAuditEntry(
          'User Disable',
          'Users & RBAC',
          userId,
          `Account status changed for ${target.name}`,
          target.status,
          nextStatus
        ),
        ...prev.auditLogs,
      ],
    }));
    showToast(`User ${target.name} is now ${nextStatus}.`);
  };

  const handleResetUserPassword = (userId: string, newPasswordHash: string) => {
    const target = db.users.find((u) => u.id === userId);
    if (!target) return;
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId ? { ...u, passwordHash: newPasswordHash } : u
      ),
      auditLogs: [
        createAuditEntry(
          'Edit',
          'Users & RBAC',
          userId,
          `Password hash reset by Super Admin for ${target.name}`
        ),
        ...prev.auditLogs,
      ],
    }));
    showToast(`Password hash updated for ${target.name}.`);
  };

  // Save Quotation & Append Historical Price Records (Never Overwrite Old Prices) (#10, #14)
  const handleSaveQuotation = (quotation: Quotation, isEdit: boolean) => {
    setDb((prev) => {
      const updatedQuotations = isEdit
        ? prev.quotations.map((q) => (q.id === quotation.id ? quotation : q))
        : [quotation, ...prev.quotations];

      const newPriceRecords: PriceRecord[] = [];
      const updatedProducts = [...prev.products];
      const defaultMarkup = prev.settings.defaultMarkupPercent || 30;

      quotation.items.forEach((item) => {
        const existingHistory = [...prev.priceHistory, ...newPriceRecords]
          .filter(
            (ph) =>
              ph.productName.toLowerCase() === item.itemName.toLowerCase() &&
              ph.supplierName.toLowerCase() === quotation.supplierName.toLowerCase()
          )
          .sort((a, b) => b.dateRecorded.localeCompare(a.dateRecorded));

        const latestExisting = existingHistory[0];
        if (!isEdit || !latestExisting || latestExisting.costPrice !== item.unitCost) {
          const sellPrice = Number((item.unitCost * (1 + defaultMarkup / 100)).toFixed(2));
          newPriceRecords.push({
            id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            productId: item.productId || `prod-${Date.now()}`,
            productName: item.itemName,
            category: item.category,
            brand: item.brand,
            specification: item.specification,
            size: item.size,
            unit: item.unit,
            supplierId: quotation.supplierId,
            supplierName: quotation.supplierName,
            costPrice: item.unitCost,
            previousPrice: latestExisting?.costPrice,
            markupPercent: defaultMarkup,
            sellingPrice: sellPrice,
            quotationId: quotation.id,
            quotationNo: quotation.quotationNo,
            dateRecorded: quotation.quotationDate,
            validUntil: quotation.validUntil,
            remarks: item.remarks || quotation.remarks,
          });
        }

        const prodIndex = updatedProducts.findIndex(
          (p) =>
            p.id === item.productId ||
            p.name.toLowerCase() === item.itemName.toLowerCase()
        );
        if (prodIndex >= 0) {
          const p = updatedProducts[prodIndex];
          updatedProducts[prodIndex] = {
            ...p,
            currentCost: item.unitCost,
            sellingPrice: Number((item.unitCost * (1 + p.markupPercent / 100)).toFixed(2)),
            supplierId: quotation.supplierId,
            supplierName: quotation.supplierName,
            updatedAt: quotation.quotationDate,
          };
        }
      });

      return {
        ...prev,
        quotations: updatedQuotations,
        products: updatedProducts,
        priceHistory: [...newPriceRecords, ...prev.priceHistory],
        auditLogs: [
          createAuditEntry(
            isEdit ? 'Edit' : 'Quotation Upload',
            'Quotations',
            quotation.quotationNo,
            `${isEdit ? 'Updated' : 'Recorded'} quotation ${quotation.quotationNo} from ${quotation.supplierName} (${quotation.items.length} items)`
          ),
          ...prev.auditLogs,
        ],
      };
    });

    showToast(isEdit ? 'Quotation updated successfully.' : 'Quotation added successfully.');
  };

  const handleDuplicateQuotation = (quotation: Quotation) => {
    const copy: Quotation = {
      ...quotation,
      id: `quot-${Date.now()}`,
      quotationNo: `${quotation.quotationNo}-COPY`,
      quotationDate: new Date().toISOString().split('T')[0],
      isDemo: false,
      items: quotation.items.map((it) => ({
        ...it,
        id: `qi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      })),
    };
    setDb((prev) => ({
      ...prev,
      quotations: [copy, ...prev.quotations],
      auditLogs: [
        createAuditEntry(
          'Add',
          'Quotations',
          copy.quotationNo,
          `Duplicated quotation ${quotation.quotationNo} as ${copy.quotationNo}`
        ),
        ...prev.auditLogs,
      ],
    }));
    showToast('Quotation duplicated successfully.');
  };

  const handleDeleteQuotation = (quotation: Quotation) => {
    setConfirmDialog({
      title: `Delete Quotation ${quotation.quotationNo}?`,
      message: `Are you sure you want to delete quotation ${quotation.quotationNo} from ${quotation.supplierName}? Historical price records will remain intact.`,
      onConfirm: () => {
        setDb((prev) => ({
          ...prev,
          quotations: prev.quotations.filter((q) => q.id !== quotation.id),
          auditLogs: [
            createAuditEntry(
              'Delete',
              'Quotations',
              quotation.quotationNo,
              `Deleted quotation ${quotation.quotationNo} (${quotation.supplierName})`
            ),
            ...prev.auditLogs,
          ],
        }));
        setConfirmDialog(null);
        showToast('Quotation deleted successfully.');
      },
    });
  };

  // Supplier Handlers (#7)
  const handleSaveSupplier = (supplier: Supplier, isEdit: boolean) => {
    setDb((prev) => ({
      ...prev,
      suppliers: isEdit
        ? prev.suppliers.map((s) => (s.id === supplier.id ? supplier : s))
        : [supplier, ...prev.suppliers],
      auditLogs: [
        createAuditEntry(
          isEdit ? 'Edit' : 'Add',
          'Suppliers',
          supplier.id,
          `${isEdit ? 'Updated' : 'Added'} supplier ${supplier.name}`
        ),
        ...prev.auditLogs,
      ],
    }));
    showToast(isEdit ? 'Supplier updated successfully.' : 'Supplier added successfully.');
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setConfirmDialog({
      title: `Delete Supplier "${supplier.name}"?`,
      message: `Are you sure you want to remove ${supplier.name} from the supplier database?`,
      onConfirm: () => {
        setDb((prev) => ({
          ...prev,
          suppliers: prev.suppliers.filter((s) => s.id !== supplier.id),
          auditLogs: [
            createAuditEntry(
              'Delete',
              'Suppliers',
              supplier.id,
              `Removed supplier ${supplier.name}`
            ),
            ...prev.auditLogs,
          ],
        }));
        setConfirmDialog(null);
        showToast('Supplier deleted successfully.');
      },
    });
  };

  // Product Handlers (#8, #9)
  const handleSaveProduct = (product: Product, isEdit: boolean) => {
    setDb((prev) => {
      const existingProd = prev.products.find((p) => p.id === product.id);
      const updatedProducts = isEdit
        ? prev.products.map((p) => (p.id === product.id ? product : p))
        : [product, ...prev.products];

      const newHistory = [...prev.priceHistory];
      if (!isEdit || (existingProd && existingProd.currentCost !== product.currentCost)) {
        newHistory.unshift({
          id: `ph-${Date.now()}`,
          productId: product.id,
          productName: product.name,
          category: product.category,
          brand: product.brand,
          specification: product.specification,
          size: product.size,
          unit: product.unit,
          supplierId: product.supplierId,
          supplierName: product.supplierName,
          costPrice: product.currentCost,
          previousPrice: existingProd?.currentCost,
          markupPercent: product.markupPercent,
          sellingPrice: product.sellingPrice,
          quotationNo: isEdit ? 'Catalog Price Update' : 'Initial Catalog Entry',
          dateRecorded: new Date().toISOString().split('T')[0],
          remarks: product.remarks,
        });
      }

      return {
        ...prev,
        products: updatedProducts,
        priceHistory: newHistory,
        auditLogs: [
          createAuditEntry(
            isEdit && existingProd?.currentCost !== product.currentCost
              ? 'Price Change'
              : isEdit
              ? 'Edit'
              : 'Add',
            'Products Catalog',
            product.sku || product.code,
            `${isEdit ? 'Updated' : 'Added'} product ${product.name}`,
            existingProd ? `₱${existingProd.currentCost}` : undefined,
            `₱${product.currentCost}`
          ),
          ...prev.auditLogs,
        ],
      };
    });

    showToast(
      isEdit ? 'Product updated successfully.' : 'Product added successfully.'
    );
  };

  const handleDeleteProduct = (product: Product) => {
    setConfirmDialog({
      title: `Delete Product "${product.name}"?`,
      message: `Are you sure you want to delete ${product.name} (${product.code}) from the product master list?`,
      onConfirm: () => {
        setDb((prev) => ({
          ...prev,
          products: prev.products.filter((p) => p.id !== product.id),
          auditLogs: [
            createAuditEntry(
              'Delete',
              'Products Catalog',
              product.sku || product.code,
              `Deleted product ${product.name}`
            ),
            ...prev.auditLogs,
          ],
        }));
        setConfirmDialog(null);
        showToast('Product deleted successfully.');
      },
    });
  };

  const handleToggleFavorite = (productId: string) => {
    setDb((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === productId ? { ...p, isFavorite: !p.isFavorite } : p
      ),
    }));
    showToast('Product favorite status updated.');
  };

  const handleAddCategory = (categoryName: string, subcategoryName?: string) => {
    setDb((prev) => {
      const idx = prev.categories.findIndex(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase()
      );
      if (idx >= 0) {
        const updated = [...prev.categories];
        const existingSubs = updated[idx].subcategories;
        if (subcategoryName && !existingSubs.includes(subcategoryName)) {
          updated[idx] = {
            ...updated[idx],
            subcategories: [...existingSubs, subcategoryName],
          };
        }
        return { ...prev, categories: updated };
      } else {
        return {
          ...prev,
          categories: [
            ...prev.categories,
            {
              name: categoryName,
              subcategories: subcategoryName ? [subcategoryName] : ['General'],
            },
          ],
        };
      }
    });
    showToast(`Category "${categoryName}" saved successfully.`);
  };

  const handleAddPriceRecord = (record: PriceRecord) => {
    setDb((prev) => ({
      ...prev,
      priceHistory: [record, ...prev.priceHistory],
      products: prev.products.map((p) =>
        p.id === record.productId || p.name.toLowerCase() === record.productName.toLowerCase()
          ? {
              ...p,
              currentCost: record.costPrice,
              markupPercent: record.markupPercent,
              sellingPrice: record.sellingPrice,
              supplierId: record.supplierId,
              supplierName: record.supplierName,
              updatedAt: record.dateRecorded,
            }
          : p
      ),
      auditLogs: [
        createAuditEntry(
          'Price Change',
          'Price List',
          record.quotationNo || record.id,
          `Logged new price for ${record.productName} from ${record.supplierName}`,
          record.previousPrice ? `₱${record.previousPrice}` : undefined,
          `₱${record.costPrice}`
        ),
        ...prev.auditLogs,
      ],
    }));
    showToast('Product price updated successfully.');
  };

  const handleApplyProductMarkup = (
    productId: string,
    costPrice: number,
    markupPercent: number,
    sellingPrice: number
  ) => {
    const prod = db.products.find((p) => p.id === productId);
    if (!prod) return;
    handleSaveProduct(
      {
        ...prod,
        currentCost: costPrice,
        markupPercent,
        sellingPrice,
      },
      true
    );
  };

  // Inventory Stock In Handler (#17, #21 Weighted Average Costing)
  const handleRecordStockIn = (
    txInput: Omit<StockTransaction, 'id' | 'previousStock' | 'newStock'>
  ) => {
    setDb((prev) => {
      const targetProd = prev.products.find((p) => p.id === txInput.productId);
      if (!targetProd) return prev;

      const prevStock = targetProd.stock;
      const newStock = prevStock + txInput.quantity;
      const prevAvgCost = targetProd.averageCost || targetProd.currentCost;
      const weightedAvg =
        newStock > 0
          ? Number(
              ((prevStock * prevAvgCost + txInput.quantity * txInput.unitCost) / newStock).toFixed(2)
            )
          : txInput.unitCost;

      const fullTx: StockTransaction = {
        ...txInput,
        id: `stx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        previousStock: prevStock,
        newStock,
      };

      return {
        ...prev,
        products: prev.products.map((p) =>
          p.id === targetProd.id
            ? {
                ...p,
                stock: newStock,
                currentCost: txInput.unitCost,
                averageCost: weightedAvg,
                updatedAt: txInput.date,
              }
            : p
        ),
        stockTransactions: [fullTx, ...prev.stockTransactions],
        auditLogs: [
          createAuditEntry(
            'Stock In',
            'Inventory / Stock In',
            fullTx.transactionNo,
            `Product: ${targetProd.name} · Quantity: +${txInput.quantity} ${targetProd.unit} · PO/Ref: ${txInput.poNumber || fullTx.transactionNo}`,
            `Stock: ${prevStock}`,
            `Stock: ${newStock}`
          ),
          ...prev.auditLogs,
        ],
      };
    });
    showToast(`Stock In (+${txInput.quantity} ${txInput.unit}) recorded for ${txInput.productName}.`);
  };

  // Inventory Stock Out Handler (#18)
  const handleRecordStockOut = (
    txInput: Omit<StockTransaction, 'id' | 'previousStock' | 'newStock'>,
    allowNegative: boolean
  ): boolean => {
    const targetProd = db.products.find((p) => p.id === txInput.productId);
    if (!targetProd) return false;

    if (targetProd.stock < txInput.quantity && !allowNegative) {
      showToast(
        `Insufficient stock for ${targetProd.name} (Available: ${targetProd.stock} ${targetProd.unit}). Negative stock prevented.`,
        'error'
      );
      return false;
    }

    const prevStock = targetProd.stock;
    const newStock = prevStock - txInput.quantity;
    const fullTx: StockTransaction = {
      ...txInput,
      id: `stx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      previousStock: prevStock,
      newStock,
    };

    setDb((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === targetProd.id ? { ...p, stock: newStock, updatedAt: txInput.date } : p
      ),
      stockTransactions: [fullTx, ...prev.stockTransactions],
      auditLogs: [
        createAuditEntry(
          'Stock Out',
          'Inventory / Stock Out',
          fullTx.transactionNo,
          `Product: ${targetProd.name} · Quantity: -${txInput.quantity} ${targetProd.unit} · Released To: ${txInput.releasedTo || 'Site'}`,
          `Stock: ${prevStock}`,
          `Stock: ${newStock}`
        ),
        ...prev.auditLogs,
      ],
    }));

    showToast(
      `Stock Out (-${txInput.quantity} ${txInput.unit}) recorded for ${txInput.productName}.`
    );
    return true;
  };

  // Stock Adjustment Handlers (#19)
  const handleCreateAdjustment = (adjInput: Omit<StockAdjustment, 'id'>) => {
    const fullAdj: StockAdjustment = {
      ...adjInput,
      id: `adj-${Date.now()}`,
    };

    setDb((prev) => {
      const isApproved = fullAdj.status === 'Approved';
      const updatedProducts = isApproved
        ? prev.products.map((p) =>
            p.id === fullAdj.productId
              ? { ...p, stock: fullAdj.actualStock, updatedAt: fullAdj.date }
              : p
          )
        : prev.products;

      return {
        ...prev,
        products: updatedProducts,
        stockAdjustments: [fullAdj, ...prev.stockAdjustments],
        auditLogs: [
          createAuditEntry(
            'Stock Adjustment',
            'Inventory / Stock Adjustments',
            fullAdj.adjustmentNo,
            `${fullAdj.productName} physical adjustment (${fullAdj.reason}) — ${fullAdj.status}`,
            `System Stock: ${fullAdj.systemStock}`,
            `Actual Stock: ${fullAdj.actualStock}`
          ),
          ...prev.auditLogs,
        ],
      };
    });

    showToast(
      adjInput.status === 'Approved'
        ? `Adjustment ${adjInput.adjustmentNo} approved and inventory updated.`
        : `Adjustment ${adjInput.adjustmentNo} submitted for Super Admin approval.`
    );
  };

  const handleApproveAdjustment = (adjId: string) => {
    const targetAdj = db.stockAdjustments.find((a) => a.id === adjId);
    if (!targetAdj || targetAdj.status === 'Approved') return;

    setDb((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === targetAdj.productId
          ? { ...p, stock: targetAdj.actualStock, updatedAt: targetAdj.date }
          : p
      ),
      stockAdjustments: prev.stockAdjustments.map((a) =>
        a.id === adjId
          ? { ...a, status: 'Approved', approvedBy: currentUser.name }
          : a
      ),
      auditLogs: [
        createAuditEntry(
          'Stock Adjustment',
          'Inventory / Stock Adjustments',
          targetAdj.adjustmentNo,
          `Approved stock adjustment ${targetAdj.adjustmentNo} for ${targetAdj.productName}`,
          `Stock: ${targetAdj.systemStock}`,
          `Stock: ${targetAdj.actualStock}`
        ),
        ...prev.auditLogs,
      ],
    }));

    showToast(`Stock Adjustment ${targetAdj.adjustmentNo} approved.`);
  };

  // Purchasing / PO Handlers (#25)
  const handleCreatePurchaseOrder = (poInput: Omit<PurchaseOrder, 'id'>) => {
    const fullPo: PurchaseOrder = {
      ...poInput,
      id: `po-${Date.now()}`,
    };
    setDb((prev) => ({
      ...prev,
      purchaseOrders: [fullPo, ...prev.purchaseOrders],
      auditLogs: [
        createAuditEntry(
          'Purchase Order',
          'Purchasing / PO',
          fullPo.poNumber,
          `Issued Purchase Order ${fullPo.poNumber} to ${fullPo.supplierName} (Quotation: ${fullPo.quotationNo || 'Direct'})`
        ),
        ...prev.auditLogs,
      ],
    }));
    showToast(`Purchase Order ${fullPo.poNumber} issued successfully.`);
  };

  const handleReceivePurchaseOrder = (po: PurchaseOrder) => {
    if (po.status === 'Received') return;
    const today = new Date().toISOString().split('T')[0];

    setDb((prev) => {
      const updatedProducts = [...prev.products];
      const newTransactions: StockTransaction[] = [];

      po.items.forEach((item, idx) => {
        const pIdx = updatedProducts.findIndex(
          (p) =>
            p.id === item.productId ||
            p.name.toLowerCase() === item.productName.toLowerCase()
        );
        if (pIdx >= 0) {
          const prod = updatedProducts[pIdx];
          const prevStock = prod.stock;
          const newStock = prevStock + item.quantity;
          const prevAvg = prod.averageCost || prod.currentCost;
          const weightedAvg = Number(
            ((prevStock * prevAvg + item.quantity * item.unitCost) / newStock).toFixed(2)
          );

          updatedProducts[pIdx] = {
            ...prod,
            stock: newStock,
            currentCost: item.unitCost,
            averageCost: weightedAvg,
            updatedAt: today,
          };

          newTransactions.push({
            id: `stx-${Date.now()}-${idx}`,
            transactionNo: `SI-${po.poNumber}-${idx + 1}`,
            type: 'IN',
            date: today,
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku || prod.code,
            barcode: prod.barcode || '',
            unit: prod.unit,
            previousStock: prevStock,
            quantity: item.quantity,
            newStock,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            warehouse: po.warehouse,
            supplierId: po.supplierId,
            supplierName: po.supplierName,
            poNumber: po.poNumber,
            quotationNo: po.quotationNo,
            receivedBy: currentUser.name,
            remarks: `Received from Purchase Order ${po.poNumber}`,
          });
        }
      });

      return {
        ...prev,
        products: updatedProducts,
        stockTransactions: [...newTransactions, ...prev.stockTransactions],
        purchaseOrders: prev.purchaseOrders.map((x) =>
          x.id === po.id ? { ...x, status: 'Received' } : x
        ),
        auditLogs: [
          createAuditEntry(
            'Stock In',
            'Purchasing / PO Receiving',
            po.poNumber,
            `Received all items from Purchase Order ${po.poNumber} (${po.supplierName}) into ${po.warehouse}`
          ),
          ...prev.auditLogs,
        ],
      };
    });

    showToast(`Purchase Order ${po.poNumber} received into warehouse inventory!`);
  };

  // RFQ Handlers (#26)
  const handleSaveRFQ = (rfq: RFQ) => {
    setDb((prev) => ({
      ...prev,
      rfqs: [rfq, ...prev.rfqs],
      auditLogs: [
        createAuditEntry(
          'Add',
          'RFQ Generator',
          rfq.rfqNo,
          `Generated Request for Quotation ${rfq.rfqNo} for ${rfq.supplierName}`
        ),
        ...prev.auditLogs,
      ],
    }));
    showToast(`Request for Quotation ${rfq.rfqNo} generated successfully.`);
  };

  const handleDeleteRFQ = (rfq: RFQ) => {
    setConfirmDialog({
      title: `Delete RFQ ${rfq.rfqNo}?`,
      message: `Are you sure you want to delete Request for Quotation ${rfq.rfqNo}?`,
      onConfirm: () => {
        setDb((prev) => ({
          ...prev,
          rfqs: prev.rfqs.filter((r) => r.id !== rfq.id),
        }));
        setConfirmDialog(null);
        showToast('RFQ deleted successfully.');
      },
    });
  };

  // Settings & Data Management Handlers (#29, #30)
  const handleUpdateSettings = (settings: AppSettings) => {
    setDb((prev) => ({
      ...prev,
      settings,
      auditLogs: [
        createAuditEntry(
          'Settings Change',
          'System Settings',
          'SETTINGS',
          `Updated corporate profile & default calculation parameters`
        ),
        ...prev.auditLogs,
      ],
    }));
    showToast('System settings updated successfully.');
  };

  const handleRestoreDatabase = (newDb: AppDatabase) => {
    setDb({
      ...INITIAL_DATABASE,
      ...newDb,
    });
    showToast('Database restored from backup successfully.');
  };

  const handleResetToDefaultDemo = () => {
    setConfirmDialog({
      title: 'Reset to Default Sample Database?',
      message:
        'This will restore all initial sample suppliers, quotations, products, inventory transactions, and price histories.',
      onConfirm: () => {
        setDb(INITIAL_DATABASE);
        setConfirmDialog(null);
        showToast('Database reset to default sample records.');
      },
    });
  };

  const handlePurgeDemoData = () => {
    setConfirmDialog({
      title: 'Delete All Labeled DEMO DATA?',
      message:
        'This will remove all sample records marked as DEMO DATA while preserving your custom records.',
      onConfirm: () => {
        setDb((prev) => ({
          ...prev,
          quotations: prev.quotations.filter((q) => !q.isDemo),
          suppliers: prev.suppliers.filter((s) => !s.isDemo),
          products: prev.products.filter((p) => !p.isDemo),
          priceHistory: prev.priceHistory.filter((ph) => !ph.isDemo),
          stockTransactions: prev.stockTransactions.filter((t) => !t.isDemo),
          stockAdjustments: prev.stockAdjustments.filter((a) => !a.isDemo),
          purchaseOrders: prev.purchaseOrders.filter((p) => !p.isDemo),
          rfqs: prev.rfqs.filter((r) => !r.isDemo),
        }));
        setConfirmDialog(null);
        showToast('All sample DEMO DATA records deleted.');
      },
    });
  };

  if (!isAuthenticated) {
    return (
      <LoginPage
        users={db.users}
        onLogin={handleLogin}
        onResetPasswordByUsername={handleResetPasswordByUsername}
      />
    );
  }

  // Full 19-Module Navigation Sidebar (#32) with Role-Based Access Filtering
  const allNavItems: { id: NavPage; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'quotations', label: 'Quotations', icon: FileText },
    { id: 'suppliers', label: 'Suppliers', icon: Users },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'pricelist', label: 'Price List', icon: DollarSign },
    { id: 'comparison', label: 'Price Comparison', icon: Scale },
    { id: 'history', label: 'Price History', icon: History },
    { id: 'calculator', label: 'Markup Calculator', icon: Calculator },
    { id: 'purchasing', label: 'Purchasing / PO', icon: ShoppingBag },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'stock_in', label: 'Stock In', icon: ArrowDownLeft },
    { id: 'stock_out', label: 'Stock Out', icon: ArrowUpRight },
    { id: 'adjustments', label: 'Stock Adjustments', icon: SlidersHorizontal },
    { id: 'barcode', label: 'Barcode / QR Scanner', icon: QrCode },
    { id: 'rfq', label: 'RFQ', icon: FileSpreadsheet },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'users', label: 'Users & Roles', icon: Shield },
    { id: 'audit', label: 'Audit Logs', icon: ShieldAlert },
    { id: 'drive', label: 'Google Drive', icon: Cloud },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const restrictedPagesForWarehouseAndViewer: NavPage[] = [
    'dashboard',
    'quotations',
    'suppliers',
    'products',
    'pricelist',
    'comparison',
    'history',
  ];

  const normalizedRole = (currentUser.role || '').trim().toUpperCase();
  const isRestrictedRole =
    normalizedRole === 'WAREHOUSE STAFF' || normalizedRole === 'VIEWER';

  const navItems = isRestrictedRole
    ? allNavItems.filter((item) => restrictedPagesForWarehouseAndViewer.includes(item.id))
    : allNavItems;

  const safeActivePage: NavPage =
    isRestrictedRole && !restrictedPagesForWarehouseAndViewer.includes(activePage)
      ? 'dashboard'
      : activePage;

  const handleNavigatePage = (page: NavPage) => {
    if (isRestrictedRole && !restrictedPagesForWarehouseAndViewer.includes(page)) {
      showToast(
        `Access Restricted: ${currentUser.role} only has access from Dashboard to Price History.`,
        'error'
      );
      setActivePage('dashboard');
      return;
    }
    setActivePage(page);
  };

  const handleSwitchActiveUser = (newUserId: string) => {
    const targetUser = db.users.find((u) => u.id === newUserId);
    if (!targetUser) return;
    setCurrentUserId(targetUser.id);
    try {
      localStorage.setItem(AUTH_USER_ID_KEY, targetUser.id);
    } catch {
      // ignore
    }
    const targetRoleNorm = (targetUser.role || '').trim().toUpperCase();
    if (
      (targetRoleNorm === 'WAREHOUSE STAFF' || targetRoleNorm === 'VIEWER') &&
      !restrictedPagesForWarehouseAndViewer.includes(activePage)
    ) {
      setActivePage('dashboard');
    }
    showToast(`Switched active session to ${targetUser.name} (${targetUser.role}).`);
  };

  const currentNavTitle =
    navItems.find((item) => item.id === safeActivePage)?.label || 'Dashboard';

  // Count active alerts for badge on Notifications
  const alertCount =
    db.products.filter((p) => p.stock <= p.minStock).length +
    db.stockAdjustments.filter((a) => a.status === 'Pending Approval').length;

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-neutral-900 flex">
      {/* Collapsible Sidebar (#32) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-[#CC00FF] text-white flex flex-col justify-between border-r border-white/25 transition-all duration-200 no-print ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div>
          {/* Top Brand Header */}
          <div className="h-16 px-3 flex items-center justify-between border-b border-white/25 bg-[#B300E0]">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <SmsiLogo compact className="w-9 h-9 shrink-0" />
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-extrabold tracking-tight text-white truncate">
                    SOL CLEANING
                  </div>
                  <div className="text-[10px] font-bold text-[#22d3ee] truncate">
                    BOSS YSHUA ACOGIDO
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/15 cursor-pointer"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu Links */}
          <nav className="p-2.5 space-y-0.5 overflow-y-auto max-h-[calc(100vh-8.5rem)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = safeActivePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleNavigatePage(item.id);
                    setMobileMenuOpen(false);
                  }}
                  title={item.label}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-black/35 text-white shadow-sm border-l-2 border-[#22d3ee]'
                      : 'text-white/85 hover:text-white hover:bg-white/15'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[#22d3ee]' : 'text-white/85'
                      }`}
                    />
                    {!sidebarCollapsed && (
                      <span className="truncate whitespace-nowrap">{item.label}</span>
                    )}
                  </div>
                  {!sidebarCollapsed && item.id === 'notifications' && alertCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#22d3ee] text-black rounded">
                      {alertCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User & Logout Section */}
        <div className="p-3 border-t border-white/25 bg-[#B300E0] space-y-2">
          {!sidebarCollapsed && (
            <div className="space-y-1.5">
              <div className="px-1 text-[10px] font-mono text-white/90 truncate">
                {currentUser.name} · <span className="text-[#22d3ee] font-bold">{currentUser.role}</span>
              </div>
              {isRestrictedRole && (
                <div className="px-2 py-1 rounded bg-black/30 border border-[#22d3ee]/40 text-[9.5px] font-mono text-[#22d3ee]">
                  ACCESS: DASHBOARD → PRICE HISTORY
                </div>
              )}
              <div className="pt-0.5">
                <label className="block text-[9px] font-mono uppercase tracking-wider text-white/75 mb-1">
                  Quick Switch Role / User:
                </label>
                <select
                  value={currentUser.id}
                  onChange={(e) => handleSwitchActiveUser(e.target.value)}
                  className="w-full bg-black/35 border border-white/30 rounded px-2 py-1 text-[10.5px] font-mono text-white focus:outline-none focus:border-[#22d3ee] cursor-pointer"
                >
                  {db.users
                    .filter((u) => u.status === 'Active')
                    .map((u) => (
                      <option key={u.id} value={u.id} className="bg-neutral-900 text-white">
                        {u.role} — {u.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={async () => {
              showToast('Bundling all system files, CSV spreadsheets & source code into folder ZIP...');
              await downloadAllFilesAsFolderZip(db);
              showToast('Complete SOL Cleaning Materials folder ZIP downloaded!');
            }}
            title="Download All Files in Folder (ZIP)"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-extrabold bg-[#22d3ee] text-black hover:bg-white transition-colors cursor-pointer shadow-sm"
          >
            <FolderDown className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Download All Files (ZIP)</span>}
          </button>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-white/90 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Header Bar following 3-Zone Contract */}
        <header className="h-16 bg-white border-b border-neutral-200 px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 no-print">
          {/* Zone 1: Brand / Active Section Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-neutral-600 hover:text-neutral-900 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-neutral-900 whitespace-nowrap">
              SOL CLEANING MATERIALS · {currentNavTitle}
            </span>
          </div>

          {/* Zone 2: Global Search Bar (#15) */}
          <div className="flex-1 max-w-md">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (globalSearchQuery.trim()) {
                  setIsGlobalSearchOpen(true);
                }
              }}
              className="relative"
            >
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearchQuery}
                onChange={(e) => {
                  setGlobalSearchQuery(e.target.value);
                  if (e.target.value.trim()) {
                    setIsGlobalSearchOpen(true);
                  } else {
                    setIsGlobalSearchOpen(false);
                  }
                }}
                placeholder="Global search: Floor Cleaner, SKU, barcode, supplier, quotation no..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-neutral-100 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:bg-white transition-all"
              />
            </form>
          </div>

          {/* Zone 3: Primary Action, Download Folder & Quick Print */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                showToast('Bundling all system files, CSV spreadsheets & source code into folder ZIP...');
                await downloadAllFilesAsFolderZip(db);
                showToast('Complete SOL Cleaning Materials folder ZIP downloaded!');
              }}
              title="Download All Files in Folder (ZIP)"
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer shadow-sm"
            >
              <FolderDown className="w-3.5 h-3.5 text-white" />
              <span className="hidden md:inline">Download All Files (ZIP)</span>
            </button>
            <button
              type="button"
              onClick={() => triggerSystemPrint(currentNavTitle)}
              title={`Print ${currentNavTitle}`}
              className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">Print {currentNavTitle}</span>
            </button>
            <button
              onClick={() => {
                setEditingQuotation(null);
                setOpenAddQuotationModal(true);
                setActivePage('quotations');
              }}
              className="px-3.5 py-2 bg-[#8B0000] hover:bg-[#6E0000] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              + New Quotation
            </button>
          </div>
        </header>

        {/* Page Subtitle Banner */}
        <div className="bg-white border-b border-neutral-200 px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 no-print">
          <div>
            <span className="font-bold text-[#8B0000]">
              SOL MANPOWER SERVICES INC. / SOL Cleaning Materials
            </span>{' '}
            · Quotations • Suppliers • Prices • Inventory • Barcode • Audit Management
          </div>
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-[#8B0000] uppercase tracking-wider">
              Properties of BOSS YSHUA ACOGIDO
            </span>
            <span className="text-neutral-300">·</span>
            <span className="font-mono text-[11px] text-neutral-600">
              Role: {currentUser.role} · Currency: {db.settings.currencySymbol}
            </span>
          </div>
        </div>

        {/* Main Viewport Container */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          <PrintSectionBar
            title={currentNavTitle}
            companyName={db.settings.companyName}
            printedBy={`${currentUser.name} (${currentUser.role})`}
            isPrintPreviewMode={isPrintPreviewMode}
            onTogglePrintPreview={setIsPrintPreviewMode}
          />
          {safeActivePage === 'dashboard' && (
            <DashboardView
              db={db}
              isRestrictedRole={isRestrictedRole}
              currentUserRole={currentUser.role}
              onNavigate={(page) => handleNavigatePage(page)}
              onOpenAddQuotation={() => {
                setEditingQuotation(null);
                setOpenAddQuotationModal(true);
                handleNavigatePage('quotations');
              }}
              onOpenAddProduct={() => {
                setOpenAddProductModal(true);
                handleNavigatePage('products');
              }}
              onOpenAddSupplier={() => {
                setOpenAddSupplierModal(true);
                handleNavigatePage('suppliers');
              }}
              onViewQuotation={(q) => {
                setViewingQuotation(q);
                handleNavigatePage('quotations');
              }}
              onEditQuotation={(q) => {
                setEditingQuotation(q);
                handleNavigatePage('quotations');
              }}
              onDuplicateQuotation={handleDuplicateQuotation}
              onDeleteQuotation={handleDeleteQuotation}
            />
          )}

          {safeActivePage === 'quotations' && (
            <QuotationsView
              db={db}
              onSaveQuotation={handleSaveQuotation}
              onDeleteQuotation={handleDeleteQuotation}
              onDuplicateQuotation={handleDuplicateQuotation}
              initialOpenModal={openAddQuotationModal}
              editingQuotation={editingQuotation}
              viewingQuotation={viewingQuotation}
              onClearModalState={() => {
                setOpenAddQuotationModal(false);
                setEditingQuotation(null);
                setViewingQuotation(null);
              }}
            />
          )}

          {safeActivePage === 'suppliers' && (
            <SuppliersView
              db={db}
              onSaveSupplier={handleSaveSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              onViewQuotation={(q) => {
                setViewingQuotation(q);
                handleNavigatePage('quotations');
              }}
              initialOpenModal={openAddSupplierModal}
              onClearModalState={() => setOpenAddSupplierModal(false)}
            />
          )}

          {safeActivePage === 'products' && (
            <ProductsView
              db={db}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
              onToggleFavorite={handleToggleFavorite}
              onAddCategory={handleAddCategory}
              initialOpenModal={openAddProductModal}
              onClearModalState={() => setOpenAddProductModal(false)}
              onlyFavorites={false}
            />
          )}

          {safeActivePage === 'favorites' && (
            <ProductsView
              db={db}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
              onToggleFavorite={handleToggleFavorite}
              onAddCategory={handleAddCategory}
              initialOpenModal={false}
              onClearModalState={() => {}}
              onlyFavorites={true}
            />
          )}

          {safeActivePage === 'pricelist' && (
            <PriceListView db={db} onAddPriceRecord={handleAddPriceRecord} />
          )}

          {safeActivePage === 'comparison' && <PriceComparisonView db={db} />}

          {safeActivePage === 'history' && <PriceHistoryView db={db} />}

          {safeActivePage === 'calculator' && (
            <MarkupCalculatorView
              db={db}
              onApplyProductMarkup={handleApplyProductMarkup}
            />
          )}

          {safeActivePage === 'purchasing' && (
            <PurchasingView
              db={db}
              currentUser={currentUser}
              onCreatePurchaseOrder={handleCreatePurchaseOrder}
              onReceivePurchaseOrder={handleReceivePurchaseOrder}
            />
          )}

          {(safeActivePage === 'inventory' ||
            safeActivePage === 'stock_in' ||
            safeActivePage === 'stock_out' ||
            safeActivePage === 'adjustments') && (
            <InventorySuiteView
              db={db}
              currentUser={currentUser}
              initialTab={safeActivePage}
              onRecordStockIn={handleRecordStockIn}
              onRecordStockOut={handleRecordStockOut}
              onCreateAdjustment={handleCreateAdjustment}
              onApproveAdjustment={handleApproveAdjustment}
            />
          )}

          {safeActivePage === 'barcode' && (
            <BarcodeView
              db={db}
              currentUser={currentUser}
              onRecordStockIn={handleRecordStockIn}
              onRecordStockOut={handleRecordStockOut}
            />
          )}

          {safeActivePage === 'rfq' && (
            <RFQView
              db={db}
              onSaveRFQ={handleSaveRFQ}
              onDeleteRFQ={handleDeleteRFQ}
            />
          )}

          {safeActivePage === 'reports' && <ReportsView db={db} />}

          {safeActivePage === 'notifications' && (
            <AuditNotificationsView
              db={db}
              mode="notifications"
              onNavigate={(page) => handleNavigatePage(page)}
            />
          )}

          {safeActivePage === 'audit' && (
            <AuditNotificationsView
              db={db}
              mode="audit"
              onNavigate={(page) => handleNavigatePage(page)}
            />
          )}

          {safeActivePage === 'users' && (
            <UsersView
              db={db}
              currentUser={currentUser}
              onSaveUser={handleSaveUser}
              onToggleUserStatus={handleToggleUserStatus}
              onResetUserPassword={handleResetUserPassword}
            />
          )}

          {safeActivePage === 'drive' && (
            <GoogleDriveView
              db={db}
              onRestoreDatabase={handleRestoreDatabase}
              onShowToast={showToast}
            />
          )}

          {safeActivePage === 'settings' && (
            <SettingsView
              db={db}
              onUpdateSettings={handleUpdateSettings}
              onRestoreDatabase={handleRestoreDatabase}
              onResetToDefaultDemo={handleResetToDefaultDemo}
              onPurgeDemoData={handlePurgeDemoData}
            />
          )}

          <PrintFooterSignatures
            printedBy={`${currentUser.name} (${currentUser.role})`}
            isPrintPreviewMode={isPrintPreviewMode}
          />
        </main>

        {/* Quiet Corporate Footer */}
        <footer className="py-4 px-6 border-t border-neutral-200 bg-white text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-2 no-print">
          <div>
            © {new Date().getFullYear()} {db.settings.companyName}. Internal Quotation, Inventory, Barcode & Audit Management System.
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-[#8B0000] uppercase tracking-wider">
              Properties of BOSS YSHUA ACOGIDO
            </span>
            <span className="text-neutral-300">·</span>
            <span>Time Zone: {db.settings.timezone || 'Asia/Manila'}</span>
          </div>
        </footer>
      </div>

      {/* Global Search Modal (#15) */}
      {isGlobalSearchOpen && globalSearchQuery.trim() && (
        <GlobalSearchModal
          query={globalSearchQuery}
          db={db}
          onClose={() => setIsGlobalSearchOpen(false)}
          onViewQuotation={(q) => {
            setViewingQuotation(q);
            setActivePage('quotations');
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-300 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-neutral-900">{confirmDialog.title}</h3>
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-neutral-200">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications Stack */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 no-print">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-[#18191C] text-white border-l-4 border-[#D4AF37] px-4 py-3 rounded-lg shadow-xl flex items-center gap-2.5 text-xs font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
