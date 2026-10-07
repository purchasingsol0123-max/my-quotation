import React, { useState } from 'react';
import { Calculator, Check, Printer } from 'lucide-react';
import { AppDatabase, Product } from '../types';
import { formatPeso, triggerSystemPrint } from '../utils';

interface MarkupCalculatorViewProps {
  db: AppDatabase;
  onApplyProductMarkup: (
    productId: string,
    costPrice: number,
    markupPercent: number,
    sellingPrice: number
  ) => void;
}

const PRESET_MARKUPS = [10, 15, 20, 25, 30, 35, 40];

export const MarkupCalculatorView: React.FC<MarkupCalculatorViewProps> = ({
  db,
  onApplyProductMarkup,
}) => {
  const [costPrice, setCostPrice] = useState<number>(320);
  const [markupPercent, setMarkupPercent] = useState<number>(30);
  const [selectedProductId, setSelectedProductId] = useState<string>(db.products[0]?.id || '');

  const markupAmount = Number(((costPrice * markupPercent) / 100).toFixed(2));
  const sellingPrice = Number((costPrice + markupAmount).toFixed(2));
  const vatInclusivePrice = Number(
    (sellingPrice * (1 + (db.settings.defaultVatPercent || 12) / 100)).toFixed(2)
  );

  const handleLoadProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = db.products.find((p) => p.id === prodId);
    if (prod) {
      setCostPrice(prod.currentCost);
      setMarkupPercent(prod.markupPercent);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Markup Calculator Card */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-lg p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-neutral-200">
            <div className="flex items-center gap-2.5">
              <Calculator className="w-5 h-5 text-[#8B0000]" />
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  SOL Built-In Markup & Selling Price Calculator
                </h2>
                <p className="text-xs text-neutral-500">
                  Calculate selling prices from supplier cost using preset or custom markup percentages
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => triggerSystemPrint('Markup & Selling Price Calculator Sheet')}
              className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer no-print"
            >
              <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Print Markup Sheet</span>
            </button>
          </div>

          {/* Load from Existing Master Product */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Quick Load Cost Price from Product Database (Optional)
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <select
                value={selectedProductId}
                onChange={(e) => handleLoadProduct(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg"
              >
                {db.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Current Cost: {formatPeso(p.currentCost, db.settings.currencySymbol)}{' '}
                    ({p.markupPercent}% markup)
                  </option>
                ))}
              </select>
              {selectedProductId && (
                <button
                  type="button"
                  onClick={() =>
                    onApplyProductMarkup(selectedProductId, costPrice, markupPercent, sellingPrice)
                  }
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Update Product Price</span>
                </button>
              )}
            </div>
          </div>

          {/* Cost & Custom Markup Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                Cost Price ({db.settings.currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 text-lg font-mono font-bold bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                Custom Markup (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={markupPercent}
                onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 text-lg font-mono font-bold bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:bg-white"
              />
            </div>
          </div>

          {/* Preset Markup Tier Buttons: 10%, 15%, 20%, 25%, 30%, 35%, 40% */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-2">
              Quick Markup Percentage Presets:
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_MARKUPS.map((pct) => {
                const isSelected = markupPercent === pct;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setMarkupPercent(pct)}
                    className={`px-4 py-2 text-xs font-mono font-bold rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#8B0000] text-white border-[#8B0000]'
                        : 'bg-neutral-50 text-neutral-800 border-neutral-300 hover:bg-neutral-100'
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Live Result Display Card */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#1A1C20] to-[#272A30] text-white rounded-lg p-6 flex flex-col justify-between border border-neutral-800">
          <div>
            <div className="text-xs font-bold tracking-widest text-[#D4AF37] uppercase">
              LIVE CALCULATION SUMMARY
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              Cost Price + {markupPercent}% Markup
            </h3>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-center justify-between py-2.5 border-b border-white/10">
                <span className="text-neutral-300">Cost Price:</span>
                <span className="font-mono font-bold text-lg text-white">
                  {formatPeso(costPrice, db.settings.currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2.5 border-b border-white/10">
                <span className="text-neutral-300">Markup Percentage:</span>
                <span className="font-mono font-bold text-lg text-[#D4AF37]">
                  {markupPercent}%
                </span>
              </div>

              <div className="flex items-center justify-between py-2.5 border-b border-white/10">
                <span className="text-neutral-300">Markup Amount:</span>
                <span className="font-mono font-bold text-lg text-emerald-400">
                  +{formatPeso(markupAmount, db.settings.currencySymbol)}
                </span>
              </div>

              <div className="pt-3 flex items-center justify-between">
                <span className="text-base font-bold text-[#F3E5AB]">Selling Price:</span>
                <span className="font-mono font-extrabold text-3xl text-[#D4AF37]">
                  {formatPeso(sellingPrice, db.settings.currencySymbol)}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-neutral-400">
                <span>With {db.settings.defaultVatPercent}% VAT Inclusive:</span>
                <span className="font-mono font-semibold text-neutral-200">
                  {formatPeso(vatInclusivePrice, db.settings.currencySymbol)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-xs text-neutral-400">
            Formula: Selling Price = Cost Price × (1 + Markup % / 100)
          </div>
        </div>
      </div>

      {/* Reference Tier Matrix Table for Current Cost Price */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-200">
          <h3 className="text-sm font-bold text-neutral-900">
            Quick Tier Comparison Matrix for Base Cost{' '}
            <span className="font-mono text-[#8B0000]">
              {formatPeso(costPrice, db.settings.currencySymbol)}
            </span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                <th className="py-2.5 px-4">Markup Tier</th>
                <th className="py-2.5 px-4 text-right">Base Cost Price</th>
                <th className="py-2.5 px-4 text-right">Markup Amount</th>
                <th className="py-2.5 px-4 text-right">Selling Price (VAT Excl.)</th>
                <th className="py-2.5 px-4 text-right">
                  Selling Price (+{db.settings.defaultVatPercent}% VAT)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs">
              {PRESET_MARKUPS.map((tier) => {
                const mAmt = (costPrice * tier) / 100;
                const sPrice = costPrice + mAmt;
                const sVat = sPrice * (1 + (db.settings.defaultVatPercent || 12) / 100);
                const isCurrent = tier === markupPercent;
                return (
                  <tr
                    key={tier}
                    onClick={() => setMarkupPercent(tier)}
                    className={`cursor-pointer transition-colors ${
                      isCurrent ? 'bg-amber-50/80 font-semibold' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-[#8B0000]">
                      {tier}% Markup {isCurrent && ' (Selected)'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      {formatPeso(costPrice, db.settings.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-700">
                      +{formatPeso(mAmt, db.settings.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-neutral-900">
                      {formatPeso(sPrice, db.settings.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-neutral-600">
                      {formatPeso(sVat, db.settings.currencySymbol)}
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
