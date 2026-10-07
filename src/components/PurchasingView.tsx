import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  CheckCircle2,
  ArrowRight,
  PackageCheck,
  FileText,
  Printer,
} from 'lucide-react';
import {
  AppDatabase,
  PurchaseOrder,
  PurchaseOrderItem,
  Quotation,
  UserAccount,
} from '../types';
import { formatDate, formatPeso, triggerSystemPrint } from '../utils';

interface PurchasingViewProps {
  db: AppDatabase;
  currentUser: UserAccount;
  onCreatePurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => void;
  onReceivePurchaseOrder: (po: PurchaseOrder) => void;
}

export const PurchasingView: React.FC<PurchasingViewProps> = ({
  db,
  currentUser,
  onCreatePurchaseOrder,
  onReceivePurchaseOrder,
}) => {
  const defaultToday = new Date().toISOString().split('T')[0];
  const defaultExpected = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  })();

  const [selectedQuotationId, setSelectedQuotationId] = useState<string>(
    db.quotations[0]?.id || ''
  );
  const [poNumber, setPoNumber] = useState(
    `PO-2026-${String(db.purchaseOrders.length + 101).slice(-3)}`
  );
  const [expectedDate, setExpectedDate] = useState(defaultExpected);
  const [warehouse, setWarehouse] = useState('Main Warehouse');
  const [remarks, setRemarks] = useState('');

  const selectedQuotation: Quotation | undefined = db.quotations.find(
    (q) => q.id === selectedQuotationId
  );

  const handleGeneratePOFromQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuotation) return;

    const poItems: PurchaseOrderItem[] = selectedQuotation.items.map((it, idx) => {
      const matchedProd = db.products.find(
        (p) => p.id === it.productId || p.name.toLowerCase() === it.itemName.toLowerCase()
      );
      return {
        id: `poi-${Date.now()}-${idx}`,
        productId: matchedProd?.id || it.productId || `prod-${idx}`,
        productName: it.itemName,
        sku: matchedProd?.sku || matchedProd?.code || 'SKU',
        unit: it.unit,
        quantity: it.quantity,
        unitCost: it.unitCost,
        totalCost: it.totalCost,
      };
    });

    onCreatePurchaseOrder({
      poNumber,
      quotationNo: selectedQuotation.quotationNo,
      supplierId: selectedQuotation.supplierId,
      supplierName: selectedQuotation.supplierName,
      date: defaultToday,
      expectedDeliveryDate: expectedDate,
      status: 'Approved',
      warehouse,
      items: poItems,
      totalAmount: selectedQuotation.grandTotal,
      preparedBy: currentUser.name,
      approvedBy: 'Boss Yshua Acogido',
      remarks:
        remarks ||
        `Purchase Order generated from Quotation ${selectedQuotation.quotationNo}`,
    });

    setPoNumber(`PO-2026-${String(db.purchaseOrders.length + 102).slice(-3)}`);
    setRemarks('');
  };

  return (
    <div className="space-y-6">
      {/* End-to-End Procurement Workflow Banner (#25) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        <div className="text-xs font-bold text-[#8B0000] uppercase mb-2">
          INTEGRATED PURCHASING PIPELINE (#25)
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-800">
          <span className="px-3 py-1.5 bg-neutral-100 rounded-lg">1. Supplier Quotation</span>
          <ArrowRight className="w-4 h-4 text-neutral-400" />
          <span className="px-3 py-1.5 bg-neutral-100 rounded-lg">2. Purchase Decision</span>
          <ArrowRight className="w-4 h-4 text-neutral-400" />
          <span className="px-3 py-1.5 bg-amber-100 text-neutral-900 rounded-lg">
            3. Purchase Order (PO)
          </span>
          <ArrowRight className="w-4 h-4 text-neutral-400" />
          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-900 rounded-lg">
            4. Stock In Receiving → Inventory Updated
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Convert Quotation to Purchase Order */}
        <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-lg p-5">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-neutral-200">
            <ShoppingBag className="w-4 h-4 text-[#8B0000]" />
            <h3 className="text-sm font-bold text-neutral-900">
              Create Purchase Order from Quotation
            </h3>
          </div>

          <form onSubmit={handleGeneratePOFromQuotation} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Select Approved Supplier Quotation *
              </label>
              <select
                value={selectedQuotationId}
                onChange={(e) => setSelectedQuotationId(e.target.value)}
                className="w-full px-3 py-2 bg-amber-50/80 border border-[#D4AF37] rounded-lg font-semibold"
              >
                {db.quotations.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.quotationNo} — {q.supplierName} (
                    {formatPeso(q.grandTotal, db.settings.currencySymbol)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">PO Number *</label>
                <input
                  type="text"
                  required
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Expected Delivery *
                </label>
                <input
                  type="date"
                  required
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Receiving Warehouse *
              </label>
              <input
                type="text"
                required
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
              />
            </div>

            {selectedQuotation && (
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 space-y-1.5">
                <div className="font-bold text-neutral-900">
                  Quotation Items ({selectedQuotation.items.length}):
                </div>
                {selectedQuotation.items.map((it) => (
                  <div key={it.id} className="flex justify-between text-[11px] text-neutral-600">
                    <span>
                      {it.itemName} ({it.quantity} {it.unit})
                    </span>
                    <span className="font-mono font-semibold text-neutral-900">
                      {formatPeso(it.totalCost, db.settings.currencySymbol)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-neutral-200 pt-1.5 flex justify-between font-bold text-[#8B0000]">
                  <span>Total PO Amount:</span>
                  <span className="font-mono">
                    {formatPeso(selectedQuotation.grandTotal, db.settings.currencySymbol)}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">PO Remarks</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Special receiving or delivery notes..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#8B0000] hover:bg-[#6E0000] text-white font-bold rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Official Purchase Order (PO)</span>
            </button>
          </form>
        </div>

        {/* Right: Purchase Orders & One-Click Stock In Receiving */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Purchase Orders & Receiving Log ({db.purchaseOrders.length})
              </h3>
              <p className="text-xs text-neutral-500">
                Click "Receive into Stock In" when supplier items arrive at the warehouse
              </p>
            </div>
            <button
              type="button"
              onClick={() => triggerSystemPrint('Purchase Orders & Receiving Log')}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer no-print"
            >
              <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Print PO Log</span>
            </button>
          </div>

          <div className="divide-y divide-neutral-200 text-xs">
            {db.purchaseOrders.map((po) => (
              <div key={po.id} className="p-4 space-y-3 hover:bg-neutral-50/70">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-sm text-[#8B0000]">
                        {po.poNumber}
                      </span>
                      <span className="text-neutral-400">·</span>
                      <span className="font-bold text-neutral-900">{po.supplierName}</span>
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      Quotation Ref: <span className="font-mono">{po.quotationNo || 'Direct'}</span>{' '}
                      · Date: {formatDate(po.date)} · Expected:{' '}
                      {formatDate(po.expectedDeliveryDate)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="text-right font-mono">
                      <div className="font-bold text-neutral-900">
                        {formatPeso(po.totalAmount, db.settings.currencySymbol)}
                      </div>
                      <div className="text-[11px] font-semibold">
                        {po.status === 'Received' ? (
                          <span className="text-emerald-700">🟢 Received into Stock</span>
                        ) : (
                          <span className="text-amber-700">🟡 Approved / Awaiting Delivery</span>
                        )}
                      </div>
                    </div>

                    {po.status !== 'Received' && (
                      <button
                        onClick={() => onReceivePurchaseOrder(po)}
                        className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <PackageCheck className="w-4 h-4" />
                        <span>Receive into Stock In</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* PO Line Items */}
                <div className="bg-neutral-50 border border-neutral-200 rounded p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {po.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-neutral-700">
                        • {item.productName} ({item.quantity} {item.unit})
                      </span>
                      <span className="font-mono text-neutral-900">
                        {formatPeso(item.totalCost, db.settings.currencySymbol)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
