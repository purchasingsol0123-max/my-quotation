import React, { useMemo, useState } from 'react';
import { History, TrendingUp, TrendingDown, ShieldCheck, Printer } from 'lucide-react';
import { AppDatabase } from '../types';
import {
  calculatePriceChange,
  formatDate,
  formatMonthYear,
  formatPeso,
  triggerSystemPrint,
} from '../utils';

interface PriceHistoryViewProps {
  db: AppDatabase;
}

export const PriceHistoryView: React.FC<PriceHistoryViewProps> = ({ db }) => {
  const productNames = useMemo(() => {
    const set = new Set<string>();
    db.priceHistory.forEach((p) => set.add(p.productName));
    return Array.from(set);
  }, [db.priceHistory]);

  const [selectedProduct, setSelectedProduct] = useState<string>(
    productNames.find((n) => n.toLowerCase().includes('floor cleaner')) ||
      productNames[0] ||
      'Floor Cleaner 1 Gallon'
  );
  const [selectedSupplier, setSelectedSupplier] = useState<string>('ALL');

  // Records for selected product & optional supplier sorted chronologically (oldest -> newest for chart, newest -> oldest for log)
  const productRecordsChrono = useMemo(() => {
    return db.priceHistory
      .filter((r) => {
        if (r.productName.toLowerCase() !== selectedProduct.toLowerCase()) return false;
        if (selectedSupplier !== 'ALL' && r.supplierName !== selectedSupplier) return false;
        return true;
      })
      .sort((a, b) => a.dateRecorded.localeCompare(b.dateRecorded));
  }, [db.priceHistory, selectedProduct, selectedSupplier]);

  const productRecordsReverse = useMemo(() => {
    return [...productRecordsChrono].reverse();
  }, [productRecordsChrono]);

  // Available suppliers for the selected product
  const suppliersForProduct = useMemo(() => {
    const set = new Set<string>();
    db.priceHistory
      .filter((r) => r.productName.toLowerCase() === selectedProduct.toLowerCase())
      .forEach((r) => set.add(r.supplierName));
    return Array.from(set);
  }, [db.priceHistory, selectedProduct]);

  // SVG Chart Geometry
  const chartPoints = useMemo(() => {
    if (productRecordsChrono.length === 0) return [];
    const prices = productRecordsChrono.map((r) => r.costPrice);
    const minP = Math.min(...prices) * 0.9;
    const maxP = Math.max(...prices) * 1.08;
    const range = Math.max(10, maxP - minP);

    const width = 680;
    const height = 200;
    const padX = 55;
    const padY = 28;

    return productRecordsChrono.map((rec, idx) => {
      const x =
        productRecordsChrono.length === 1
          ? width / 2
          : padX + (idx / (productRecordsChrono.length - 1)) * (width - padX * 2);
      const y = height - padY - ((rec.costPrice - minP) / range) * (height - padY * 2);
      return {
        x,
        y,
        rec,
      };
    });
  }, [productRecordsChrono]);

  // Overall variance stats
  const varianceStats = useMemo(() => {
    let increases = 0;
    let decreases = 0;
    db.priceHistory.forEach((r) => {
      const ch = calculatePriceChange(r.previousPrice, r.costPrice);
      if (ch.direction === 'increase') increases++;
      if (ch.direction === 'decrease') decreases++;
    });
    return { increases, decreases, total: db.priceHistory.length };
  }, [db.priceHistory]);

  return (
    <div className="space-y-6">
      {/* Audit Policy Banner */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#8B0000] shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-neutral-900">
              Immutable Supplier Price History & Variance Tracker
            </h2>
            <p className="text-xs text-neutral-500">
              Old supplier price records are never overwritten or deleted when new quotations arrive. Every price movement is tracked with exact ₱ and % change.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono shrink-0">
          <div className="px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-700 font-semibold inline-flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{varianceStats.increases} Increases</span>
          </div>
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-semibold inline-flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>{varianceStats.decreases} Decreases</span>
          </div>
          <button
            type="button"
            onClick={() => triggerSystemPrint(`Price History & Variance Log - ${selectedProduct}`)}
            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-sans font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer no-print"
          >
            <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Print History Log</span>
          </button>
        </div>
      </div>

      {/* Product & Supplier Selector + Interactive SVG Price Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Timeline & Month-by-Month Log */}
        <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="space-y-3 pb-4 border-b border-neutral-200">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Select Product to Inspect Timeline:
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => {
                    setSelectedProduct(e.target.value);
                    setSelectedSupplier('ALL');
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-amber-50/80 border border-[#D4AF37] rounded-lg"
                >
                  {productNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Filter by Supplier:
                </label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-lg"
                >
                  <option value="ALL">All Suppliers ({suppliersForProduct.length})</option>
                  {suppliersForProduct.map((sup) => (
                    <option key={sup} value={sup}>
                      {sup}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chronological Price Log List (#8 Example format) */}
            <div className="mt-4">
              <div className="text-xs font-bold text-neutral-900 uppercase mb-3">
                Price History Log — {selectedProduct}
              </div>
              <div className="divide-y divide-neutral-200 max-h-72 overflow-y-auto">
                {productRecordsReverse.map((rec) => {
                  const ch = calculatePriceChange(rec.previousPrice, rec.costPrice);
                  return (
                    <div key={rec.id} className="py-3 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-bold text-neutral-900">
                          {formatMonthYear(rec.dateRecorded)} —{' '}
                          <span className="font-mono text-[#8B0000]">
                            {formatPeso(rec.costPrice, db.settings.currencySymbol)}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          Supplier: {rec.supplierName} · {formatDate(rec.dateRecorded)}
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <span
                          className={
                            ch.direction === 'increase'
                              ? 'text-red-700 font-semibold'
                              : ch.direction === 'decrease'
                              ? 'text-emerald-700 font-semibold'
                              : 'text-neutral-500'
                          }
                        >
                          {ch.summaryText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Visual Price History Chart */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Historical Price Trend Chart ({selectedProduct})
                </h3>
                <p className="text-xs text-neutral-500">
                  Visualizes cost movements across recorded supplier quotations over time
                </p>
              </div>
              <History className="w-4 h-4 text-[#8B0000]" />
            </div>

            {chartPoints.length > 0 ? (
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 overflow-x-auto">
                <svg
                  viewBox="0 0 680 220"
                  className="w-full h-56 overflow-visible"
                  role="img"
                  aria-label="Supplier Price History Chart"
                >
                  {/* Horizontal Reference Lines */}
                  {[40, 90, 140, 180].map((yPos) => (
                    <line
                      key={yPos}
                      x1="40"
                      y1={yPos}
                      x2="640"
                      y2={yPos}
                      stroke="#e5e5e5"
                      strokeDasharray="4 4"
                    />
                  ))}

                  {/* Connecting Polyline */}
                  {chartPoints.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#8B0000"
                      strokeWidth="3"
                      points={chartPoints.map((pt) => `${pt.x},${pt.y}`).join(' ')}
                    />
                  )}

                  {/* Data Nodes & Labels */}
                  {chartPoints.map((pt, idx) => (
                    <g key={pt.rec.id}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="6"
                        fill="#D4AF37"
                        stroke="#8B0000"
                        strokeWidth="2.5"
                      />
                      <text
                        x={pt.x}
                        y={pt.y - 12}
                        textAnchor="middle"
                        className="text-[11px] font-mono font-bold fill-neutral-900"
                      >
                        ₱{pt.rec.costPrice.toLocaleString()}
                      </text>
                      <text
                        x={pt.x}
                        y={205}
                        textAnchor="middle"
                        className="text-[10px] fill-neutral-500"
                      >
                        {pt.rec.dateRecorded.slice(5)} ({pt.rec.supplierName.split(' ')[0]})
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-neutral-400">
                No historical chart data for this selection.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between text-xs text-neutral-500">
            <span>Total Recorded Snapshots: {productRecordsChrono.length}</span>
            <span>Currency: Philippine Peso (₱)</span>
          </div>
        </div>
      </div>

      {/* Complete Historical Price Movement Audit Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-200">
          <h3 className="text-sm font-bold text-neutral-900">
            Complete Historical Price Movement Audit Log ({db.priceHistory.length} Records)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                <th className="py-3 px-4">Date / Month</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Quotation Ref</th>
                <th className="py-3 px-4 text-right">Old Price</th>
                <th className="py-3 px-4 text-right">New Price</th>
                <th className="py-3 px-4">Price Change Analysis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs">
              {[...db.priceHistory]
                .sort((a, b) => b.dateRecorded.localeCompare(a.dateRecorded))
                .map((rec) => {
                  const change = calculatePriceChange(rec.previousPrice, rec.costPrice);
                  return (
                    <tr key={rec.id} className="hover:bg-neutral-50/90">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-neutral-900">
                          {formatMonthYear(rec.dateRecorded)}
                        </div>
                        <div className="text-[11px] font-mono text-neutral-500">
                          {formatDate(rec.dateRecorded)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-neutral-900">{rec.productName}</div>
                        <div className="text-[11px] text-neutral-500">
                          {rec.brand} · {rec.size}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-neutral-800">
                        {rec.supplierName}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#8B0000]">
                        {rec.quotationNo || 'Direct Update'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-neutral-500">
                        {rec.previousPrice !== undefined
                          ? formatPeso(rec.previousPrice, db.settings.currencySymbol)
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900">
                        {formatPeso(rec.costPrice, db.settings.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={
                            change.direction === 'increase'
                              ? 'text-red-700 font-bold'
                              : change.direction === 'decrease'
                              ? 'text-emerald-700 font-bold'
                              : 'text-neutral-500'
                          }
                        >
                          {change.summaryText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
