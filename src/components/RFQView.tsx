import React, { useState } from 'react';
import { Plus, Printer, Trash2, Eye, X, FileSpreadsheet } from 'lucide-react';
import { AppDatabase, RFQ, RFQItem } from '../types';
import { formatDate, triggerSystemPrint } from '../utils';
import { SmsiLogo } from './SmsiLogo';

interface RFQViewProps {
  db: AppDatabase;
  onSaveRFQ: (rfq: RFQ) => void;
  onDeleteRFQ: (rfq: RFQ) => void;
}

export const RFQView: React.FC<RFQViewProps> = ({ db, onSaveRFQ, onDeleteRFQ }) => {
  const defaultToday = new Date().toISOString().split('T')[0];
  const defaultReqDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  })();

  const [rfqNo, setRfqNo] = useState(
    `RFQ-2026-${String(db.rfqs.length + 103).slice(-3)}`
  );
  const [supplierId, setSupplierId] = useState(db.suppliers[0]?.id || '');
  const [requestDate, setRequestDate] = useState(defaultToday);
  const [requiredDate, setRequiredDate] = useState(defaultReqDate);
  const [requester, setRequester] = useState(db.settings.userName || 'Purchasing Administrator');
  const [department, setDepartment] = useState('Purchasing & Logistics Department');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState<RFQItem[]>([
    {
      id: `rfqi-${Date.now()}-1`,
      productName: db.products[0]?.name || 'Floor Cleaner 1 Gallon',
      specification:
        db.products[0]?.specification || 'Concentrated Antibacterial Pine Scent (1:40 Dilution)',
      quantity: 50,
      unit: db.products[0]?.unit || 'Gallon',
    },
  ]);

  const [viewingRFQ, setViewingRFQ] = useState<RFQ | null>(null);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `rfqi-${Date.now()}-${prev.length + 1}`,
        productName: '',
        specification: '',
        quantity: 10,
        unit: 'Gallon',
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleProductSelect = (idx: number, prodName: string) => {
    const found = db.products.find((p) => p.name === prodName);
    setItems((prev) => {
      const next = [...prev];
      if (found) {
        next[idx] = {
          ...next[idx],
          productName: found.name,
          specification: found.specification,
          unit: found.unit,
        };
      } else {
        next[idx] = { ...next[idx], productName: prodName };
      }
      return next;
    });
  };

  const handleGenerateRFQ = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = db.suppliers.find((s) => s.id === supplierId);
    const created: RFQ = {
      id: `rfq-${Date.now()}`,
      rfqNo,
      supplierId,
      supplierName: sup?.name || 'Selected Supplier',
      requestDate,
      requiredDate,
      requester,
      department,
      remarks,
      items,
      status: 'Sent',
    };
    onSaveRFQ(created);
    setViewingRFQ(created);
    setRfqNo(`RFQ-2026-${String(db.rfqs.length + 104).slice(-3)}`);
  };

  return (
    <div className="space-y-6">
      {/* Create RFQ Builder Form */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-neutral-200">
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              Create Request for Quotation (RFQ)
            </h2>
            <p className="text-xs text-neutral-500">
              Prepare and print official SOL Cleaning Materials Request for Quotation sheets for suppliers
            </p>
          </div>
        </div>

        <form onSubmit={handleGenerateRFQ} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">RFQ Number *</label>
              <input
                type="text"
                required
                value={rfqNo}
                onChange={(e) => setRfqNo(e.target.value)}
                className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Target Supplier *
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
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
              <label className="block font-semibold text-neutral-700 mb-1">Request Date *</label>
              <input
                type="date"
                required
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Required Date *</label>
              <input
                type="date"
                required
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Requester *</label>
              <input
                type="text"
                required
                value={requester}
                onChange={(e) => setRequester(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Department *</label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block font-semibold text-neutral-700 mb-1">
                Delivery Instructions / Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Specify delivery site, required SDS documents, or credit terms..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
              />
            </div>
          </div>

          {/* Item List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-neutral-900 uppercase">
                Requested Item List
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-neutral-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-100 border-b border-neutral-200 text-[11px] font-semibold text-neutral-600">
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3">Specification</th>
                    <th className="py-2 px-3 w-28 text-right">Quantity</th>
                    <th className="py-2 px-3 w-36">Unit</th>
                    <th className="py-2 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {items.map((it, idx) => (
                    <tr key={it.id}>
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          list="rfq-products-list"
                          value={it.productName}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          placeholder="Type or select product..."
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          value={it.specification}
                          onChange={(e) => {
                            const next = [...items];
                            next[idx] = { ...next[idx], specification: e.target.value };
                            setItems(next);
                          }}
                          placeholder="Technical specification..."
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={it.quantity}
                          onChange={(e) => {
                            const next = [...items];
                            next[idx] = {
                              ...next[idx],
                              quantity: parseInt(e.target.value, 10) || 1,
                            };
                            setItems(next);
                          }}
                          className="w-full px-2.5 py-1.5 font-mono text-right border border-neutral-300 rounded"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          value={it.unit}
                          onChange={(e) => {
                            const next = [...items];
                            next[idx] = { ...next[idx], unit: e.target.value };
                            setItems(next);
                          }}
                          placeholder="Gallon, Pack, Pair"
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-neutral-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="rfq-products-list">
                {db.products.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-neutral-200">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#8B0000] hover:bg-[#6E0000] text-white font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Generate & Preview RFQ</span>
            </button>
          </div>
        </form>
      </div>

      {/* Saved RFQs Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">
            Generated Request for Quotations ({db.rfqs.length})
          </h3>
          <button
            type="button"
            onClick={() => triggerSystemPrint('Request for Quotations (RFQ) Register')}
            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer no-print"
          >
            <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Print RFQ Register</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                <th className="py-3 px-4">RFQ Number</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Request Date</th>
                <th className="py-3 px-4">Required Date</th>
                <th className="py-3 px-4">Requester / Dept</th>
                <th className="py-3 px-4 text-right">Items</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs">
              {db.rfqs.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50">
                  <td className="py-3 px-4 font-mono font-bold text-[#8B0000]">
                    <button
                      onClick={() => setViewingRFQ(r)}
                      className="hover:underline cursor-pointer"
                    >
                      {r.rfqNo}
                    </button>
                    {r.isDemo && (
                      <span className="ml-1.5 text-[10px] font-normal text-neutral-400">
                        · DEMO
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-semibold text-neutral-900">{r.supplierName}</td>
                  <td className="py-3 px-4 font-mono text-neutral-600">
                    {formatDate(r.requestDate)}
                  </td>
                  <td className="py-3 px-4 font-mono text-neutral-600">
                    {formatDate(r.requiredDate)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-neutral-900">{r.requester}</div>
                    <div className="text-[11px] text-neutral-500">{r.department}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold">{r.items.length}</td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => setViewingRFQ(r)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View / Print RFQ</span>
                      </button>
                      <button
                        onClick={() => onDeleteRFQ(r)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable RFQ Document Modal */}
      {viewingRFQ && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-300 rounded-xl max-w-3xl w-full p-6 lg:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-neutral-200 no-print">
              <span className="text-sm font-bold text-neutral-900">
                Official Request for Quotation — {viewingRFQ.rfqNo}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerSystemPrint(`Request for Quotation - ${viewingRFQ.rfqNo}`)}
                  className="px-4 py-1.5 bg-[#8B0000] hover:bg-[#6E0000] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print RFQ</span>
                </button>
                <button
                  onClick={() => setViewingRFQ(null)}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-6 text-xs">
              <div className="border-b-2 border-[#8B0000] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <SmsiLogo className="h-14 w-auto shrink-0" />
                  <div>
                    <div className="text-xs font-bold tracking-widest text-[#8B0000] uppercase">
                      {db.settings.companyName}
                    </div>
                    <h2 className="text-xl font-extrabold text-neutral-900 mt-0.5">
                      REQUEST FOR QUOTATION (RFQ)
                    </h2>
                    <p className="text-neutral-500">{db.settings.companyAddress}</p>
                    <p className="text-[11px] font-extrabold text-[#8B0000] uppercase tracking-wider mt-0.5">
                      Properties of BOSS YSHUA ACOGIDO
                    </p>
                  </div>
                </div>
                <div className="sm:text-right font-mono space-y-1">
                  <div className="text-sm font-bold text-[#8B0000]">RFQ No: {viewingRFQ.rfqNo}</div>
                  <div>Request Date: {formatDate(viewingRFQ.requestDate)}</div>
                  <div>Required Date: {formatDate(viewingRFQ.requiredDate)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                <div className="space-y-1">
                  <div>
                    <span className="text-neutral-500">To Supplier:</span>{' '}
                    <span className="font-bold text-neutral-900">{viewingRFQ.supplierName}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Remarks:</span>{' '}
                    <span>{viewingRFQ.remarks || 'Please submit your best price & lead time.'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div>
                    <span className="text-neutral-500">Requester:</span>{' '}
                    <span className="font-semibold text-neutral-900">{viewingRFQ.requester}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Department:</span>{' '}
                    <span>{viewingRFQ.department}</span>
                  </div>
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-neutral-200">
                <thead>
                  <tr className="bg-neutral-100 border-b border-neutral-200 text-[11px] font-semibold uppercase">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product Description</th>
                    <th className="py-2.5 px-3">Specification</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3 text-right">Supplier Unit Cost (₱)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {viewingRFQ.items.map((it, idx) => (
                    <tr key={it.id}>
                      <td className="py-2.5 px-3 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-neutral-900">
                        {it.productName}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600">{it.specification}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {it.quantity.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">{it.unit}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-400">
                        ₱ ______________
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-8 grid grid-cols-2 gap-8 text-xs">
                <div className="border-t border-neutral-400 pt-2">
                  <div className="font-bold text-neutral-900">{viewingRFQ.requester}</div>
                  <div className="text-neutral-500">Prepared By · {viewingRFQ.department}</div>
                </div>
                <div className="border-t border-neutral-400 pt-2">
                  <div className="font-bold text-neutral-900">Authorized Supplier Representative</div>
                  <div className="text-neutral-500">Signature over Printed Name & Date</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
