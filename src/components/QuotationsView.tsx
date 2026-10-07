import React, { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Download,
  Printer,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Paperclip,
  X,
  FileText,
  ArrowUpDown,
} from 'lucide-react';
import {
  AppDatabase,
  Quotation,
  QuotationAttachment,
  QuotationItem,
} from '../types';
import {
  exportToCSV,
  formatDate,
  formatPeso,
  getQuotationStatus,
  triggerSystemPrint,
} from '../utils';
import { SmsiLogo } from './SmsiLogo';

interface QuotationsViewProps {
  db: AppDatabase;
  onSaveQuotation: (quotation: Quotation, isEdit: boolean) => void;
  onDeleteQuotation: (quotation: Quotation) => void;
  onDuplicateQuotation: (quotation: Quotation) => void;
  initialOpenModal?: boolean;
  editingQuotation?: Quotation | null;
  viewingQuotation?: Quotation | null;
  onClearModalState: () => void;
}

export const QuotationsView: React.FC<QuotationsViewProps> = ({
  db,
  onSaveQuotation,
  onDeleteQuotation,
  onDuplicateQuotation,
  initialOpenModal,
  editingQuotation,
  viewingQuotation,
  onClearModalState,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Expiring Soon' | 'Expired'>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'total-desc' | 'total-asc'>('date-desc');

  const [isFormOpen, setIsFormOpen] = useState(Boolean(initialOpenModal || editingQuotation));
  const [activeDocView, setActiveDocView] = useState<Quotation | null>(viewingQuotation || null);

  // Sync external triggers
  React.useEffect(() => {
    if (initialOpenModal || editingQuotation) {
      setIsFormOpen(true);
    }
  }, [initialOpenModal, editingQuotation]);

  React.useEffect(() => {
    if (viewingQuotation) {
      setActiveDocView(viewingQuotation);
    }
  }, [viewingQuotation]);

  // Form State
  const defaultToday = new Date().toISOString().split('T')[0];
  const defaultValidDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + (db.settings.defaultValidityDays || 30));
    return d.toISOString().split('T')[0];
  }, [db.settings.defaultValidityDays]);

  const [formState, setFormState] = useState<{
    id: string;
    quotationNo: string;
    supplierId: string;
    supplierName: string;
    contactPerson: string;
    contactNumber: string;
    email: string;
    quotationDate: string;
    validUntil: string;
    deliveryTerms: string;
    paymentTerms: string;
    vatStatus: 'VAT Inclusive' | 'VAT Exclusive' | 'Non-VAT';
    remarks: string;
    attachments: QuotationAttachment[];
    items: QuotationItem[];
  }>(() => getInitialFormState(editingQuotation));

  function getInitialFormState(editTarget?: Quotation | null) {
    if (editTarget) {
      return {
        id: editTarget.id,
        quotationNo: editTarget.quotationNo,
        supplierId: editTarget.supplierId,
        supplierName: editTarget.supplierName,
        contactPerson: editTarget.contactPerson,
        contactNumber: editTarget.contactNumber,
        email: editTarget.email,
        quotationDate: editTarget.quotationDate,
        validUntil: editTarget.validUntil,
        deliveryTerms: editTarget.deliveryTerms,
        paymentTerms: editTarget.paymentTerms,
        vatStatus: editTarget.vatStatus,
        remarks: editTarget.remarks,
        attachments: editTarget.attachments || [],
        items: editTarget.items.map((it) => ({ ...it })),
      };
    }
    const nextNum = `QT-2026-${String(db.quotations.length + 1001).slice(-4)}`;
    const firstSup = db.suppliers[0];
    return {
      id: `quot-${Date.now()}`,
      quotationNo: nextNum,
      supplierId: firstSup?.id || '',
      supplierName: firstSup?.name || '',
      contactPerson: firstSup?.contactPerson || '',
      contactNumber: firstSup?.contactNumber || '',
      email: firstSup?.email || '',
      quotationDate: defaultToday,
      validUntil: defaultValidDate,
      deliveryTerms: firstSup?.deliveryTerms || '3–5 Working Days',
      paymentTerms: firstSup?.paymentTerms || '30 Days Net',
      vatStatus: 'VAT Exclusive' as const,
      remarks: '',
      attachments: [],
      items: [
        {
          id: `qi-${Date.now()}-1`,
          productId: db.products[0]?.id || '',
          itemName: db.products[0]?.name || 'Floor Cleaner 1 Gallon',
          category: db.products[0]?.category || 'CLEANING CHEMICALS',
          brand: db.products[0]?.brand || 'SolClean Pro',
          specification: db.products[0]?.specification || 'Concentrated Antibacterial Formula',
          size: db.products[0]?.size || '1 Gallon',
          unit: db.products[0]?.unit || 'Gallon',
          quantity: 10,
          unitCost: db.products[0]?.currentCost || 295,
          vatRate: db.settings.defaultVatPercent || 12,
          totalCost: 10 * (db.products[0]?.currentCost || 295),
          remarks: '',
        },
      ],
    };
  }

  React.useEffect(() => {
    if (editingQuotation) {
      setFormState(getInitialFormState(editingQuotation));
    } else if (initialOpenModal) {
      setFormState(getInitialFormState(null));
    }
  }, [editingQuotation, initialOpenModal]);

  const handleOpenNewForm = () => {
    onClearModalState();
    setFormState(getInitialFormState(null));
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (q: Quotation) => {
    setActiveDocView(null);
    setFormState(getInitialFormState(q));
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    onClearModalState();
  };

  const handleSupplierSelect = (supId: string) => {
    const found = db.suppliers.find((s) => s.id === supId);
    if (found) {
      setFormState((prev) => ({
        ...prev,
        supplierId: found.id,
        supplierName: found.name,
        contactPerson: found.contactPerson,
        contactNumber: found.contactNumber,
        email: found.email,
        deliveryTerms: found.deliveryTerms,
        paymentTerms: found.paymentTerms,
        vatStatus: found.vatStatus === 'Non-VAT' ? 'Non-VAT' : prev.vatStatus,
      }));
    } else {
      setFormState((prev) => ({ ...prev, supplierId: '', supplierName: supId }));
    }
  };

  const handleAddItemRow = () => {
    setFormState((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `qi-${Date.now()}-${prev.items.length + 1}`,
          productId: '',
          itemName: '',
          category: db.categories[0]?.name || 'CLEANING CHEMICALS',
          brand: '',
          specification: '',
          size: '1 Gallon',
          unit: 'Gallon',
          quantity: 1,
          unitCost: 0,
          vatRate: prev.vatStatus === 'Non-VAT' ? 0 : db.settings.defaultVatPercent,
          totalCost: 0,
          remarks: '',
        },
      ],
    }));
  };

  const handleProductQuickFill = (index: number, productId: string) => {
    const prod = db.products.find((p) => p.id === productId);
    if (!prod) return;
    setFormState((prev) => {
      const updated = [...prev.items];
      const qty = updated[index].quantity || 1;
      updated[index] = {
        ...updated[index],
        productId: prod.id,
        itemName: prod.name,
        category: prod.category,
        brand: prod.brand,
        specification: prod.specification,
        size: prod.size,
        unit: prod.unit,
        unitCost: prod.currentCost,
        totalCost: qty * prod.currentCost,
      };
      return { ...prev, items: updated };
    });
  };

  const handleUpdateItem = (index: number, field: keyof QuotationItem, value: string | number) => {
    setFormState((prev) => {
      const updated = [...prev.items];
      const item = { ...updated[index], [field]: value };
      const qty = Number(field === 'quantity' ? value : item.quantity) || 0;
      const cost = Number(field === 'unitCost' ? value : item.unitCost) || 0;
      item.totalCost = Number((qty * cost).toFixed(2));
      updated[index] = item;
      return { ...prev, items: updated };
    });
  };

  const handleRemoveItemRow = (index: number) => {
    if (formState.items.length <= 1) return;
    setFormState((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newAttachments: QuotationAttachment[] = [];
    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let type: QuotationAttachment['type'] = 'PDF';
      if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') type = 'Excel';
      else if (ext === 'doc' || ext === 'docx') type = 'Word';
      else if (ext === 'jpg' || ext === 'jpeg') type = 'JPG';
      else if (ext === 'png') type = 'PNG';

      const kb = Math.max(1, Math.round(file.size / 1024));
      newAttachments.push({
        name: file.name,
        type,
        sizeLabel: `${kb} KB`,
      });
    });

    setFormState((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments],
    }));
  };

  // Calculate Subtotal, VAT, and Grand Total
  const formTotals = useMemo(() => {
    const subtotal = formState.items.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const vatRate = (db.settings.defaultVatPercent || 12) / 100;
    let vatAmount = 0;
    let grandTotal = subtotal;

    if (formState.vatStatus === 'VAT Exclusive') {
      vatAmount = subtotal * vatRate;
      grandTotal = subtotal + vatAmount;
    } else if (formState.vatStatus === 'VAT Inclusive') {
      vatAmount = subtotal - subtotal / (1 + vatRate);
      grandTotal = subtotal;
    } else {
      vatAmount = 0;
      grandTotal = subtotal;
    }

    return {
      subtotal: Number(subtotal.toFixed(2)),
      vatAmount: Number(vatAmount.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
    };
  }, [formState.items, formState.vatStatus, db.settings.defaultVatPercent]);

  const handleSubmitQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = db.quotations.some((q) => q.id === formState.id);
    const finalQuotation: Quotation = {
      ...formState,
      subtotal: formTotals.subtotal,
      vatAmount: formTotals.vatAmount,
      grandTotal: formTotals.grandTotal,
      createdAt: isEdit
        ? db.quotations.find((q) => q.id === formState.id)?.createdAt || defaultToday
        : defaultToday,
    };
    onSaveQuotation(finalQuotation, isEdit);
    setIsFormOpen(false);
    onClearModalState();
  };

  // Filtered and sorted quotations
  const filteredQuotations = useMemo(() => {
    return db.quotations
      .filter((q) => {
        const statusInfo = getQuotationStatus(q.validUntil);
        if (statusFilter !== 'ALL' && statusInfo.status !== statusFilter) return false;
        if (supplierFilter !== 'ALL' && q.supplierId !== supplierFilter) return false;

        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const inHeader =
          q.quotationNo.toLowerCase().includes(query) ||
          q.supplierName.toLowerCase().includes(query) ||
          q.contactPerson.toLowerCase().includes(query) ||
          q.remarks.toLowerCase().includes(query);
        const inItems = q.items.some(
          (it) =>
            it.itemName.toLowerCase().includes(query) ||
            it.brand.toLowerCase().includes(query) ||
            it.specification.toLowerCase().includes(query) ||
            it.category.toLowerCase().includes(query)
        );
        return inHeader || inItems;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return b.quotationDate.localeCompare(a.quotationDate);
        if (sortBy === 'date-asc') return a.quotationDate.localeCompare(b.quotationDate);
        if (sortBy === 'total-desc') return b.grandTotal - a.grandTotal;
        return a.grandTotal - b.grandTotal;
      });
  }, [db.quotations, searchQuery, statusFilter, supplierFilter, sortBy]);

  const handleExportAllCSV = () => {
    const rows = filteredQuotations.map((q) => ({
      Quotation_No: q.quotationNo,
      Supplier: q.supplierName,
      Contact_Person: q.contactPerson,
      Quotation_Date: q.quotationDate,
      Valid_Until: q.validUntil,
      Status: getQuotationStatus(q.validUntil).status,
      Items_Count: q.items.length,
      VAT_Status: q.vatStatus,
      Subtotal_PHP: q.subtotal,
      VAT_Amount_PHP: q.vatAmount,
      Grand_Total_PHP: q.grandTotal,
      Delivery_Terms: q.deliveryTerms,
      Payment_Terms: q.paymentTerms,
      Remarks: q.remarks,
    }));
    exportToCSV('SOL_Quotations_Export.csv', rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quotation no., supplier, item name, brand..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:bg-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">🟢 Active</option>
            <option value="Expiring Soon">🟡 Expiring Soon</option>
            <option value="Expired">🔴 Expired</option>
          </select>

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
          >
            <option value="ALL">All Suppliers</option>
            {db.suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent focus:outline-none font-medium"
            >
              <option value="date-desc">Newest Date First</option>
              <option value="date-asc">Oldest Date First</option>
              <option value="total-desc">Highest Amount First</option>
              <option value="total-asc">Lowest Amount First</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => triggerSystemPrint('Supplier Quotations Master Register')}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Print Quotations</span>
          </button>
          <button
            onClick={handleExportAllCSV}
            className="px-3.5 py-2 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenNewForm}
            className="px-4 py-2 bg-[#8B0000] hover:bg-[#6E0000] text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Quotation</span>
          </button>
        </div>
      </div>

      {/* Quotations Master Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-semibold text-neutral-500 uppercase">
                <th className="py-3 px-4">Quotation No.</th>
                <th className="py-3 px-4">Supplier & Contact</th>
                <th className="py-3 px-4">Quotation Date</th>
                <th className="py-3 px-4">Valid Until</th>
                <th className="py-3 px-4">Terms / VAT</th>
                <th className="py-3 px-4 text-right">Items</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs">
              {filteredQuotations.map((q) => {
                const st = getQuotationStatus(q.validUntil);
                return (
                  <tr key={q.id} className="hover:bg-neutral-50/90 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#8B0000] whitespace-nowrap">
                      <button
                        onClick={() => setActiveDocView(q)}
                        className="hover:underline cursor-pointer text-left"
                      >
                        {q.quotationNo}
                      </button>
                      {q.isDemo && (
                        <span className="ml-1.5 text-[10px] font-normal text-neutral-400">
                          · DEMO DATA
                        </span>
                      )}
                      {q.attachments && q.attachments.length > 0 && (
                        <div className="text-[10px] font-sans font-normal text-neutral-500 flex items-center gap-1 mt-0.5">
                          <Paperclip className="w-3 h-3" />
                          <span>{q.attachments.length} file(s)</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-neutral-900">{q.supplierName}</div>
                      <div className="text-[11px] text-neutral-500">
                        {q.contactPerson} · {q.contactNumber}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-700 whitespace-nowrap">
                      {formatDate(q.quotationDate)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-700 whitespace-nowrap">
                      {formatDate(q.validUntil)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-neutral-800">{q.paymentTerms}</div>
                      <div className="text-[11px] text-neutral-500">{q.vatStatus}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-medium">
                      {q.items.length}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-neutral-900 whitespace-nowrap">
                      {formatPeso(q.grandTotal, db.settings.currencySymbol)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          st.status === 'Active'
                            ? 'text-emerald-700'
                            : st.status === 'Expiring Soon'
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setActiveDocView(q)}
                          title="View Quotation Document"
                          className="px-2 py-1 text-[11px] font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded transition-colors cursor-pointer"
                        >
                          VIEW
                        </button>
                        <button
                          onClick={() => handleOpenEditForm(q)}
                          title="Edit Quotation"
                          className="p-1.5 text-neutral-500 hover:text-[#8B0000] hover:bg-neutral-100 rounded transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDuplicateQuotation(q)}
                          title="Duplicate Quotation"
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteQuotation(q)}
                          title="Delete Quotation"
                          className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredQuotations.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-xs text-neutral-500">
                    No quotations match your current search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUOTATION DOCUMENT VIEWER MODAL (#11) */}
      {activeDocView && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-300 rounded-xl max-w-4xl w-full p-6 lg:p-8 shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
            {/* Action Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-neutral-200 no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#8B0000]" />
                <span className="text-sm font-bold text-neutral-900">
                  Quotation Document Viewer — {activeDocView.quotationNo}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleOpenEditForm(activeDocView)}
                  className="px-3 py-1.5 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>EDIT</span>
                </button>
                <button
                  onClick={() => triggerSystemPrint(`Quotation_${activeDocView.quotationNo}`)}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#8B0000] hover:bg-[#6E0000] text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>PRINT</span>
                </button>
                <button
                  onClick={() => {
                    const rows = activeDocView.items.map((it) => ({
                      Quotation_No: activeDocView.quotationNo,
                      Supplier: activeDocView.supplierName,
                      Item_Name: it.itemName,
                      Category: it.category,
                      Brand: it.brand,
                      Specification: it.specification,
                      Size: it.size,
                      Unit: it.unit,
                      Quantity: it.quantity,
                      Unit_Cost_PHP: it.unitCost,
                      Total_Cost_PHP: it.totalCost,
                      Remarks: it.remarks,
                    }));
                    exportToCSV(`${activeDocView.quotationNo}_Items.csv`, rows);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#D4AF37]/25 hover:bg-[#D4AF37]/40 text-neutral-900 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>DOWNLOAD CSV</span>
                </button>
                <button
                  onClick={() => {
                    const target = activeDocView;
                    setActiveDocView(null);
                    onDeleteQuotation(target);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>DELETE</span>
                </button>
                <button
                  onClick={() => {
                    setActiveDocView(null);
                    onClearModalState();
                  }}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Formal Quotation Sheet */}
            <div className="space-y-6">
              <div className="border-b-2 border-[#8B0000] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <SmsiLogo className="h-14 w-auto shrink-0" />
                  <div>
                    <div className="text-xs font-bold tracking-widest text-[#8B0000] uppercase">
                      {db.settings.companyName}
                    </div>
                    <h2 className="text-xl font-extrabold text-neutral-900 mt-0.5">
                      SUPPLIER QUOTATION RECORD
                    </h2>
                    <p className="text-xs text-neutral-500">{db.settings.companyAddress}</p>
                    <p className="text-[11px] font-extrabold text-[#8B0000] uppercase tracking-wider mt-0.5">
                      Properties of BOSS YSHUA ACOGIDO
                    </p>
                  </div>
                </div>
                <div className="sm:text-right font-mono text-xs space-y-1">
                  <div className="text-sm font-bold text-[#8B0000]">
                    Quotation No: {activeDocView.quotationNo}
                  </div>
                  <div>Quotation Date: {formatDate(activeDocView.quotationDate)}</div>
                  <div>Valid Until: {formatDate(activeDocView.validUntil)}</div>
                  <div className="font-sans font-semibold">
                    {getQuotationStatus(activeDocView.validUntil).label}
                  </div>
                </div>
              </div>

              {/* Supplier & Terms Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200 text-xs">
                <div className="space-y-1.5">
                  <div>
                    <span className="text-neutral-500">Supplier:</span>{' '}
                    <span className="font-bold text-neutral-900">{activeDocView.supplierName}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Contact Person:</span>{' '}
                    <span className="font-medium text-neutral-800">
                      {activeDocView.contactPerson}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Contact Number:</span>{' '}
                    <span className="font-mono text-neutral-800">
                      {activeDocView.contactNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Email:</span>{' '}
                    <span className="text-neutral-800">{activeDocView.email}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <span className="text-neutral-500">Delivery Terms:</span>{' '}
                    <span className="font-medium text-neutral-800">
                      {activeDocView.deliveryTerms}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Payment Terms:</span>{' '}
                    <span className="font-medium text-neutral-800">
                      {activeDocView.paymentTerms}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">VAT Status:</span>{' '}
                    <span className="font-semibold text-neutral-900">
                      {activeDocView.vatStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Remarks:</span>{' '}
                    <span className="text-neutral-700">{activeDocView.remarks || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 border-b border-neutral-200 text-[11px] font-semibold text-neutral-600 uppercase">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item Name & Specification</th>
                      <th className="py-2.5 px-3">Brand</th>
                      <th className="py-2.5 px-3">Size / Unit</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Cost</th>
                      <th className="py-2.5 px-3 text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 text-xs">
                    {activeDocView.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-3 font-mono text-neutral-500">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-neutral-900">{item.itemName}</div>
                          <div className="text-[11px] text-neutral-500">
                            {item.category} · {item.specification}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-neutral-700">{item.brand}</td>
                        <td className="py-2.5 px-3 text-neutral-700">
                          {item.size} ({item.unit})
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {formatPeso(item.unitCost, db.settings.currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-neutral-900">
                          {formatPeso(item.totalCost, db.settings.currencySymbol)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Attachments & Financial Summary */}
              <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
                <div className="flex-1">
                  <div className="text-xs font-bold text-neutral-800 mb-2">
                    Attached Quotation Files (PDF / Excel / Word / JPG / PNG)
                  </div>
                  {activeDocView.attachments && activeDocView.attachments.length > 0 ? (
                    <div className="space-y-1.5">
                      {activeDocView.attachments.map((att, i) => (
                        <div
                          key={i}
                          className="inline-flex items-center gap-2 mr-3 px-3 py-1.5 bg-neutral-100 border border-neutral-200 rounded text-xs text-neutral-800"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-[#8B0000]" />
                          <span className="font-medium">{att.name}</span>
                          <span className="text-neutral-500 font-mono">
                            ({att.type} · {att.sizeLabel})
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400">No external files attached.</p>
                  )}
                </div>

                <div className="w-full sm:w-72 bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-2 text-xs">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-neutral-900">
                      {formatPeso(activeDocView.subtotal, db.settings.currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>VAT ({activeDocView.vatStatus}):</span>
                    <span className="font-mono font-semibold text-neutral-900">
                      {formatPeso(activeDocView.vatAmount, db.settings.currencySymbol)}
                    </span>
                  </div>
                  <div className="border-t border-neutral-300 pt-2 flex justify-between text-sm font-bold text-[#8B0000]">
                    <span>Grand Total:</span>
                    <span className="font-mono">
                      {formatPeso(activeDocView.grandTotal, db.settings.currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT QUOTATION FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-300 rounded-xl max-w-5xl w-full p-6 shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-neutral-200">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  {db.quotations.some((q) => q.id === formState.id)
                    ? `Edit Supplier Quotation (${formState.quotationNo})`
                    : 'Add New Supplier Quotation'}
                </h3>
                <p className="text-xs text-neutral-500">
                  All quoted item prices will be automatically logged to the historical Price List without overwriting previous records.
                </p>
              </div>
              <button
                onClick={handleCloseForm}
                className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitQuotation} className="space-y-6">
              {/* Header Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Quotation Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.quotationNo}
                    onChange={(e) =>
                      setFormState({ ...formState, quotationNo: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Supplier *
                  </label>
                  <select
                    value={formState.supplierId}
                    onChange={(e) => handleSupplierSelect(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
                  >
                    {db.suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Quotation Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formState.quotationDate}
                    onChange={(e) =>
                      setFormState({ ...formState, quotationDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Valid Until *
                  </label>
                  <input
                    type="date"
                    required
                    value={formState.validUntil}
                    onChange={(e) =>
                      setFormState({ ...formState, validUntil: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formState.contactPerson}
                    onChange={(e) =>
                      setFormState({ ...formState, contactPerson: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={formState.contactNumber}
                    onChange={(e) =>
                      setFormState({ ...formState, contactNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Supplier Email
                  </label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    VAT Status
                  </label>
                  <select
                    value={formState.vatStatus}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        vatStatus: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg"
                  >
                    <option value="VAT Exclusive">VAT Exclusive (+{db.settings.defaultVatPercent}%)</option>
                    <option value="VAT Inclusive">VAT Inclusive</option>
                    <option value="Non-VAT">Non-VAT (0%)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Delivery Terms
                  </label>
                  <input
                    type="text"
                    value={formState.deliveryTerms}
                    onChange={(e) =>
                      setFormState({ ...formState, deliveryTerms: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={formState.paymentTerms}
                    onChange={(e) =>
                      setFormState({ ...formState, paymentTerms: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Quotation Items Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-neutral-900 uppercase">
                    Quotation Line Items (Quantity × Unit Cost = Total)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Add Line Item</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-100 border-b border-neutral-200 text-[11px] font-semibold text-neutral-600">
                        <th className="py-2 px-2.5 min-w-[180px]">Quick Fill / Item Name</th>
                        <th className="py-2 px-2.5 min-w-[140px]">Category</th>
                        <th className="py-2 px-2.5 min-w-[110px]">Brand</th>
                        <th className="py-2 px-2.5 min-w-[150px]">Specification</th>
                        <th className="py-2 px-2.5 w-24">Size</th>
                        <th className="py-2 px-2.5 w-24">Unit</th>
                        <th className="py-2 px-2.5 w-20 text-right">Qty</th>
                        <th className="py-2 px-2.5 w-28 text-right">Unit Cost (₱)</th>
                        <th className="py-2 px-2.5 w-28 text-right">Total (₱)</th>
                        <th className="py-2 px-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 text-xs">
                      {formState.items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="p-2 space-y-1">
                            <select
                              value={item.productId || ''}
                              onChange={(e) => handleProductQuickFill(index, e.target.value)}
                              className="w-full px-2 py-1 text-[11px] bg-amber-50/70 border border-[#D4AF37]/50 rounded"
                            >
                              <option value="">-- Select Master Product or Type Below --</option>
                              {db.products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.brand})
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              required
                              placeholder="Item Name *"
                              value={item.itemName}
                              onChange={(e) =>
                                handleUpdateItem(index, 'itemName', e.target.value)
                              }
                              className="w-full px-2 py-1.5 text-xs border border-neutral-300 rounded"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <select
                              value={item.category}
                              onChange={(e) =>
                                handleUpdateItem(index, 'category', e.target.value)
                              }
                              className="w-full px-2 py-1.5 text-xs border border-neutral-300 rounded"
                            >
                              {db.categories.map((c) => (
                                <option key={c.name} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2 align-top">
                            <input
                              type="text"
                              placeholder="Brand"
                              value={item.brand}
                              onChange={(e) =>
                                handleUpdateItem(index, 'brand', e.target.value)
                              }
                              className="w-full px-2 py-1.5 text-xs border border-neutral-300 rounded"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <input
                              type="text"
                              placeholder="Specification"
                              value={item.specification}
                              onChange={(e) =>
                                handleUpdateItem(index, 'specification', e.target.value)
                              }
                              className="w-full px-2 py-1.5 text-xs border border-neutral-300 rounded"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <input
                              type="text"
                              placeholder="Size"
                              value={item.size}
                              onChange={(e) =>
                                handleUpdateItem(index, 'size', e.target.value)
                              }
                              className="w-full px-2 py-1.5 text-xs border border-neutral-300 rounded"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <input
                              type="text"
                              placeholder="Unit"
                              value={item.unit}
                              onChange={(e) =>
                                handleUpdateItem(index, 'unit', e.target.value)
                              }
                              className="w-full px-2 py-1.5 text-xs border border-neutral-300 rounded"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <input
                              type="number"
                              min="1"
                              step="any"
                              required
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)
                              }
                              className="w-full px-2 py-1.5 text-xs font-mono text-right border border-neutral-300 rounded"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={item.unitCost}
                              onChange={(e) =>
                                handleUpdateItem(index, 'unitCost', parseFloat(e.target.value) || 0)
                              }
                              className="w-full px-2 py-1.5 text-xs font-mono text-right border border-neutral-300 rounded"
                            />
                          </td>
                          <td className="p-2 align-top text-right font-mono font-semibold text-neutral-900 pt-3">
                            {formatPeso(item.totalCost, db.settings.currencySymbol)}
                          </td>
                          <td className="p-2 align-top text-center pt-2.5">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(index)}
                              className="text-neutral-400 hover:text-red-600 cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks, File Attachment & Totals Calculation Footer */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Remarks / Special Purchasing Notes
                    </label>
                    <textarea
                      rows={2}
                      value={formState.remarks}
                      onChange={(e) =>
                        setFormState({ ...formState, remarks: e.target.value })
                      }
                      placeholder="Enter delivery lead time notes, freebies, volume tier conditions..."
                      className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Attach Quotation File Reference (PDF, Excel, Word, JPG, PNG)
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-[#8B0000]" />
                        <span>Attach File</span>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.xls,.xlsx,.csv,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {formState.attachments.map((att, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 border border-neutral-300 rounded text-xs"
                          >
                            <span>{att.name}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setFormState((prev) => ({
                                  ...prev,
                                  attachments: prev.attachments.filter((_, i) => i !== idx),
                                }))
                              }
                              className="text-neutral-500 hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-neutral-900">
                      {formatPeso(formTotals.subtotal, db.settings.currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>
                      VAT ({formState.vatStatus} @ {db.settings.defaultVatPercent}%):
                    </span>
                    <span className="font-mono font-semibold text-neutral-900">
                      {formatPeso(formTotals.vatAmount, db.settings.currencySymbol)}
                    </span>
                  </div>
                  <div className="border-t border-neutral-300 pt-2.5 flex justify-between text-sm font-bold text-[#8B0000]">
                    <span>Grand Total:</span>
                    <span className="font-mono">
                      {formatPeso(formTotals.grandTotal, db.settings.currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#8B0000] hover:bg-[#6E0000] rounded-lg shadow-sm cursor-pointer"
                >
                  Save Quotation Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
