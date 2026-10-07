import React, { useMemo, useState } from 'react';
import { Search, Award, Scale, AlertCircle, Printer } from 'lucide-react';
import { AppDatabase } from '../types';
import { formatDate, formatPeso, triggerSystemPrint } from '../utils';

interface PriceComparisonViewProps {
  db: AppDatabase;
}

export const PriceComparisonView: React.FC<PriceComparisonViewProps> = ({ db }) => {
  // Unique product names present in price history
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
  const [searchFilter, setSearchFilter] = useState('');

  // Get latest price per supplier for the selected product
  const singleProductComparison = useMemo(() => {
    const records = db.priceHistory
      .filter((r) => r.productName.toLowerCase().includes(selectedProduct.toLowerCase()))
      .sort((a, b) => b.dateRecorded.localeCompare(a.dateRecorded));

    const latestBySupplier = new Map<
      string,
      {
        supplierId: string;
        supplierName: string;
        costPrice: number;
        brand: string;
        specification: string;
        size: string;
        dateRecorded: string;
        quotationNo?: string;
        rating: number;
        remarks: string;
        deliveryTerms: string;
        paymentTerms: string;
      }
    >();

    records.forEach((r) => {
      if (!latestBySupplier.has(r.supplierName)) {
        const supProfile = db.suppliers.find(
          (s) => s.id === r.supplierId || s.name === r.supplierName
        );
        latestBySupplier.set(r.supplierName, {
          supplierId: r.supplierId,
          supplierName: r.supplierName,
          costPrice: r.costPrice,
          brand: r.brand,
          specification: r.specification,
          size: r.size,
          dateRecorded: r.dateRecorded,
          quotationNo: r.quotationNo,
          rating: supProfile?.rating || 4,
          remarks: supProfile?.remarks || r.remarks || '',
          deliveryTerms: supProfile?.deliveryTerms || 'Standard Delivery',
          paymentTerms: supProfile?.paymentTerms || '30 Days',
        });
      }
    });

    const list = Array.from(latestBySupplier.values()).sort((a, b) => a.costPrice - b.costPrice);
    if (list.length === 0) {
      return {
        list: [],
        lowest: null,
        highest: null,
        average: 0,
        difference: 0,
      };
    }

    const lowest = list[0];
    const highest = list[list.length - 1];
    const sum = list.reduce((acc, item) => acc + item.costPrice, 0);
    const average = sum / list.length;
    const difference = highest.costPrice - lowest.costPrice;

    return {
      list,
      lowest,
      highest,
      average,
      difference,
    };
  }, [db.priceHistory, db.suppliers, selectedProduct]);

  // Multi-product Cross-Supplier Comparison Matrix Table
  const matrixData = useMemo(() => {
    const suppliersList = db.suppliers.map((s) => s.name);
    const filteredProds = productNames.filter((name) =>
      name.toLowerCase().includes(searchFilter.toLowerCase())
    );

    const rows = filteredProds.map((prodName) => {
      const pricesBySup: Record<string, number | undefined> = {};
      let minPrice = Infinity;
      let minSupplier = '';

      suppliersList.forEach((supName) => {
        const recs = db.priceHistory
          .filter(
            (r) =>
              r.productName.toLowerCase() === prodName.toLowerCase() &&
              r.supplierName.toLowerCase() === supName.toLowerCase()
          )
          .sort((a, b) => b.dateRecorded.localeCompare(a.dateRecorded));
        if (recs.length > 0) {
          const val = recs[0].costPrice;
          pricesBySup[supName] = val;
          if (val < minPrice) {
            minPrice = val;
            minSupplier = supName;
          }
        }
      });

      return {
        productName: prodName,
        pricesBySup,
        lowestPrice: minPrice === Infinity ? undefined : minPrice,
        lowestSupplier: minSupplier,
      };
    });

    return { suppliersList, rows };
  }, [db.suppliers, db.priceHistory, productNames, searchFilter]);

  return (
    <div className="space-y-6">
      {/* Top Product Spotlight Selector */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              Supplier Price Comparison & Lowest Bid Analyzer
            </h2>
            <p className="text-xs text-neutral-500">
              Compare supplier quotations side-by-side while evaluating supplier star ratings, payment terms, and remarks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 no-print">
            <label className="text-xs font-semibold text-neutral-700">
              Select Product to Compare:
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="px-3.5 py-2 text-xs font-semibold bg-amber-50/90 border border-[#D4AF37] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
            >
              {productNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => triggerSystemPrint(`Supplier Price Comparison - ${selectedProduct}`)}
              className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Print Comparison</span>
            </button>
          </div>
        </div>

        {/* Highlight Banner & Key Comparison Metrics */}
        {singleProductComparison.lowest ? (
          <div className="pt-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* 🏆 LOWEST PRICE HIGHLIGHT CARD */}
              <div className="lg:col-span-5 bg-gradient-to-br from-[#8B0000] to-[#520000] text-white rounded-lg p-5 flex flex-col justify-between border border-[#D4AF37]/40">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#F3E5AB] uppercase">
                    <Award className="w-4 h-4 text-[#D4AF37]" />
                    <span>🏆 LOWEST PRICE SUPPLIER</span>
                  </div>
                  <h3 className="text-xl font-extrabold mt-1">{selectedProduct}</h3>
                  <div className="text-3xl font-mono font-extrabold text-[#D4AF37] mt-2">
                    {formatPeso(
                      singleProductComparison.lowest.costPrice,
                      db.settings.currencySymbol
                    )}
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {singleProductComparison.lowest.supplierName}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/15 text-xs text-neutral-200 flex items-center justify-between">
                  <span>
                    Rating: {'★'.repeat(singleProductComparison.lowest.rating)} (
                    {singleProductComparison.lowest.rating}/5)
                  </span>
                  <span>Terms: {singleProductComparison.lowest.paymentTerms}</span>
                </div>
              </div>

              {/* 4 Metric Comparison Cards */}
              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                  <div className="text-[11px] font-semibold text-neutral-500 uppercase">
                    Lowest Price
                  </div>
                  <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
                    {formatPeso(
                      singleProductComparison.lowest.costPrice,
                      db.settings.currencySymbol
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1 truncate">
                    {singleProductComparison.lowest.supplierName}
                  </div>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                  <div className="text-[11px] font-semibold text-neutral-500 uppercase">
                    Highest Price
                  </div>
                  <div className="text-lg font-bold font-mono text-red-700 mt-1">
                    {formatPeso(
                      singleProductComparison.highest?.costPrice || 0,
                      db.settings.currencySymbol
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1 truncate">
                    {singleProductComparison.highest?.supplierName}
                  </div>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                  <div className="text-[11px] font-semibold text-neutral-500 uppercase">
                    Average Price
                  </div>
                  <div className="text-lg font-bold font-mono text-neutral-900 mt-1">
                    {formatPeso(singleProductComparison.average, db.settings.currencySymbol)}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    Across {singleProductComparison.list.length} supplier(s)
                  </div>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                  <div className="text-[11px] font-semibold text-neutral-500 uppercase">
                    Price Spread
                  </div>
                  <div className="text-lg font-bold font-mono text-[#8B0000] mt-1">
                    {formatPeso(singleProductComparison.difference, db.settings.currencySymbol)}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    Savings vs highest bid
                  </div>
                </div>

                {/* Procurement Advisory Note (#19 Business Logic) */}
                <div className="col-span-2 sm:col-span-4 bg-amber-50/70 border border-[#D4AF37]/40 rounded-lg p-3 flex items-start gap-2.5 text-xs text-neutral-700">
                  <AlertCircle className="w-4 h-4 text-[#8B0000] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-neutral-900">
                      Procurement Evaluation Note:
                    </span>{' '}
                    Do not assume the cheapest price is always the best supplier. Review the supplier rating (★★★★★), payment credit terms, and delivery lead time below before issuing a Purchase Order.
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Supplier Breakdown for Selected Product */}
            <div className="overflow-x-auto border border-neutral-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                    <th className="py-2.5 px-4">Rank</th>
                    <th className="py-2.5 px-4">Supplier Name</th>
                    <th className="py-2.5 px-4">Brand & Specification</th>
                    <th className="py-2.5 px-4">Supplier Rating</th>
                    <th className="py-2.5 px-4">Payment & Delivery Terms</th>
                    <th className="py-2.5 px-4">Supplier Remarks</th>
                    <th className="py-2.5 px-4 text-right">Quoted Price</th>
                    <th className="py-2.5 px-4 text-right">Diff vs Lowest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {singleProductComparison.list.map((item, idx) => {
                    const isCheapest = idx === 0;
                    const diffFromLowest =
                      item.costPrice - (singleProductComparison.lowest?.costPrice || 0);
                    return (
                      <tr
                        key={item.supplierName}
                        className={isCheapest ? 'bg-emerald-50/40' : 'hover:bg-neutral-50'}
                      >
                        <td className="py-3 px-4 font-mono font-bold">
                          {isCheapest ? '🏆 #1' : `#${idx + 1}`}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-neutral-900">{item.supplierName}</div>
                          <div className="text-[10px] font-mono text-neutral-500">
                            Ref: {item.quotationNo || formatDate(item.dateRecorded)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-neutral-900">{item.brand}</div>
                          <div className="text-[11px] text-neutral-500">{item.specification}</div>
                        </td>
                        <td className="py-3 px-4 text-[#D4AF37] whitespace-nowrap">
                          {'★'.repeat(item.rating)}
                          <span className="text-neutral-300">{'★'.repeat(5 - item.rating)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-neutral-800">{item.paymentTerms}</div>
                          <div className="text-[11px] text-neutral-500">{item.deliveryTerms}</div>
                        </td>
                        <td className="py-3 px-4 text-neutral-600 max-w-xs">{item.remarks}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-sm whitespace-nowrap">
                          <span className={isCheapest ? 'text-emerald-700' : 'text-neutral-900'}>
                            {formatPeso(item.costPrice, db.settings.currencySymbol)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                          {isCheapest ? (
                            <span className="text-emerald-700 font-bold">BEST PRICE</span>
                          ) : (
                            <span className="text-red-600">
                              +{formatPeso(diffFromLowest, db.settings.currencySymbol)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-neutral-500">
            No supplier price records found for this product.
          </div>
        )}
      </div>

      {/* Multi-Product Cross-Supplier Matrix Table (#7 Comparison Table) */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="p-5 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#8B0000]" />
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Multi-Supplier Price Comparison Matrix
              </h3>
              <p className="text-xs text-neutral-500">
                Side-by-side matrix comparing all suppliers and highlighting the lowest price per item
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter matrix products..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-lg"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                <th className="py-3 px-4">Product</th>
                {matrixData.suppliersList.map((supName) => (
                  <th key={supName} className="py-3 px-4 text-right">
                    {supName}
                  </th>
                ))}
                <th className="py-3 px-4 text-right bg-amber-50/70 text-[#8B0000]">
                  🏆 Lowest Price
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs">
              {matrixData.rows.map((row) => (
                <tr
                  key={row.productName}
                  onClick={() => setSelectedProduct(row.productName)}
                  className="hover:bg-neutral-50/90 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-bold text-neutral-900">{row.productName}</td>
                  {matrixData.suppliersList.map((supName) => {
                    const val = row.pricesBySup[supName];
                    const isLowest = val !== undefined && val === row.lowestPrice;
                    return (
                      <td
                        key={supName}
                        className={`py-3.5 px-4 text-right font-mono tabular-nums ${
                          isLowest
                            ? 'font-extrabold text-emerald-700 bg-emerald-50/40'
                            : 'text-neutral-700'
                        }`}
                      >
                        {val !== undefined
                          ? formatPeso(val, db.settings.currencySymbol)
                          : '—'}
                      </td>
                    );
                  })}
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums bg-amber-50/40">
                    {row.lowestPrice !== undefined ? (
                      <div>
                        <div className="font-extrabold text-emerald-700">
                          {formatPeso(row.lowestPrice, db.settings.currencySymbol)}
                        </div>
                        <div className="text-[10px] font-sans text-neutral-500">
                          {row.lowestSupplier}
                        </div>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
