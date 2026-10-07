import React, { useMemo, useState } from 'react';
import {
  Package,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Search,
  Eye,
  Plus,
  Download,
  CheckCircle2,
  X,
  FileText,
  Printer,
} from 'lucide-react';
import {
  AppDatabase,
  Product,
  StockAdjustment,
  StockTransaction,
  UserAccount,
} from '../types';
import {
  canPerformAction,
  exportToCSV,
  formatDate,
  formatPeso,
  triggerSystemPrint,
} from '../utils';

interface InventorySuiteViewProps {
  db: AppDatabase;
  currentUser: UserAccount;
  initialTab: 'inventory' | 'stock_in' | 'stock_out' | 'adjustments';
  onRecordStockIn: (tx: Omit<StockTransaction, 'id' | 'previousStock' | 'newStock'>) => void;
  onRecordStockOut: (
    tx: Omit<StockTransaction, 'id' | 'previousStock' | 'newStock'>,
    allowNegative: boolean
  ) => boolean;
  onCreateAdjustment: (adj: Omit<StockAdjustment, 'id'>) => void;
  onApproveAdjustment: (adjId: string) => void;
}

export const InventorySuiteView: React.FC<InventorySuiteViewProps> = ({
  db,
  currentUser,
  initialTab,
  onRecordStockIn,
  onRecordStockOut,
  onCreateAdjustment,
  onApproveAdjustment,
}) => {
  const [activeTab, setActiveTab] = useState<
    'inventory' | 'stock_in' | 'stock_out' | 'adjustments'
  >(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'GOOD' | 'LOW' | 'OUT'>('ALL');
  const [selectedStockCardProduct, setSelectedStockCardProduct] = useState<Product | null>(null);

  const defaultToday = new Date().toISOString().split('T')[0];

  // Inventory Summary Metrics (#16 & #21)
  const invMetrics = useMemo(() => {
    let totalUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalCostValue = 0;
    let totalSellingValue = 0;

    db.products.forEach((p) => {
      totalUnits += p.stock;
      if (p.stock <= 0) outOfStockCount++;
      else if (p.stock <= p.minStock) lowStockCount++;

      const unitAvgCost = p.averageCost || p.currentCost;
      totalCostValue += p.stock * unitAvgCost;
      totalSellingValue += p.stock * p.sellingPrice;
    });

    const stockInToday = db.stockTransactions
      .filter((t) => t.type === 'IN' && t.date === '2026-10-06')
      .reduce((s, t) => s + t.quantity, 0);

    const stockOutToday = db.stockTransactions
      .filter((t) => t.type === 'OUT' && t.date === '2026-10-06')
      .reduce((s, t) => s + t.quantity, 0);

    return {
      totalProducts: db.products.length,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      stockInToday,
      stockOutToday,
      totalCostValue,
      totalSellingValue,
    };
  }, [db.products, db.stockTransactions]);

  // Stock In Form State (#17)
  const [stockInForm, setStockInForm] = useState(() => {
    const firstProd = db.products[0];
    const firstSup = db.suppliers[0];
    return {
      transactionNo: `SI-2026-${String(db.stockTransactions.length + 101).slice(-3)}`,
      date: defaultToday,
      supplierId: firstProd?.supplierId || firstSup?.id || '',
      supplierName: firstProd?.supplierName || firstSup?.name || '',
      purchaseRef: '',
      poNumber: 'PO-2026-001',
      quotationNo: 'QT-2026-1002',
      productId: firstProd?.id || '',
      quantity: 25,
      unitCost: firstProd?.currentCost || 295,
      warehouse: firstProd?.location || 'Main Warehouse',
      receivedBy: currentUser.name,
      remarks: '',
    };
  });

  // Stock Out Form State (#18)
  const [stockOutForm, setStockOutForm] = useState(() => {
    const firstProd = db.products[0];
    return {
      transactionNo: `DR-2026-${String(db.stockTransactions.length + 101).slice(-3)}`,
      date: defaultToday,
      productId: firstProd?.id || '',
      quantity: 5,
      releasedTo: 'Site Supervisor',
      clientOrDept: 'Corporate Tower Deployment',
      drNumber: `DR-2026-${String(db.stockTransactions.length + 101).slice(-3)}`,
      referenceNo: 'REQ-2026-110',
      warehouse: firstProd?.location || 'Main Warehouse',
      releasedBy: currentUser.name,
      approvedBy: 'Boss Yshua Acogido',
      remarks: '',
      authorizeNegative: false,
    };
  });

  // Stock Adjustment Form State (#19)
  const [adjForm, setAdjForm] = useState(() => {
    const firstProd = db.products[0];
    return {
      adjustmentNo: `ADJ-2026-${String(db.stockAdjustments.length + 101).slice(-3)}`,
      date: defaultToday,
      productId: firstProd?.id || '',
      actualStock: firstProd?.stock || 0,
      reason: 'Physical inventory correction' as StockAdjustment['reason'],
      remarks: '',
    };
  });

  const handleStockInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = db.products.find((p) => p.id === stockInForm.productId);
    if (!prod) return;

    onRecordStockIn({
      transactionNo: stockInForm.transactionNo,
      type: 'IN',
      date: stockInForm.date,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku || prod.code,
      barcode: prod.barcode || '',
      unit: prod.unit,
      quantity: stockInForm.quantity,
      unitCost: stockInForm.unitCost,
      totalCost: Number((stockInForm.quantity * stockInForm.unitCost).toFixed(2)),
      warehouse: stockInForm.warehouse,
      supplierId: stockInForm.supplierId,
      supplierName: stockInForm.supplierName,
      poNumber: stockInForm.poNumber,
      quotationNo: stockInForm.quotationNo,
      purchaseRef: stockInForm.purchaseRef,
      receivedBy: stockInForm.receivedBy,
      remarks: stockInForm.remarks,
    });

    setStockInForm((prev) => ({
      ...prev,
      transactionNo: `SI-2026-${String(db.stockTransactions.length + 102).slice(-3)}`,
      purchaseRef: '',
      remarks: '',
    }));
  };

  const handleStockOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = db.products.find((p) => p.id === stockOutForm.productId);
    if (!prod) return;

    const ok = onRecordStockOut(
      {
        transactionNo: stockOutForm.transactionNo,
        type: 'OUT',
        date: stockOutForm.date,
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku || prod.code,
        barcode: prod.barcode || '',
        unit: prod.unit,
        quantity: stockOutForm.quantity,
        unitCost: prod.averageCost || prod.currentCost,
        totalCost: Number(
          (stockOutForm.quantity * (prod.averageCost || prod.currentCost)).toFixed(2)
        ),
        warehouse: stockOutForm.warehouse,
        releasedTo: stockOutForm.releasedTo,
        clientOrDept: stockOutForm.clientOrDept,
        drNumber: stockOutForm.drNumber,
        referenceNo: stockOutForm.referenceNo,
        releasedBy: stockOutForm.releasedBy,
        approvedBy: stockOutForm.approvedBy,
        remarks: stockOutForm.remarks,
      },
      stockOutForm.authorizeNegative && currentUser.role === 'SUPER ADMIN'
    );

    if (ok) {
      setStockOutForm((prev) => ({
        ...prev,
        transactionNo: `DR-2026-${String(db.stockTransactions.length + 102).slice(-3)}`,
        drNumber: `DR-2026-${String(db.stockTransactions.length + 102).slice(-3)}`,
        remarks: '',
      }));
    }
  };

  const handleAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = db.products.find((p) => p.id === adjForm.productId);
    if (!prod) return;

    const canAutoApprove = canPerformAction(currentUser.role, 'approve_adjustment');
    onCreateAdjustment({
      adjustmentNo: adjForm.adjustmentNo,
      date: adjForm.date,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku || prod.code,
      systemStock: prod.stock,
      actualStock: adjForm.actualStock,
      difference: adjForm.actualStock - prod.stock,
      reason: adjForm.reason,
      requestedBy: currentUser.name,
      approvedBy: canAutoApprove ? currentUser.name : 'Pending Super Admin',
      status: canAutoApprove ? 'Approved' : 'Pending Approval',
      remarks: adjForm.remarks,
    });

    setAdjForm((prev) => ({
      ...prev,
      adjustmentNo: `ADJ-2026-${String(db.stockAdjustments.length + 102).slice(-3)}`,
      remarks: '',
    }));
  };

  const filteredProducts = useMemo(() => {
    return db.products.filter((p) => {
      if (stockFilter === 'OUT' && p.stock > 0) return false;
      if (stockFilter === 'LOW' && (p.stock <= 0 || p.stock > p.minStock)) return false;
      if (stockFilter === 'GOOD' && p.stock <= p.minStock) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q)
      );
    });
  }, [db.products, stockFilter, searchQuery]);

  // Stock Card calculation for modal (#20)
  const stockCardTransactions = useMemo(() => {
    if (!selectedStockCardProduct) return [];
    return db.stockTransactions
      .filter((t) => t.productId === selectedStockCardProduct.id)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [db.stockTransactions, selectedStockCardProduct]);

  return (
    <div className="space-y-6">
      {/* Low Stock Banner (#24) */}
      {(invMetrics.lowStockCount > 0 || invMetrics.outOfStockCount > 0) && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-neutral-900">
                Inventory Alert:{' '}
                {invMetrics.lowStockCount + invMetrics.outOfStockCount} products are below minimum
                stock ({invMetrics.lowStockCount} Low Stock · {invMetrics.outOfStockCount} Out of
                Stock).
              </p>
              <p className="text-xs text-neutral-600">
                Inspect low-stock items or record a Stock In delivery from an approved Purchase Order.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('inventory');
              setStockFilter('LOW');
            }}
            className="px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer"
          >
            Filter Low Stock
          </button>
        </div>
      )}

      {/* Top Summary Cards (#16 & #21) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        <div className="bg-white border border-neutral-200 rounded-lg p-3.5">
          <div className="text-[11px] font-semibold text-neutral-500 uppercase">Total Products</div>
          <div className="text-xl font-bold font-mono text-neutral-900 mt-1">
            {invMetrics.totalProducts}
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-3.5">
          <div className="text-[11px] font-semibold text-neutral-500 uppercase">Total Stock Units</div>
          <div className="text-xl font-bold font-mono text-neutral-900 mt-1">
            {invMetrics.totalUnits.toLocaleString()}
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-3.5">
          <div className="text-[11px] font-semibold text-amber-700 uppercase">🟡 Low Stock</div>
          <div className="text-xl font-bold font-mono text-amber-700 mt-1">
            {invMetrics.lowStockCount}
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-3.5">
          <div className="text-[11px] font-semibold text-red-700 uppercase">🔴 Out of Stock</div>
          <div className="text-xl font-bold font-mono text-red-700 mt-1">
            {invMetrics.outOfStockCount}
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-3.5">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase">Stock In Today</div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
            +{invMetrics.stockInToday}
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-3.5">
          <div className="text-[11px] font-semibold text-neutral-500 uppercase">Stock Out Today</div>
          <div className="text-xl font-bold font-mono text-neutral-900 mt-1">
            -{invMetrics.stockOutToday}
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-3.5 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold text-[#8B0000] uppercase">Inventory Value</div>
          <div className="text-base font-bold font-mono text-[#8B0000] mt-1">
            {formatPeso(invMetrics.totalCostValue, db.settings.currencySymbol)}
          </div>
        </div>
      </div>

      {/* Sub-Module Navigation Tabs */}
      <div className="bg-white border border-neutral-200 rounded-lg p-2 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-[#8B0000] text-white'
              : 'text-neutral-700 hover:bg-neutral-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Master Inventory & Costing</span>
        </button>

        <button
          onClick={() => setActiveTab('stock_in')}
          className={`px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'stock_in'
              ? 'bg-emerald-700 text-white'
              : 'text-neutral-700 hover:bg-neutral-100'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Stock In (Receiving)</span>
        </button>

        <button
          onClick={() => setActiveTab('stock_out')}
          className={`px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'stock_out'
              ? 'bg-amber-700 text-white'
              : 'text-neutral-700 hover:bg-neutral-100'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Stock Out (Issuance)</span>
        </button>

        <button
          onClick={() => setActiveTab('adjustments')}
          className={`px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'adjustments'
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-700 hover:bg-neutral-100'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Stock Adjustments</span>
        </button>
      </div>

      {/* TAB 1: MASTER INVENTORY & COSTING TABLE (#16, #20, #21) */}
      {activeTab === 'inventory' && (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search product, SKU, barcode, warehouse location..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg"
                />
              </div>

              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg font-medium"
              >
                <option value="ALL">All Stock Statuses</option>
                <option value="GOOD">🟢 IN STOCK (Good)</option>
                <option value="LOW">🟡 LOW STOCK</option>
                <option value="OUT">🔴 OUT OF STOCK</option>
              </select>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                type="button"
                onClick={() => triggerSystemPrint('Warehouse Inventory & Valuation Sheet')}
                className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Print Inventory Sheet</span>
              </button>
              <button
                onClick={() => {
                  const rows = filteredProducts.map((p) => ({
                    Product: p.name,
                    SKU: p.sku || p.code,
                    Barcode: p.barcode || '',
                    Current_Stock: p.stock,
                    Unit: p.unit,
                    Min_Stock: p.minStock,
                    Location: p.location || 'Main Warehouse',
                    Last_Cost_PHP: p.currentCost,
                    Weighted_Avg_Cost_PHP: p.averageCost || p.currentCost,
                    Inventory_Valuation_PHP: Number(
                      (p.stock * (p.averageCost || p.currentCost)).toFixed(2)
                    ),
                    Status:
                      p.stock <= 0 ? 'OUT OF STOCK' : p.stock <= p.minStock ? 'LOW STOCK' : 'IN STOCK',
                  }));
                  exportToCSV('SOL_Inventory_Valuation.csv', rows);
                }}
                className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Valuation CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-3">SKU / Barcode</th>
                  <th className="py-3 px-3 text-right">Stock</th>
                  <th className="py-3 px-3">Unit</th>
                  <th className="py-3 px-3 text-right">Min / Max</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3 text-right">Avg Cost</th>
                  <th className="py-3 px-3 text-right">Inventory Value</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Stock Card</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs">
                {filteredProducts.map((p) => {
                  const avgCost = p.averageCost || p.currentCost;
                  const val = p.stock * avgCost;
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/90">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900">{p.name}</div>
                        <div className="text-[11px] text-neutral-500">{p.category}</div>
                      </td>
                      <td className="py-3.5 px-3 font-mono">
                        <div className="font-bold text-neutral-800">{p.sku || p.code}</div>
                        <div className="text-[10px] text-neutral-400">{p.barcode}</div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-extrabold text-sm">
                        <span
                          className={
                            p.stock <= 0
                              ? 'text-red-700'
                              : p.stock <= p.minStock
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-neutral-700">{p.unit}</td>
                      <td className="py-3.5 px-3 text-right font-mono text-neutral-500">
                        {p.minStock} / {p.maxStock || 150}
                      </td>
                      <td className="py-3.5 px-3 text-neutral-700">
                        {p.location || 'Main Warehouse'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-neutral-800">
                        {formatPeso(avgCost, db.settings.currencySymbol)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-neutral-900">
                        {formatPeso(val, db.settings.currencySymbol)}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap font-semibold">
                        {p.stock <= 0 && <span className="text-red-700">🔴 OUT OF STOCK</span>}
                        {p.stock > 0 && p.stock <= p.minStock && (
                          <span className="text-amber-700">🟡 LOW STOCK</span>
                        )}
                        {p.stock > p.minStock && (
                          <span className="text-emerald-700">🟢 IN STOCK</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedStockCardProduct(p)}
                          className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold rounded inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#8B0000]" />
                          <span>Stock Card</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STOCK IN (#17) */}
      {activeTab === 'stock_in' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-lg p-5">
            <h3 className="text-sm font-bold text-neutral-900 pb-3 mb-4 border-b border-neutral-200">
              Record Stock In (Receiving Delivery)
            </h3>
            <form onSubmit={handleStockInSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Transaction No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={stockInForm.transactionNo}
                    onChange={(e) =>
                      setStockInForm({ ...stockInForm, transactionNo: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={stockInForm.date}
                    onChange={(e) => setStockInForm({ ...stockInForm, date: e.target.value })}
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Product (SKU / Barcode) *
                </label>
                <select
                  value={stockInForm.productId}
                  onChange={(e) => {
                    const p = db.products.find((x) => x.id === e.target.value);
                    if (p) {
                      setStockInForm({
                        ...stockInForm,
                        productId: p.id,
                        unitCost: p.currentCost,
                        warehouse: p.location || 'Main Warehouse',
                      });
                    }
                  }}
                  className="w-full px-3 py-2 bg-amber-50/70 border border-[#D4AF37] rounded-lg font-semibold"
                >
                  {db.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku || p.code}] {p.name} — Current Stock: {p.stock} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-emerald-800 mb-1">
                    Stock In Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stockInForm.quantity}
                    onChange={(e) =>
                      setStockInForm({
                        ...stockInForm,
                        quantity: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full px-3 py-2 font-mono font-bold bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Unit Cost (₱) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={stockInForm.unitCost}
                    onChange={(e) =>
                      setStockInForm({
                        ...stockInForm,
                        unitCost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Supplier</label>
                  <select
                    value={stockInForm.supplierId}
                    onChange={(e) => {
                      const s = db.suppliers.find((x) => x.id === e.target.value);
                      setStockInForm({
                        ...stockInForm,
                        supplierId: s?.id || '',
                        supplierName: s?.name || '',
                      });
                    }}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  >
                    {db.suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">PO Number</label>
                  <input
                    type="text"
                    value={stockInForm.poNumber}
                    onChange={(e) => setStockInForm({ ...stockInForm, poNumber: e.target.value })}
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Quotation Number
                  </label>
                  <input
                    type="text"
                    value={stockInForm.quotationNo}
                    onChange={(e) =>
                      setStockInForm({ ...stockInForm, quotationNo: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Invoice / Purchase Ref
                  </label>
                  <input
                    type="text"
                    value={stockInForm.purchaseRef}
                    onChange={(e) =>
                      setStockInForm({ ...stockInForm, purchaseRef: e.target.value })
                    }
                    placeholder="INV-2026-..."
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Warehouse</label>
                  <input
                    type="text"
                    value={stockInForm.warehouse}
                    onChange={(e) => setStockInForm({ ...stockInForm, warehouse: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Received By</label>
                  <input
                    type="text"
                    value={stockInForm.receivedBy}
                    onChange={(e) =>
                      setStockInForm({ ...stockInForm, receivedBy: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={stockInForm.remarks}
                  onChange={(e) => setStockInForm({ ...stockInForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer"
              >
                + Confirm Stock In & Update Inventory
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900">Recent Stock In Transactions</h3>
              <button
                type="button"
                onClick={() => triggerSystemPrint('Warehouse Stock In Transactions Log')}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer no-print"
              >
                <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Print Stock In Log</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                    <th className="py-2.5 px-3">Ref No.</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Supplier / PO</th>
                    <th className="py-2.5 px-3 text-right">Prev</th>
                    <th className="py-2.5 px-3 text-right">Stock In</th>
                    <th className="py-2.5 px-3 text-right">New Stock</th>
                    <th className="py-2.5 px-3 text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {db.stockTransactions
                    .filter((t) => t.type === 'IN')
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-neutral-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                          {t.transactionNo}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-neutral-600">
                          {formatDate(t.date)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-neutral-900">
                          {t.productName}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-neutral-800">{t.supplierName}</div>
                          <div className="text-[10px] font-mono text-neutral-500">
                            {t.poNumber} · {t.quotationNo}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-neutral-500">
                          {t.previousStock}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          +{t.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900">
                          {t.newStock}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {formatPeso(t.totalCost, db.settings.currencySymbol)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STOCK OUT (#18) */}
      {activeTab === 'stock_out' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-lg p-5">
            <h3 className="text-sm font-bold text-neutral-900 pb-3 mb-4 border-b border-neutral-200">
              Record Stock Out (Issuance / Delivery Receipt)
            </h3>
            <form onSubmit={handleStockOutSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Transaction / DR No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={stockOutForm.transactionNo}
                    onChange={(e) =>
                      setStockOutForm({
                        ...stockOutForm,
                        transactionNo: e.target.value,
                        drNumber: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={stockOutForm.date}
                    onChange={(e) => setStockOutForm({ ...stockOutForm, date: e.target.value })}
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Product to Release *
                </label>
                <select
                  value={stockOutForm.productId}
                  onChange={(e) =>
                    setStockOutForm({ ...stockOutForm, productId: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-amber-50/70 border border-[#D4AF37] rounded-lg font-semibold"
                >
                  {db.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku || p.code}] {p.name} — Available: {p.stock} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-amber-800 mb-1">
                    Quantity to Deduct *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stockOutForm.quantity}
                    onChange={(e) =>
                      setStockOutForm({
                        ...stockOutForm,
                        quantity: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full px-3 py-2 font-mono font-bold bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Requisition Ref No.
                  </label>
                  <input
                    type="text"
                    value={stockOutForm.referenceNo}
                    onChange={(e) =>
                      setStockOutForm({ ...stockOutForm, referenceNo: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Released To (Person) *
                  </label>
                  <input
                    type="text"
                    required
                    value={stockOutForm.releasedTo}
                    onChange={(e) =>
                      setStockOutForm({ ...stockOutForm, releasedTo: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Client / Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={stockOutForm.clientOrDept}
                    onChange={(e) =>
                      setStockOutForm({ ...stockOutForm, clientOrDept: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Released By</label>
                  <input
                    type="text"
                    value={stockOutForm.releasedBy}
                    onChange={(e) =>
                      setStockOutForm({ ...stockOutForm, releasedBy: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Approved By</label>
                  <input
                    type="text"
                    value={stockOutForm.approvedBy}
                    onChange={(e) =>
                      setStockOutForm({ ...stockOutForm, approvedBy: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>

              {currentUser.role === 'SUPER ADMIN' && (
                <label className="inline-flex items-center gap-2 text-xs text-red-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stockOutForm.authorizeNegative}
                    onChange={(e) =>
                      setStockOutForm({
                        ...stockOutForm,
                        authorizeNegative: e.target.checked,
                      })
                    }
                  />
                  <span>Super Admin Override: Allow negative stock balance if needed</span>
                </label>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg cursor-pointer"
              >
                - Confirm Stock Out & Deduct Inventory
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900">Recent Stock Out Transactions</h3>
              <button
                type="button"
                onClick={() => triggerSystemPrint('Warehouse Stock Out Transactions Log')}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer no-print"
              >
                <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Print Stock Out Log</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                    <th className="py-2.5 px-3">DR No.</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Released To / Client</th>
                    <th className="py-2.5 px-3 text-right">Prev</th>
                    <th className="py-2.5 px-3 text-right">Out</th>
                    <th className="py-2.5 px-3 text-right">New Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {db.stockTransactions
                    .filter((t) => t.type === 'OUT')
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-neutral-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-700">
                          {t.transactionNo}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-neutral-600">
                          {formatDate(t.date)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-neutral-900">
                          {t.productName}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-neutral-900">{t.releasedTo}</div>
                          <div className="text-[11px] text-neutral-500">{t.clientOrDept}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-neutral-500">
                          {t.previousStock}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-red-700">
                          -{t.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900">
                          {t.newStock}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STOCK ADJUSTMENT (#19) */}
      {activeTab === 'adjustments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-lg p-5">
            <h3 className="text-sm font-bold text-neutral-900 pb-3 mb-4 border-b border-neutral-200">
              Create Stock Adjustment Request
            </h3>
            <form onSubmit={handleAdjustmentSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Adjustment No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={adjForm.adjustmentNo}
                    onChange={(e) => setAdjForm({ ...adjForm, adjustmentNo: e.target.value })}
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={adjForm.date}
                    onChange={(e) => setAdjForm({ ...adjForm, date: e.target.value })}
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Product *</label>
                <select
                  value={adjForm.productId}
                  onChange={(e) => {
                    const p = db.products.find((x) => x.id === e.target.value);
                    setAdjForm({
                      ...adjForm,
                      productId: e.target.value,
                      actualStock: p?.stock || 0,
                    });
                  }}
                  className="w-full px-3 py-2 bg-amber-50/70 border border-[#D4AF37] rounded-lg font-semibold"
                >
                  {db.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku || p.code}] {p.name} — System Stock: {p.stock} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Actual Physical Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={adjForm.actualStock}
                    onChange={(e) =>
                      setAdjForm({
                        ...adjForm,
                        actualStock: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-2 font-mono font-bold bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Reason *</label>
                  <select
                    value={adjForm.reason}
                    onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value as any })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  >
                    <option value="Physical inventory correction">
                      Physical inventory correction
                    </option>
                    <option value="Damaged items">Damaged items</option>
                    <option value="Lost items">Lost items</option>
                    <option value="Expired chemicals">Expired chemicals</option>
                    <option value="Counting errors">Counting errors</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Detailed Remarks / Justification *
                </label>
                <textarea
                  rows={2}
                  required
                  value={adjForm.remarks}
                  onChange={(e) => setAdjForm({ ...adjForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-lg cursor-pointer"
              >
                Submit Stock Adjustment (Logged in Audit Trail)
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900">
                Stock Adjustments & Audit Approval Log
              </h3>
              <button
                type="button"
                onClick={() => triggerSystemPrint('Stock Adjustments & Audit Approval Log')}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer no-print"
              >
                <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Print Adjustments Log</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                    <th className="py-2.5 px-3">Adj No.</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-right">System</th>
                    <th className="py-2.5 px-3 text-right">Physical</th>
                    <th className="py-2.5 px-3 text-right">Diff</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {db.stockAdjustments.map((adj) => (
                    <tr key={adj.id} className="hover:bg-neutral-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#8B0000]">
                        {adj.adjustmentNo}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-neutral-600">
                        {formatDate(adj.date)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-neutral-900">
                        {adj.productName}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{adj.systemStock}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {adj.actualStock}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span className={adj.difference >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                          {adj.difference >= 0 ? `+${adj.difference}` : adj.difference}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-neutral-800">{adj.reason}</div>
                        <div className="text-[10px] text-neutral-500">By: {adj.requestedBy}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        {adj.status === 'Approved' ? (
                          <span className="text-emerald-700 font-bold">🟢 Approved</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-amber-700 font-semibold">🟡 Pending</span>
                            {canPerformAction(currentUser.role, 'approve_adjustment') && (
                              <button
                                onClick={() => onApproveAdjustment(adj.id)}
                                className="px-2 py-1 bg-emerald-700 text-white text-[10px] font-bold rounded cursor-pointer"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT STOCK CARD MODAL (#20) */}
      {selectedStockCardProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-300 rounded-xl max-w-4xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200">
              <div>
                <div className="text-xs font-bold text-[#8B0000] uppercase">
                  OFFICIAL PRODUCT STOCK CARD (#20)
                </div>
                <h3 className="text-lg font-extrabold text-neutral-900">
                  {selectedStockCardProduct.name} — {selectedStockCardProduct.size}
                </h3>
                <p className="text-xs text-neutral-500 font-mono">
                  SKU: {selectedStockCardProduct.sku || selectedStockCardProduct.code} · Barcode:{' '}
                  {selectedStockCardProduct.barcode} · Location:{' '}
                  {selectedStockCardProduct.location || 'Main Warehouse'}
                </p>
              </div>
              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() =>
                    triggerSystemPrint(`Product Stock Card - ${selectedStockCardProduct.name}`)
                  }
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Print Stock Card</span>
                </button>
                <button
                  onClick={() => setSelectedStockCardProduct(null)}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Summary KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5 text-xs">
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                <div className="text-[10px] text-neutral-500 uppercase">Current Stock</div>
                <div className="text-base font-bold font-mono text-neutral-900">
                  {selectedStockCardProduct.stock} {selectedStockCardProduct.unit}
                </div>
              </div>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                <div className="text-[10px] text-neutral-500 uppercase">Total Stock In</div>
                <div className="text-base font-bold font-mono text-emerald-700">
                  +
                  {stockCardTransactions
                    .filter((t) => t.type === 'IN')
                    .reduce((s, t) => s + t.quantity, 0)}
                </div>
              </div>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                <div className="text-[10px] text-neutral-500 uppercase">Total Stock Out</div>
                <div className="text-base font-bold font-mono text-red-700">
                  -
                  {stockCardTransactions
                    .filter((t) => t.type === 'OUT')
                    .reduce((s, t) => s + t.quantity, 0)}
                </div>
              </div>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                <div className="text-[10px] text-neutral-500 uppercase">Weighted Avg Cost</div>
                <div className="text-base font-bold font-mono text-neutral-900">
                  {formatPeso(
                    selectedStockCardProduct.averageCost || selectedStockCardProduct.currentCost,
                    db.settings.currencySymbol
                  )}
                </div>
              </div>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                <div className="text-[10px] text-neutral-500 uppercase">Inventory Value</div>
                <div className="text-base font-bold font-mono text-[#8B0000]">
                  {formatPeso(
                    selectedStockCardProduct.stock *
                      (selectedStockCardProduct.averageCost ||
                        selectedStockCardProduct.currentCost),
                    db.settings.currencySymbol
                  )}
                </div>
              </div>
            </div>

            {/* Stock Card Running Balance Table */}
            <div className="overflow-x-auto border border-neutral-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-100 border-b border-neutral-200 text-[11px] font-semibold uppercase">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Reference</th>
                    <th className="py-2.5 px-4">Counterparty / Details</th>
                    <th className="py-2.5 px-4 text-right">Stock In</th>
                    <th className="py-2.5 px-4 text-right">Stock Out</th>
                    <th className="py-2.5 px-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {stockCardTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-neutral-50">
                      <td className="py-2.5 px-4 font-mono">{formatDate(t.date)}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-[#8B0000]">
                        {t.transactionNo}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-600">
                        {t.type === 'IN'
                          ? `Supplier: ${t.supplierName} (${t.poNumber || ''})`
                          : `Released to: ${t.releasedTo} (${t.clientOrDept || ''})`}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                        {t.type === 'IN' ? t.quantity : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-red-700">
                        {t.type === 'OUT' ? t.quantity : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-extrabold text-neutral-900">
                        {t.newStock}
                      </td>
                    </tr>
                  ))}
                  {stockCardTransactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400">
                        No stock movements recorded for this product yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
