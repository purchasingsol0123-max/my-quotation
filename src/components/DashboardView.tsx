import React, { useMemo } from 'react';
import {
  FileText,
  Users,
  Package,
  History,
  Award,
  Plus,
  Search,
  AlertTriangle,
  Eye,
  Edit3,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Printer,
} from 'lucide-react';
import { AppDatabase, NavPage, Quotation } from '../types';
import {
  directPrintHtml,
  formatDate,
  formatPeso,
  getManilaTimestamp,
  getQuotationStatus,
  triggerSystemPrint,
} from '../utils';

interface DashboardViewProps {
  db: AppDatabase;
  isRestrictedRole?: boolean;
  currentUserRole?: string;
  onNavigate: (page: NavPage) => void;
  onOpenAddQuotation: () => void;
  onOpenAddProduct: () => void;
  onOpenAddSupplier: () => void;
  onViewQuotation: (quotation: Quotation) => void;
  onEditQuotation: (quotation: Quotation) => void;
  onDuplicateQuotation: (quotation: Quotation) => void;
  onDeleteQuotation: (quotation: Quotation) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  db,
  isRestrictedRole = false,
  currentUserRole = '',
  onNavigate,
  onOpenAddQuotation,
  onOpenAddProduct,
  onOpenAddSupplier,
  onViewQuotation,
  onEditQuotation,
  onDuplicateQuotation,
  onDeleteQuotation,
}) => {
  const isViewer = currentUserRole.trim().toUpperCase() === 'VIEWER';
  const stats = useMemo(() => {
    let activeCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;

    db.quotations.forEach((q) => {
      const st = getQuotationStatus(q.validUntil).status;
      if (st === 'Active') activeCount++;
      else if (st === 'Expiring Soon') expiringSoonCount++;
      else expiredCount++;
    });

    let totalStockItems = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalInventoryCost = 0;
    let estimatedInventoryValue = 0;

    db.products.forEach((p) => {
      totalStockItems += p.stock;
      if (p.stock <= 0) outOfStockCount++;
      else if (p.stock <= p.minStock) lowStockCount++;

      const avgCost = p.averageCost || p.currentCost;
      totalInventoryCost += p.stock * avgCost;
      estimatedInventoryValue += p.stock * p.sellingPrice;
    });

    const stockInToday = db.stockTransactions
      .filter((t) => t.type === 'IN' && t.date === '2026-10-06')
      .reduce((s, t) => s + t.quantity, 0);

    const stockOutToday = db.stockTransactions
      .filter((t) => t.type === 'OUT' && t.date === '2026-10-06')
      .reduce((s, t) => s + t.quantity, 0);

    const uniquePricedProducts = new Set(
      db.priceHistory.map((p) => p.productName.toLowerCase())
    );

    return {
      totalQuotations: db.quotations.length,
      activeQuotations: activeCount,
      expiringSoonQuotations: expiringSoonCount,
      expiredQuotations: expiredCount,
      totalSuppliers: db.suppliers.length,
      totalProducts: db.products.length,
      totalPriceRecords: db.priceHistory.length,
      lowestPriceItems: uniquePricedProducts.size,
      totalStockItems,
      lowStockCount,
      outOfStockCount,
      stockInToday,
      stockOutToday,
      totalInventoryCost,
      estimatedInventoryValue,
    };
  }, [db]);

  const sortedQuotations = useMemo(() => {
    return [...db.quotations].sort((a, b) => b.quotationDate.localeCompare(a.quotationDate));
  }, [db.quotations]);

  const lowStockProducts = useMemo(() => {
    return db.products.filter((p) => p.stock <= p.minStock);
  }, [db.products]);

  const handleDirectPrintDashboard = () => {
    const recentQuotationsHtml = sortedQuotations
      .slice(0, 10)
      .map((q) => {
        const st = getQuotationStatus(q.validUntil);
        return `
        <tr>
          <td><strong>${q.quotationNo}</strong></td>
          <td>${q.supplierName}</td>
          <td>${formatDate(q.quotationDate)}</td>
          <td>${formatDate(q.validUntil)}</td>
          <td class="text-right">${q.items.length}</td>
          <td class="text-right"><strong>${formatPeso(q.grandTotal, db.settings.currencySymbol)}</strong></td>
          <td>${st.status}</td>
        </tr>`;
      })
      .join('');

    const recentStockHtml = db.stockTransactions
      .slice(0, 8)
      .map(
        (t) => `
        <tr>
          <td><strong>${t.transactionNo}</strong></td>
          <td>${formatDate(t.date)}</td>
          <td>${t.type}</td>
          <td>${t.productName}</td>
          <td class="text-right"><strong>${t.type === 'IN' ? '+' : '-'}${t.quantity} ${t.unit}</strong></td>
          <td class="text-right">${t.newStock}</td>
          <td>${t.type === 'IN' ? t.supplierName || '—' : t.releasedTo || '—'}</td>
        </tr>`
      )
      .join('');

    directPrintHtml(
      'SOL_Executive_Dashboard_Report',
      `
      <div class="header">
        <div>
          <div class="company">${db.settings.companyName}</div>
          <div class="doc-title">EXECUTIVE PROCUREMENT & WAREHOUSE OPERATIONS SUMMARY</div>
          <div>${db.settings.companyAddress}</div>
          <div class="owner">Properties of BOSS YSHUA ACOGIDO</div>
        </div>
        <div class="meta">
          <div><strong>DASHBOARD EXECUTIVE REPORT</strong></div>
          <div>Date Printed: ${getManilaTimestamp()}</div>
          <div>Currency: ${db.settings.currencySymbol} (PHP)</div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="row"><span class="label">Total Quotations:</span><span class="val">${stats.totalQuotations} (${stats.activeQuotations} Active · ${stats.expiringSoonQuotations} Expiring Soon)</span></div>
          <div class="row"><span class="label">Expired Quotations:</span><span class="val">${stats.expiredQuotations}</span></div>
          <div class="row"><span class="label">Active Suppliers:</span><span class="val">${stats.totalSuppliers} Vendors</span></div>
          <div class="row"><span class="label">Master Products:</span><span class="val">${stats.totalProducts} Items (${stats.totalStockItems} Total Units)</span></div>
        </div>
        <div class="card">
          <div class="row"><span class="label">Total Inventory Cost Valuation:</span><span class="val">${formatPeso(stats.totalInventoryCost, db.settings.currencySymbol)}</span></div>
          <div class="row"><span class="label">Estimated Retail Selling Value:</span><span class="val-red">${formatPeso(stats.estimatedInventoryValue, db.settings.currencySymbol)}</span></div>
          <div class="row"><span class="label">Low / Out of Stock Alerts:</span><span class="val">${stats.lowStockCount} Low Stock · ${stats.outOfStockCount} Out of Stock</span></div>
          <div class="row"><span class="label">Today Stock Movement:</span><span class="val">In: +${stats.stockInToday} · Out: -${stats.stockOutToday}</span></div>
        </div>
      </div>

      <h4 style="margin: 14px 0 6px; text-transform: uppercase; font-size: 11px;">Recent Supplier Quotations (${sortedQuotations.length} Total)</h4>
      <table>
        <thead>
          <tr>
            <th>Quotation No.</th>
            <th>Supplier</th>
            <th>Date</th>
            <th>Valid Until</th>
            <th class="text-right">Items</th>
            <th class="text-right">Total Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${recentQuotationsHtml}
        </tbody>
      </table>

      <h4 style="margin: 18px 0 6px; text-transform: uppercase; font-size: 11px;">Recent Warehouse Stock Transactions</h4>
      <table>
        <thead>
          <tr>
            <th>Ref No.</th>
            <th>Date</th>
            <th>Type</th>
            <th>Product</th>
            <th class="text-right">Qty</th>
            <th class="text-right">New Balance</th>
            <th>Supplier / Released To</th>
          </tr>
        </thead>
        <tbody>
          ${recentStockHtml}
        </tbody>
      </table>

      <div class="signatures">
        <div>
          <div class="sig-label">Prepared By:</div>
          <div class="sig-line">Purchasing & Warehouse Operations</div>
        </div>
        <div>
          <div class="sig-label">Verified & Audited By:</div>
          <div class="sig-line">Internal Audit & Cost Control</div>
        </div>
        <div>
          <div class="sig-label">Noted & Approved By:</div>
          <div class="sig-owner">BOSS YSHUA ACOGIDO</div>
        </div>
      </div>
      `
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Expiration & Low Stock Dual Alert Banners (#11 & #24) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stats.expiringSoonQuotations > 0 && (
          <div className="bg-amber-50 border-l-4 border-[#D4AF37] p-4 rounded-r-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <p className="text-xs font-bold text-neutral-900">
                  {stats.expiringSoonQuotations} quotations are expiring within 7 days.
                </p>
                <p className="text-[11px] text-neutral-600">
                  Review validity dates or issue a new Request for Quotation (RFQ).
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('quotations')}
              className="px-3 py-1.5 text-xs font-semibold bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 whitespace-nowrap cursor-pointer"
            >
              View Quotations
            </button>
          </div>
        )}

        {!isRestrictedRole && (stats.lowStockCount > 0 || stats.outOfStockCount > 0) && (
          <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-neutral-900">
                  {stats.lowStockCount + stats.outOfStockCount} products are below minimum stock (
                  {stats.lowStockCount} Low · {stats.outOfStockCount} Out of Stock).
                </p>
                <p className="text-[11px] text-neutral-600">
                  Check Warehouse Inventory or convert a quotation into a Purchase Order.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="px-3 py-1.5 text-xs font-semibold bg-red-700 text-white rounded-lg hover:bg-red-800 whitespace-nowrap cursor-pointer"
            >
              View Inventory
            </button>
          </div>
        )}
      </div>

      {/* Quick Action Bar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-neutral-900">
            Executive Procurement & Warehouse Operations Center
          </h2>
          <p className="text-xs text-neutral-500">
            {isRestrictedRole
              ? 'Authorized Access: Dashboard · Quotations · Suppliers · Products · Price List · Price Comparison · Price History'
              : 'Quotations · Suppliers · Products · Price List · Inventory · Barcode · Audit Logs'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isViewer && (
            <button
              onClick={onOpenAddQuotation}
              className="px-3.5 py-2 bg-[#8B0000] hover:bg-[#6E0000] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Quotation</span>
            </button>
          )}
          {!isRestrictedRole && (
            <>
              <button
                onClick={() => onNavigate('stock_in')}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Stock In</span>
              </button>
              <button
                onClick={() => onNavigate('stock_out')}
                className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Stock Out</span>
              </button>
              <button
                onClick={() => onNavigate('barcode')}
                className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Scan Barcode</span>
              </button>
            </>
          )}
          <button
            onClick={() => onNavigate('pricelist')}
            className="px-3.5 py-2 bg-[#D4AF37]/25 hover:bg-[#D4AF37]/40 text-neutral-900 border border-[#D4AF37]/50 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-4 h-4 text-[#8B0000]" />
            <span>Search Price List</span>
          </button>
          <button
            type="button"
            onClick={handleDirectPrintDashboard}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#D4AF37]" />
            <span>Print Dashboard</span>
          </button>
        </div>
      </div>

      {/* Row 1: Quotations, Suppliers, Products & Prices KPIs (#6) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div
          onClick={() => onNavigate('quotations')}
          className="bg-white border border-neutral-200 rounded-lg p-4 hover:border-[#8B0000]/50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 mb-1.5">
            <span>TOTAL QUOTATIONS</span>
            <FileText className="w-4 h-4 text-[#8B0000]" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900">
            {stats.totalQuotations}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            🟢 {stats.activeQuotations} Active · 🟡 {stats.expiringSoonQuotations} Soon
          </div>
        </div>

        <div
          onClick={() => onNavigate('quotations')}
          className="bg-white border border-neutral-200 rounded-lg p-4 hover:border-red-600/50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 mb-1.5">
            <span>EXPIRED QUOTATIONS</span>
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-700">
            {stats.expiredQuotations}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">🔴 Past validity date</div>
        </div>

        <div
          onClick={() => onNavigate('suppliers')}
          className="bg-white border border-neutral-200 rounded-lg p-4 hover:border-[#8B0000]/50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 mb-1.5">
            <span>SUPPLIERS</span>
            <Users className="w-4 h-4 text-[#8B0000]" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900">
            {stats.totalSuppliers}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            {stats.totalSuppliers} Active Vendors
          </div>
        </div>

        <div
          onClick={() => onNavigate('products')}
          className="bg-white border border-neutral-200 rounded-lg p-4 hover:border-[#8B0000]/50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 mb-1.5">
            <span>PRODUCTS</span>
            <Package className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900">
            {stats.totalProducts}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            {stats.totalStockItems} Total Units in Stock
          </div>
        </div>

        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white border border-neutral-200 rounded-lg p-4 hover:border-emerald-600/50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 mb-1.5">
            <span>INVENTORY COST</span>
            <History className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-700">
            {formatPeso(stats.totalInventoryCost, db.settings.currencySymbol)}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            In Today: +{stats.stockInToday} · Out: -{stats.stockOutToday}
          </div>
        </div>

        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white border border-neutral-200 rounded-lg p-4 hover:border-[#8B0000]/50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 mb-1.5">
            <span>EST. RETAIL VALUE</span>
            <Award className="w-4 h-4 text-[#8B0000]" />
          </div>
          <div className="text-lg font-bold font-mono text-[#8B0000]">
            {formatPeso(stats.estimatedInventoryValue, db.settings.currencySymbol)}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            🟡 {stats.lowStockCount} Low · 🔴 {stats.outOfStockCount} Out
          </div>
        </div>
      </div>

      {/* Recent Quotations & Recent Stock Transactions */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Recent Supplier Quotations</h3>
              <p className="text-xs text-neutral-500">
                Click any quotation record to inspect items, print, or convert to PO
              </p>
            </div>
            <button
              onClick={() => onNavigate('quotations')}
              className="text-xs font-semibold text-[#8B0000] hover:underline cursor-pointer"
            >
              View All ({db.quotations.length})
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-semibold text-neutral-500 uppercase">
                  <th className="py-3 px-4">Quotation No.</th>
                  <th className="py-3 px-3">Supplier</th>
                  <th className="py-3 px-3">Valid Until</th>
                  <th className="py-3 px-3 text-right">Total Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs">
                {sortedQuotations.slice(0, 6).map((q) => {
                  const statusInfo = getQuotationStatus(q.validUntil);
                  return (
                    <tr key={q.id} className="hover:bg-neutral-50/90">
                      <td className="py-3 px-4 font-mono font-semibold text-[#8B0000]">
                        <button
                          onClick={() => onViewQuotation(q)}
                          className="hover:underline text-left cursor-pointer"
                        >
                          {q.quotationNo}
                        </button>
                      </td>
                      <td className="py-3 px-3 font-medium text-neutral-900">{q.supplierName}</td>
                      <td className="py-3 px-3 font-mono text-neutral-600">
                        {formatDate(q.validUntil)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-neutral-900">
                        {formatPeso(q.grandTotal, db.settings.currencySymbol)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-semibold">
                        {statusInfo.status === 'Active' && (
                          <span className="text-emerald-700">🟢 Active</span>
                        )}
                        {statusInfo.status === 'Expiring Soon' && (
                          <span className="text-amber-700">🟡 Expiring Soon</span>
                        )}
                        {statusInfo.status === 'Expired' && (
                          <span className="text-red-700">🔴 Expired</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onViewQuotation(q)}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditQuotation(q)}
                            className="p-1.5 text-neutral-500 hover:text-[#8B0000] rounded cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDuplicateQuotation(q)}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteQuotation(q)}
                            className="p-1.5 text-neutral-500 hover:text-red-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recent Stock Movements & Audit Activity (#6) */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900">Recent Stock Transactions</h3>
              {!isRestrictedRole && (
                <button
                  onClick={() => onNavigate('inventory')}
                  className="text-xs font-semibold text-[#8B0000] hover:underline cursor-pointer"
                >
                  Open Inventory
                </button>
              )}
            </div>
            <div className="divide-y divide-neutral-200 text-xs">
              {db.stockTransactions.slice(0, 4).map((t) => (
                <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-neutral-900">
                      <span
                        className={`font-mono mr-1.5 ${
                          t.type === 'IN' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        [{t.transactionNo}]
                      </span>
                      {t.productName}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {formatDate(t.date)} ·{' '}
                      {t.type === 'IN' ? `From ${t.supplierName}` : `To ${t.releasedTo}`}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div
                      className={`font-bold ${
                        t.type === 'IN' ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {t.type === 'IN' ? `+${t.quantity}` : `-${t.quantity}`} {t.unit}
                    </div>
                    <div className="text-[10px] text-neutral-400">Bal: {t.newStock}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Watchlist & Recent Audit Activity */}
          {!isRestrictedRole && (
            <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#8B0000]" />
                  <h3 className="text-sm font-bold text-neutral-900">Recent Audit Log Activity</h3>
                </div>
                <button
                  onClick={() => onNavigate('audit')}
                  className="text-xs font-semibold text-[#8B0000] hover:underline cursor-pointer"
                >
                  Full Trail
                </button>
              </div>
              <div className="divide-y divide-neutral-100 text-xs">
                {db.auditLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">
                        {log.user} · <span className="text-[#8B0000]">{log.action}</span>
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {log.timestamp}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-600 truncate">{log.details}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
