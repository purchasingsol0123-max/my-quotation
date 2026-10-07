import React, { useMemo } from 'react';
import { X, Search, Award, FileText } from 'lucide-react';
import { AppDatabase, Quotation } from '../types';
import { formatDate, formatPeso, getQuotationStatus } from '../utils';

interface GlobalSearchModalProps {
  query: string;
  db: AppDatabase;
  onClose: () => void;
  onViewQuotation: (quotation: Quotation) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  query,
  db,
  onClose,
  onViewQuotation,
}) => {
  // Compute comprehensive product-supplier price results matching query
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    // Filter price history records matching product name, supplier, brand, quotation number, category, or specification
    const matchingRecords = db.priceHistory.filter(
      (rec) =>
        rec.productName.toLowerCase().includes(q) ||
        rec.supplierName.toLowerCase().includes(q) ||
        rec.brand.toLowerCase().includes(q) ||
        (rec.quotationNo || '').toLowerCase().includes(q) ||
        rec.category.toLowerCase().includes(q) ||
        rec.specification.toLowerCase().includes(q)
    );

    // Group by Product + Supplier to show Latest Price, Previous Price, Lowest Price across all suppliers, Quotation No, Date, Validity
    const grouped = new Map<
      string,
      {
        productName: string;
        category: string;
        brand: string;
        specification: string;
        supplierName: string;
        latestPrice: number;
        previousPrice?: number;
        lowestPriceForProduct: number;
        quotationNo: string;
        quotationDate: string;
        validUntil: string;
        quotationObj?: Quotation;
      }
    >();

    matchingRecords
      .sort((a, b) => b.dateRecorded.localeCompare(a.dateRecorded))
      .forEach((rec) => {
        const key = `${rec.productName.toLowerCase()}__${rec.supplierName.toLowerCase()}`;
        if (!grouped.has(key)) {
          // Find lowest price for this product across ALL suppliers
          const allForProd = db.priceHistory.filter(
            (p) => p.productName.toLowerCase() === rec.productName.toLowerCase()
          );
          const lowestPriceForProduct = Math.min(...allForProd.map((x) => x.costPrice));
          const linkedQuote = db.quotations.find(
            (qt) => qt.id === rec.quotationId || qt.quotationNo === rec.quotationNo
          );

          grouped.set(key, {
            productName: rec.productName,
            category: rec.category,
            brand: rec.brand,
            specification: rec.specification,
            supplierName: rec.supplierName,
            latestPrice: rec.costPrice,
            previousPrice: rec.previousPrice,
            lowestPriceForProduct,
            quotationNo: rec.quotationNo || linkedQuote?.quotationNo || 'Direct Record',
            quotationDate: rec.dateRecorded,
            validUntil: rec.validUntil || linkedQuote?.validUntil || '',
            quotationObj: linkedQuote,
          });
        }
      });

    return Array.from(grouped.values()).sort((a, b) => a.latestPrice - b.latestPrice);
  }, [query, db]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 pt-16 overflow-y-auto">
      <div className="bg-white border border-neutral-300 rounded-xl max-w-5xl w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200">
          <div className="flex items-center gap-2.5">
            <Search className="w-5 h-5 text-[#8B0000]" />
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Global Search Results for "{query}" ({searchResults.length} Matches)
              </h3>
              <p className="text-xs text-neutral-500">
                Displays Product, Supplier, Latest Price, Previous Price, Lowest Market Price, Quotation Number, Date, and Validity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-x-auto max-h-[68vh]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                <th className="py-3 px-3">Product</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-3 text-right">Latest Price</th>
                <th className="py-3 px-3 text-right">Previous Price</th>
                <th className="py-3 px-3 text-right">Lowest Price</th>
                <th className="py-3 px-3">Quotation Number</th>
                <th className="py-3 px-3">Quotation Date</th>
                <th className="py-3 px-3">Quotation Validity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs">
              {searchResults.map((res, idx) => {
                const isLowest = res.latestPrice === res.lowestPriceForProduct;
                const validity = res.validUntil ? getQuotationStatus(res.validUntil) : null;
                return (
                  <tr
                    key={idx}
                    className={`hover:bg-neutral-50 ${isLowest ? 'bg-emerald-50/30' : ''}`}
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold text-neutral-900">{res.productName}</div>
                      <div className="text-[11px] text-neutral-500">
                        {res.brand} · {res.specification}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-neutral-900">
                      {res.supplierName}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-neutral-900">
                      {formatPeso(res.latestPrice, db.settings.currencySymbol)}
                      {isLowest && (
                        <div className="text-[10px] text-emerald-700 font-bold">🏆 LOWEST</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-neutral-500">
                      {res.previousPrice !== undefined
                        ? formatPeso(res.previousPrice, db.settings.currencySymbol)
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatPeso(res.lowestPriceForProduct, db.settings.currencySymbol)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#8B0000]">
                      {res.quotationObj ? (
                        <button
                          onClick={() => {
                            onClose();
                            onViewQuotation(res.quotationObj!);
                          }}
                          className="hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{res.quotationNo}</span>
                        </button>
                      ) : (
                        res.quotationNo
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-600">
                      {formatDate(res.quotationDate)}
                    </td>
                    <td className="py-3 px-3">
                      {validity ? (
                        <div>
                          <div className="font-semibold text-[11px]">{validity.label}</div>
                          <div className="text-[10px] font-mono text-neutral-400">
                            Until {formatDate(res.validUntil)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-neutral-400">Standard</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {searchResults.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-neutral-500">
                    No matching products, suppliers, brands, or quotations found for "{query}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
