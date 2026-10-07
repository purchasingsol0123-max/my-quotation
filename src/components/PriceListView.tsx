import React, { useMemo, useState } from 'react';
import { Search, Download, Plus, Award, ArrowUpDown, X, Printer } from 'lucide-react';
import { AppDatabase, PriceRecord } from '../types';
import {
  calculatePriceChange,
  exportToCSV,
  formatDate,
  formatPeso,
  getQuotationStatus,
  triggerSystemPrint,
} from '../utils';

interface PriceListViewProps {
  db: AppDatabase;
  onAddPriceRecord: (record: PriceRecord) => void;
}

export const PriceListView: React.FC<PriceListViewProps> = ({ db, onAddPriceRecord }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortMode, setSortMode] = useState<
    'latest' | 'oldest' | 'lowest' | 'highest'
  >('latest');
  const [onlyLowestBenchmark, setOnlyLowestBenchmark] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Compute lowest price per product name across the entire priceHistory
  const lowestPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    db.priceHistory.forEach((rec) => {
      const key = rec.productName.trim().toLowerCase();
      const cur = map.get(key);
      if (cur === undefined || rec.costPrice < cur) {
        map.set(key, rec.costPrice);
      }
    });
    return map;
  }, [db.priceHistory]);

  const filteredRecords = useMemo(() => {
    const min = minPrice !== '' ? parseFloat(minPrice) : null;
    const max = maxPrice !== '' ? parseFloat(maxPrice) : null;

    return db.priceHistory
      .filter((rec) => {
        if (categoryFilter !== 'ALL' && rec.category !== categoryFilter) return false;
        if (supplierFilter !== 'ALL' && rec.supplierId !== supplierFilter) return false;
        if (min !== null && !isNaN(min) && rec.costPrice < min) return false;
        if (max !== null && !isNaN(max) && rec.costPrice > max) return false;

        if (onlyLowestBenchmark) {
          const minForProd = lowestPriceMap.get(rec.productName.trim().toLowerCase());
          if (rec.costPrice !== minForProd) return false;
        }

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          rec.productName.toLowerCase().includes(q) ||
          rec.brand.toLowerCase().includes(q) ||
          rec.supplierName.toLowerCase().includes(q) ||
          rec.category.toLowerCase().includes(q) ||
          rec.specification.toLowerCase().includes(q) ||
          (rec.quotationNo || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortMode === 'lowest') return a.costPrice - b.costPrice;
        if (sortMode === 'highest') return b.costPrice - a.costPrice;
        if (sortMode === 'oldest') return a.dateRecorded.localeCompare(b.dateRecorded);
        return b.dateRecorded.localeCompare(a.dateRecorded);
      });
  }, [
    db.priceHistory,
    categoryFilter,
    supplierFilter,
    minPrice,
    maxPrice,
    onlyLowestBenchmark,
    searchQuery,
    sortMode,
    lowestPriceMap,
  ]);

  // New Price Record Form State
  const [newRec, setNewRec] = useState({
    productId: db.products[0]?.id || '',
    productName: db.products[0]?.name || 'Floor Cleaner 1 Gallon',
    category: db.products[0]?.category || 'CLEANING CHEMICALS',
    brand: db.products[0]?.brand || 'SolClean Pro',
    specification: db.products[0]?.specification || '',
    size: db.products[0]?.size || '1 Gallon',
    unit: db.products[0]?.unit || 'Gallon',
    supplierId: db.suppliers[0]?.id || '',
    supplierName: db.suppliers[0]?.name || '',
    costPrice: 295,
    markupPercent: db.settings.defaultMarkupPercent || 30,
    quotationNo: '',
    dateRecorded: new Date().toISOString().split('T')[0],
    validUntil: '',
    remarks: '',
  });

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    // Find previous price from same supplier & product
    const prevRecs = db.priceHistory
      .filter(
        (r) =>
          r.productName.toLowerCase() === newRec.productName.toLowerCase() &&
          r.supplierName.toLowerCase() === newRec.supplierName.toLowerCase()
      )
      .sort((a, b) => b.dateRecorded.localeCompare(a.dateRecorded));

    const previousPrice = prevRecs[0]?.costPrice;
    const sellingPrice = Number(
      (newRec.costPrice * (1 + newRec.markupPercent / 100)).toFixed(2)
    );

    onAddPriceRecord({
      id: `ph-${Date.now()}`,
      productId: newRec.productId || `prod-${Date.now()}`,
      productName: newRec.productName,
      category: newRec.category,
      brand: newRec.brand,
      specification: newRec.specification,
      size: newRec.size,
      unit: newRec.unit,
      supplierId: newRec.supplierId,
      supplierName: newRec.supplierName,
      costPrice: newRec.costPrice,
      previousPrice,
      markupPercent: newRec.markupPercent,
      sellingPrice,
      quotationNo: newRec.quotationNo || 'Direct Price Entry',
      dateRecorded: newRec.dateRecorded,
      validUntil: newRec.validUntil || undefined,
      remarks: newRec.remarks,
    });
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Multi-Criteria Search & Filter Panel */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Product, Brand, Supplier, Category, or Specification..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setOnlyLowestBenchmark(!onlyLowestBenchmark)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                onlyLowestBenchmark
                  ? 'bg-[#D4AF37] text-neutral-900 border-[#D4AF37]'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-300 hover:bg-neutral-100'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>🏆 Lowest Price Only</span>
            </button>

            <button
              onClick={() => {
                const rows = filteredRecords.map((r) => ({
                  Product: r.productName,
                  Category: r.category,
                  Brand: r.brand,
                  Specification: r.specification,
                  Supplier: r.supplierName,
                  Cost_Price_PHP: r.costPrice,
                  Markup_Percent: r.markupPercent,
                  Selling_Price_PHP: r.sellingPrice,
                  Date_Recorded: r.dateRecorded,
                  Quotation_Ref: r.quotationNo || '',
                }));
                exportToCSV('SOL_Master_Price_List.csv', rows);
              }}
              className="px-3.5 py-2 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => triggerSystemPrint('Master Supplier Price List')}
              className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Print Price List</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-[#8B0000] hover:bg-[#6E0000] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Supplier Price</span>
            </button>
          </div>
        </div>

        {/* Second Row: Category, Supplier, Price Range, and Sort Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-neutral-100 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
              Filter by Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg"
            >
              <option value="ALL">All Categories</option>
              {db.categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
              Filter by Supplier
            </label>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg"
            >
              <option value="ALL">All Suppliers</option>
              {db.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
              Min Cost Price (₱)
            </label>
            <input
              type="number"
              min="0"
              placeholder="₱0.00"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full px-3 py-1.5 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
              Max Cost Price (₱)
            </label>
            <input
              type="number"
              min="0"
              placeholder="No limit"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full px-3 py-1.5 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
              Sort Order
            </label>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg">
              <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
                className="w-full bg-transparent focus:outline-none font-semibold text-neutral-800"
              >
                <option value="latest">Latest Price First</option>
                <option value="oldest">Oldest Price First</option>
                <option value="lowest">Lowest Price First</option>
                <option value="highest">Highest Price First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Master Price List Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              Master Supplier Price List ({filteredRecords.length} Records)
            </h3>
            <p className="text-xs text-neutral-500">
              Historical and current supplier prices with automatic markup and validity tracking
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-semibold text-neutral-500 uppercase">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-3">Brand</th>
                <th className="py-3 px-3">Specification</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-3 text-right">Cost Price</th>
                <th className="py-3 px-3 text-right">Markup</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs">
              {filteredRecords.map((rec) => {
                const lowestVal = lowestPriceMap.get(rec.productName.trim().toLowerCase());
                const isLowest = lowestVal !== undefined && rec.costPrice === lowestVal;
                const priceDiff = calculatePriceChange(rec.previousPrice, rec.costPrice);
                const validity = rec.validUntil
                  ? getQuotationStatus(rec.validUntil)
                  : { status: 'Active' as const, label: '🟢 ACTIVE' };

                return (
                  <tr
                    key={rec.id}
                    className={`hover:bg-neutral-50/90 transition-colors ${
                      isLowest ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                        <span>{rec.productName}</span>
                        {isLowest && (
                          <span
                            className="text-[11px] font-bold text-emerald-700"
                            title="Lowest price across all suppliers"
                          >
                            🏆 LOWEST
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {rec.category} · {rec.size} ({rec.unit})
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-medium text-neutral-800">{rec.brand}</td>
                    <td className="py-3.5 px-3 text-neutral-600 max-w-xs">{rec.specification}</td>
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-neutral-900">{rec.supplierName}</div>
                      {rec.quotationNo && (
                        <div className="text-[11px] font-mono text-[#8B0000]">
                          Ref: {rec.quotationNo}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono whitespace-nowrap">
                      <div
                        className={`font-bold text-sm ${
                          isLowest ? 'text-emerald-700' : 'text-neutral-900'
                        }`}
                      >
                        {formatPeso(rec.costPrice, db.settings.currencySymbol)}
                      </div>
                      {rec.previousPrice !== undefined && (
                        <div
                          className={`text-[10px] ${
                            priceDiff.direction === 'increase'
                              ? 'text-red-600'
                              : priceDiff.direction === 'decrease'
                              ? 'text-emerald-600'
                              : 'text-neutral-400'
                          }`}
                        >
                          Prev: {formatPeso(rec.previousPrice, db.settings.currencySymbol)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-neutral-600">
                      {rec.markupPercent}%
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-[#8B0000] whitespace-nowrap">
                      {formatPeso(rec.sellingPrice, db.settings.currencySymbol)}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-neutral-600 whitespace-nowrap">
                      {formatDate(rec.dateRecorded)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-[11px]">{validity.label}</div>
                    </td>
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-xs text-neutral-500">
                    No price records match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log New Supplier Price Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-300 rounded-xl max-w-xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-200">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Log New Supplier Price Record
                </h3>
                <p className="text-xs text-neutral-500">
                  Previous supplier prices are preserved automatically for historical auditing.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-500 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Select Master Product (or customize below)
                  </label>
                  <select
                    value={newRec.productId}
                    onChange={(e) => {
                      const prod = db.products.find((p) => p.id === e.target.value);
                      if (prod) {
                        setNewRec({
                          ...newRec,
                          productId: prod.id,
                          productName: prod.name,
                          category: prod.category,
                          brand: prod.brand,
                          specification: prod.specification,
                          size: prod.size,
                          unit: prod.unit,
                          costPrice: prod.currentCost,
                          markupPercent: prod.markupPercent,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 bg-amber-50/70 border border-[#D4AF37]/50 rounded-lg"
                  >
                    {db.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.brand})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRec.productName}
                    onChange={(e) => setNewRec({ ...newRec, productName: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Supplier *</label>
                  <select
                    value={newRec.supplierId}
                    onChange={(e) => {
                      const sup = db.suppliers.find((s) => s.id === e.target.value);
                      if (sup) {
                        setNewRec({
                          ...newRec,
                          supplierId: sup.id,
                          supplierName: sup.name,
                        });
                      }
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
                  <label className="block font-semibold text-neutral-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={newRec.brand}
                    onChange={(e) => setNewRec({ ...newRec, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Specification
                  </label>
                  <input
                    type="text"
                    value={newRec.specification}
                    onChange={(e) => setNewRec({ ...newRec, specification: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-900 mb-1">
                    New Cost Price (₱) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newRec.costPrice}
                    onChange={(e) =>
                      setNewRec({ ...newRec, costPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 font-mono font-bold bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Markup %</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newRec.markupPercent}
                    onChange={(e) =>
                      setNewRec({ ...newRec, markupPercent: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Date Recorded *
                  </label>
                  <input
                    type="date"
                    required
                    value={newRec.dateRecorded}
                    onChange={(e) => setNewRec({ ...newRec, dateRecorded: e.target.value })}
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Valid Until (Optional)
                  </label>
                  <input
                    type="date"
                    value={newRec.validUntil}
                    onChange={(e) => setNewRec({ ...newRec, validUntil: e.target.value })}
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-neutral-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#8B0000] text-white rounded-lg font-semibold"
                >
                  Save Price Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
