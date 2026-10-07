import React, { useMemo, useState } from 'react';
import { Printer, Download, FileSpreadsheet, BarChart3 } from 'lucide-react';
import { AppDatabase } from '../types';
import {
  calculatePriceChange,
  exportToCSV,
  formatDate,
  formatMonthYear,
  formatPeso,
  getQuotationStatus,
  triggerSystemPrint,
} from '../utils';

interface ReportsViewProps {
  db: AppDatabase;
}

type ReportType =
  | 'supplier-comparison'
  | 'product-pricelist'
  | 'quotation-summary'
  | 'expired-quotations'
  | 'expiring-quotations'
  | 'lowest-supplier-prices'
  | 'price-increase'
  | 'price-decrease'
  | 'category-price'
  | 'monthly-quotation'
  | 'inventory-summary'
  | 'low-stock'
  | 'out-of-stock'
  | 'stock-in'
  | 'stock-out'
  | 'stock-adjustment'
  | 'inventory-valuation';

const REPORT_MENU: { id: ReportType; title: string; subtitle: string }[] = [
  {
    id: 'supplier-comparison',
    title: '1. Supplier Price Comparison',
    subtitle: 'Cross-supplier unit costs and lowest bid comparison',
  },
  {
    id: 'product-pricelist',
    title: '2. Product Price List',
    subtitle: 'Complete master catalog with current cost, markup, and selling price',
  },
  {
    id: 'quotation-summary',
    title: '3. Quotation Summary',
    subtitle: 'All supplier quotations with subtotal, VAT, and grand total',
  },
  {
    id: 'expired-quotations',
    title: '4. Expired Quotations',
    subtitle: 'Quotations past their validity date requiring re-quotation',
  },
  {
    id: 'expiring-quotations',
    title: '5. Expiring Quotations',
    subtitle: 'Quotations expiring within 1–7 days',
  },
  {
    id: 'lowest-supplier-prices',
    title: '6. Lowest Supplier Prices',
    subtitle: 'Cheapest verified supplier and cost for every product',
  },
  {
    id: 'price-increase',
    title: '7. Price Increase Report',
    subtitle: 'Items that recorded a cost increase compared to previous quotation',
  },
  {
    id: 'price-decrease',
    title: '8. Price Decrease Report',
    subtitle: 'Items that recorded cost savings / price reduction',
  },
  {
    id: 'category-price',
    title: '9. Category Price Report',
    subtitle: 'Product count, lowest, highest, and average cost per category',
  },
  {
    id: 'monthly-quotation',
    title: '10. Monthly Quotation Report',
    subtitle: 'Monthly breakdown of quotations logged and total procurement value',
  },
  {
    id: 'inventory-summary',
    title: '11. Inventory Summary Report',
    subtitle: 'Complete stock balances, SKU, barcodes, and warehouse locations',
  },
  {
    id: 'low-stock',
    title: '12. Low Stock Report',
    subtitle: 'Products at or below minimum stock threshold requiring replenishment',
  },
  {
    id: 'out-of-stock',
    title: '13. Out of Stock Report',
    subtitle: 'Zero-balance items requiring immediate procurement action',
  },
  {
    id: 'stock-in',
    title: '14. Stock In Report',
    subtitle: 'All receiving transactions with PO, supplier, and cost details',
  },
  {
    id: 'stock-out',
    title: '15. Stock Out Report',
    subtitle: 'All issuance and delivery receipt (DR) deductions by client/site',
  },
  {
    id: 'stock-adjustment',
    title: '16. Stock Adjustment Report',
    subtitle: 'Physical count corrections, damaged/expired write-offs, and approvals',
  },
  {
    id: 'inventory-valuation',
    title: '17. Inventory Valuation Report',
    subtitle: 'Weighted average cost, last purchase cost, and retail valuation',
  },
];

export const ReportsView: React.FC<ReportsViewProps> = ({ db }) => {
  const [activeReport, setActiveReport] = useState<ReportType>('supplier-comparison');

  const currentMeta = REPORT_MENU.find((r) => r.id === activeReport)!;

  // Build tabular dataset for the active report
  const reportRows = useMemo<Record<string, string | number>[]>(() => {
    const sym = db.settings.currencySymbol;

    switch (activeReport) {
      case 'supplier-comparison': {
        const prodSet = Array.from(new Set(db.priceHistory.map((p) => p.productName)));
        return prodSet.map((prodName) => {
          const recs = db.priceHistory.filter(
            (r) => r.productName.toLowerCase() === prodName.toLowerCase()
          );
          const sorted = [...recs].sort((a, b) => a.costPrice - b.costPrice);
          const lowest = sorted[0];
          const highest = sorted[sorted.length - 1];
          const avg = recs.reduce((s, x) => s + x.costPrice, 0) / (recs.length || 1);
          return {
            Product: prodName,
            Suppliers_Quoted: new Set(recs.map((x) => x.supplierName)).size,
            Lowest_Supplier: lowest ? `🏆 ${lowest.supplierName}` : '—',
            Lowest_Price: lowest ? formatPeso(lowest.costPrice, sym) : '—',
            Highest_Price: highest ? formatPeso(highest.costPrice, sym) : '—',
            Average_Price: formatPeso(avg, sym),
            Max_Savings:
              lowest && highest ? formatPeso(highest.costPrice - lowest.costPrice, sym) : '—',
          };
        });
      }

      case 'product-pricelist': {
        return db.products.map((p) => ({
          Code: p.code,
          Product_Name: p.name,
          Category: p.category,
          Brand: p.brand,
          Specification: p.specification,
          Supplier: p.supplierName,
          Current_Cost: formatPeso(p.currentCost, sym),
          Markup: `${p.markupPercent}%`,
          Selling_Price: formatPeso(p.sellingPrice, sym),
          Stock: `${p.stock} ${p.unit}`,
        }));
      }

      case 'quotation-summary': {
        return db.quotations.map((q) => ({
          Quotation_No: q.quotationNo,
          Supplier: q.supplierName,
          Quotation_Date: formatDate(q.quotationDate),
          Valid_Until: formatDate(q.validUntil),
          Items: q.items.length,
          Subtotal: formatPeso(q.subtotal, sym),
          VAT: formatPeso(q.vatAmount, sym),
          Grand_Total: formatPeso(q.grandTotal, sym),
          Status: getQuotationStatus(q.validUntil).label,
        }));
      }

      case 'expired-quotations': {
        return db.quotations
          .filter((q) => getQuotationStatus(q.validUntil).status === 'Expired')
          .map((q) => ({
            Quotation_No: q.quotationNo,
            Supplier: q.supplierName,
            Contact: q.contactPerson,
            Quotation_Date: formatDate(q.quotationDate),
            Expired_On: formatDate(q.validUntil),
            Grand_Total: formatPeso(q.grandTotal, sym),
            Status: getQuotationStatus(q.validUntil).label,
          }));
      }

      case 'expiring-quotations': {
        return db.quotations
          .filter((q) => getQuotationStatus(q.validUntil).status === 'Expiring Soon')
          .map((q) => ({
            Quotation_No: q.quotationNo,
            Supplier: q.supplierName,
            Contact: q.contactPerson,
            Valid_Until: formatDate(q.validUntil),
            Items: q.items.length,
            Grand_Total: formatPeso(q.grandTotal, sym),
            Alert_Status: getQuotationStatus(q.validUntil).label,
          }));
      }

      case 'lowest-supplier-prices': {
        const prodSet = Array.from(new Set(db.priceHistory.map((p) => p.productName)));
        return prodSet.map((prodName) => {
          const recs = db.priceHistory
            .filter((r) => r.productName.toLowerCase() === prodName.toLowerCase())
            .sort((a, b) => a.costPrice - b.costPrice);
          const best = recs[0];
          return {
            Product: prodName,
            Category: best?.category || '',
            Brand: best?.brand || '',
            Best_Supplier: best ? `🏆 ${best.supplierName}` : '',
            Lowest_Cost: best ? formatPeso(best.costPrice, sym) : '',
            Suggested_Selling: best ? formatPeso(best.sellingPrice, sym) : '',
            Quotation_Ref: best?.quotationNo || 'Direct',
            Date_Recorded: best ? formatDate(best.dateRecorded) : '',
          };
        });
      }

      case 'price-increase': {
        return db.priceHistory
          .filter((r) => calculatePriceChange(r.previousPrice, r.costPrice).direction === 'increase')
          .map((r) => {
            const ch = calculatePriceChange(r.previousPrice, r.costPrice);
            return {
              Date: formatDate(r.dateRecorded),
              Product: r.productName,
              Supplier: r.supplierName,
              Old_Price: r.previousPrice ? formatPeso(r.previousPrice, sym) : '—',
              New_Price: formatPeso(r.costPrice, sym),
              Increase_Amount: `+${formatPeso(ch.diff, sym)}`,
              Percentage_Change: `+${ch.percent.toFixed(2)}%`,
              Quotation_Ref: r.quotationNo || 'Direct',
            };
          });
      }

      case 'price-decrease': {
        return db.priceHistory
          .filter((r) => calculatePriceChange(r.previousPrice, r.costPrice).direction === 'decrease')
          .map((r) => {
            const ch = calculatePriceChange(r.previousPrice, r.costPrice);
            return {
              Date: formatDate(r.dateRecorded),
              Product: r.productName,
              Supplier: r.supplierName,
              Old_Price: r.previousPrice ? formatPeso(r.previousPrice, sym) : '—',
              New_Price: formatPeso(r.costPrice, sym),
              Savings_Amount: `-${formatPeso(Math.abs(ch.diff), sym)}`,
              Percentage_Change: `${ch.percent.toFixed(2)}%`,
              Quotation_Ref: r.quotationNo || 'Direct',
            };
          });
      }

      case 'category-price': {
        return db.categories.map((cat) => {
          const prods = db.products.filter((p) => p.category === cat.name);
          const costs = prods.map((p) => p.currentCost);
          const minC = costs.length ? Math.min(...costs) : 0;
          const maxC = costs.length ? Math.max(...costs) : 0;
          const avgC = costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;
          return {
            Category: cat.name,
            Subcategories_Count: cat.subcategories.length,
            Registered_Products: prods.length,
            Lowest_Item_Cost: formatPeso(minC, sym),
            Highest_Item_Cost: formatPeso(maxC, sym),
            Average_Category_Cost: formatPeso(avgC, sym),
          };
        });
      }

      case 'monthly-quotation': {
        const byMonth = new Map<
          string,
          { monthLabel: string; count: number; itemsCount: number; totalAmount: number }
        >();
        db.quotations.forEach((q) => {
          const key = q.quotationDate.slice(0, 7); // YYYY-MM
          const cur = byMonth.get(key) || {
            monthLabel: formatMonthYear(q.quotationDate),
            count: 0,
            itemsCount: 0,
            totalAmount: 0,
          };
          cur.count += 1;
          cur.itemsCount += q.items.length;
          cur.totalAmount += q.grandTotal;
          byMonth.set(key, cur);
        });
        return Array.from(byMonth.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([, val]) => ({
            Month: val.monthLabel,
            Quotations_Received: val.count,
            Total_Quoted_Line_Items: val.itemsCount,
            Total_Quotation_Value: formatPeso(val.totalAmount, sym),
          }));
      }

      case 'inventory-summary': {
        return db.products.map((p) => ({
          SKU: p.sku || p.code,
          Barcode: p.barcode || '',
          Product_Name: p.name,
          Category: p.category,
          Current_Stock: p.stock,
          Unit: p.unit,
          Min_Stock: p.minStock,
          Warehouse_Location: p.location || 'Main Warehouse',
          Status:
            p.stock <= 0 ? '🔴 OUT OF STOCK' : p.stock <= p.minStock ? '🟡 LOW STOCK' : '🟢 IN STOCK',
        }));
      }

      case 'low-stock': {
        return db.products
          .filter((p) => p.stock > 0 && p.stock <= p.minStock)
          .map((p) => ({
            SKU: p.sku || p.code,
            Product_Name: p.name,
            Current_Stock: `${p.stock} ${p.unit}`,
            Minimum_Threshold: `${p.minStock} ${p.unit}`,
            Preferred_Supplier: p.supplierName,
            Unit_Cost: formatPeso(p.currentCost, sym),
            Status: '🟡 LOW STOCK',
          }));
      }

      case 'out-of-stock': {
        return db.products
          .filter((p) => p.stock <= 0)
          .map((p) => ({
            SKU: p.sku || p.code,
            Product_Name: p.name,
            Current_Stock: `0 ${p.unit}`,
            Minimum_Threshold: `${p.minStock} ${p.unit}`,
            Preferred_Supplier: p.supplierName,
            Unit_Cost: formatPeso(p.currentCost, sym),
            Status: '🔴 OUT OF STOCK',
          }));
      }

      case 'stock-in': {
        return db.stockTransactions
          .filter((t) => t.type === 'IN')
          .map((t) => ({
            Ref_No: t.transactionNo,
            Date: formatDate(t.date),
            Product: t.productName,
            SKU: t.sku,
            Supplier: t.supplierName || '—',
            PO_Number: t.poNumber || '—',
            Prev_Stock: t.previousStock,
            Stock_In: `+${t.quantity} ${t.unit}`,
            New_Stock: t.newStock,
            Total_Cost: formatPeso(t.totalCost, sym),
            Received_By: t.receivedBy || '—',
          }));
      }

      case 'stock-out': {
        return db.stockTransactions
          .filter((t) => t.type === 'OUT')
          .map((t) => ({
            DR_No: t.transactionNo,
            Date: formatDate(t.date),
            Product: t.productName,
            SKU: t.sku,
            Released_To: t.releasedTo || '—',
            Client_or_Site: t.clientOrDept || '—',
            Prev_Stock: t.previousStock,
            Stock_Out: `-${t.quantity} ${t.unit}`,
            New_Stock: t.newStock,
            Approved_By: t.approvedBy || '—',
          }));
      }

      case 'stock-adjustment': {
        return db.stockAdjustments.map((adj) => ({
          Adjustment_No: adj.adjustmentNo,
          Date: formatDate(adj.date),
          Product: adj.productName,
          SKU: adj.sku,
          System_Stock: adj.systemStock,
          Actual_Count: adj.actualStock,
          Difference: adj.difference > 0 ? `+${adj.difference}` : String(adj.difference),
          Reason: adj.reason,
          Requested_By: adj.requestedBy,
          Approved_By: adj.approvedBy,
          Status: adj.status,
        }));
      }

      case 'inventory-valuation': {
        return db.products.map((p) => {
          const avgCost = p.averageCost || p.currentCost;
          return {
            SKU: p.sku || p.code,
            Product: p.name,
            Stock: `${p.stock} ${p.unit}`,
            Last_Purchase_Cost: formatPeso(p.currentCost, sym),
            Weighted_Avg_Cost: formatPeso(avgCost, sym),
            Standard_Cost: formatPeso(p.standardCost || p.currentCost, sym),
            Total_Inventory_Cost: formatPeso(p.stock * avgCost, sym),
            Estimated_Retail_Value: formatPeso(p.stock * p.sellingPrice, sym),
          };
        });
      }
    }
  }, [activeReport, db]);

  const columns = reportRows.length > 0 ? Object.keys(reportRows[0]) : [];

  return (
    <div className="space-y-6">
      {/* Top 10 Report Selector Grid */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 no-print">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-[#8B0000]" />
          <h2 className="text-sm font-bold text-neutral-900">
            Select Executive Procurement & Inventory Report (17 Standard Reports)
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {REPORT_MENU.map((rep) => {
            const isSelected = rep.id === activeReport;
            return (
              <button
                key={rep.id}
                onClick={() => setActiveReport(rep.id)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#8B0000] text-white border-[#8B0000] shadow-sm'
                    : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                }`}
              >
                <div className="text-xs font-bold leading-snug">{rep.title}</div>
                <div
                  className={`text-[10px] mt-1 line-clamp-2 ${
                    isSelected ? 'text-[#F3E5AB]' : 'text-neutral-500'
                  }`}
                >
                  {rep.subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Action Header & Printable Report Sheet */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="p-5 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold tracking-widest text-[#8B0000] uppercase">
              {db.settings.companyName}
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mt-0.5">{currentMeta.title}</h3>
            <p className="text-xs text-neutral-500">{currentMeta.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 no-print">
            <button
              onClick={() => triggerSystemPrint(currentMeta.title)}
              className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>PRINT</span>
            </button>
            <button
              onClick={() => exportToCSV(`SOL_${activeReport}_Report.csv`, reportRows)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>EXPORT EXCEL (CSV)</span>
            </button>
            <button
              onClick={() => triggerSystemPrint(`${currentMeta.title} (PDF)`)}
              className="px-3.5 py-2 bg-[#8B0000] hover:bg-[#6E0000] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT PDF</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {reportRows.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-600 uppercase">
                  {columns.map((col) => (
                    <th key={col} className="py-3 px-4">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs">
                {reportRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-neutral-50/90">
                    {columns.map((col) => {
                      const val = String(row[col] ?? '');
                      const isNumeric = val.startsWith('₱') || val.startsWith('+₱') || val.startsWith('-₱') || val.endsWith('%');
                      return (
                        <td
                          key={col}
                          className={`py-3 px-4 ${
                            isNumeric ? 'font-mono font-semibold text-neutral-900' : 'text-neutral-800'
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-xs text-neutral-500">
              No records found for this report filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
