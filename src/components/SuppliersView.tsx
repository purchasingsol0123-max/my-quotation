import React, { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Star,
  Phone,
  Mail,
  MapPin,
  Edit3,
  Trash2,
  Eye,
  X,
  ArrowLeft,
  Award,
  FileText,
  Package,
  History,
  Printer,
} from 'lucide-react';
import { AppDatabase, Quotation, Supplier } from '../types';
import {
  calculatePriceChange,
  formatDate,
  formatPeso,
  getQuotationStatus,
  triggerSystemPrint,
} from '../utils';

interface SuppliersViewProps {
  db: AppDatabase;
  onSaveSupplier: (supplier: Supplier, isEdit: boolean) => void;
  onDeleteSupplier: (supplier: Supplier) => void;
  onViewQuotation: (quotation: Quotation) => void;
  initialOpenModal?: boolean;
  onClearModalState: () => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  db,
  onSaveSupplier,
  onDeleteSupplier,
  onViewQuotation,
  initialOpenModal,
  onClearModalState,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [vatFilter, setVatFilter] = useState<'ALL' | 'VAT Registered' | 'Non-VAT'>('ALL');
  const [selectedProfile, setSelectedProfile] = useState<Supplier | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(Boolean(initialOpenModal));
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  React.useEffect(() => {
    if (initialOpenModal) {
      setEditingSupplier(null);
      setFormState(getEmptySupplier());
      setIsModalOpen(true);
    }
  }, [initialOpenModal]);

  function getEmptySupplier(): Supplier {
    return {
      id: `sup-${Date.now()}`,
      name: '',
      contactPerson: '',
      contactNumber: '',
      email: '',
      address: '',
      categories: ['CLEANING CHEMICALS'],
      vatStatus: 'VAT Registered',
      paymentTerms: '30 Days Net',
      deliveryTerms: '3–5 Working Days',
      rating: 5,
      remarks: '',
    };
  }

  const [formState, setFormState] = useState<Supplier>(() => getEmptySupplier());

  const handleOpenAdd = () => {
    onClearModalState();
    setEditingSupplier(null);
    setFormState(getEmptySupplier());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormState({ ...sup });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
    onClearModalState();
  };

  const handleCategoryToggle = (catName: string) => {
    setFormState((prev) => {
      const exists = prev.categories.includes(catName);
      if (exists) {
        return {
          ...prev,
          categories: prev.categories.filter((c) => c !== catName),
        };
      }
      return {
        ...prev,
        categories: [...prev.categories, catName],
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = Boolean(editingSupplier);
    onSaveSupplier(formState, isEdit);
    if (selectedProfile && selectedProfile.id === formState.id) {
      setSelectedProfile(formState);
    }
    handleCloseModal();
  };

  const filteredSuppliers = useMemo(() => {
    return db.suppliers.filter((s) => {
      if (vatFilter !== 'ALL' && s.vatStatus !== vatFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.categories.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [db.suppliers, searchQuery, vatFilter]);

  const renderStars = (rating: number) => {
    return (
      <span className="inline-flex items-center text-[#D4AF37] tracking-tight" title={`${rating} out of 5 stars`}>
        {'★'.repeat(Math.max(1, Math.min(5, rating)))}
        <span className="text-neutral-300">{'★'.repeat(Math.max(0, 5 - rating))}</span>
      </span>
    );
  };

  // If a supplier profile is selected, show the comprehensive Supplier Profile Page (#4)
  if (selectedProfile) {
    const supQuotations = db.quotations.filter(
      (q) => q.supplierId === selectedProfile.id || q.supplierName === selectedProfile.name
    );
    const activeQuots = supQuotations.filter(
      (q) => getQuotationStatus(q.validUntil).status !== 'Expired'
    );
    const expiredQuots = supQuotations.filter(
      (q) => getQuotationStatus(q.validUntil).status === 'Expired'
    );
    const supProducts = db.products.filter(
      (p) => p.supplierId === selectedProfile.id || p.supplierName === selectedProfile.name
    );
    const supPriceHistory = db.priceHistory
      .filter(
        (ph) => ph.supplierId === selectedProfile.id || ph.supplierName === selectedProfile.name
      )
      .sort((a, b) => b.dateRecorded.localeCompare(a.dateRecorded));

    // Identify products where this supplier holds the lowest price across all suppliers
    const lowestPriceWins = supPriceHistory.filter((rec) => {
      const allForProduct = db.priceHistory.filter(
        (p) => p.productName.toLowerCase() === rec.productName.toLowerCase()
      );
      const minCost = Math.min(...allForProduct.map((x) => x.costPrice));
      return rec.costPrice === minCost;
    });

    return (
      <div className="space-y-6">
        {/* Back & Actions Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-neutral-200 rounded-lg p-4">
          <button
            onClick={() => setSelectedProfile(null)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 hover:text-[#8B0000] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Suppliers</span>
          </button>

          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={() => triggerSystemPrint(`Supplier Profile - ${selectedProfile.name}`)}
              className="px-3.5 py-1.5 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Print Supplier Profile</span>
            </button>
            <button
              onClick={() => handleOpenEdit(selectedProfile)}
              className="px-3.5 py-1.5 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Edit Supplier Profile</span>
            </button>
            <button
              onClick={() => {
                const target = selectedProfile;
                setSelectedProfile(null);
                onDeleteSupplier(target);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Supplier Information Header Card */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-neutral-200">
            <div>
              <div className="text-xs font-bold text-[#8B0000] uppercase tracking-wider">
                ACCREDITED SUPPLIER PROFILE
                {selectedProfile.isDemo && ' · DEMO DATA'}
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mt-1">{selectedProfile.name}</h2>
              <div className="text-xs text-neutral-500 mt-1">
                {selectedProfile.categories.join(' · ')}
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-1">
              <div className="text-lg">{renderStars(selectedProfile.rating)}</div>
              <div className="text-xs font-semibold text-neutral-700">
                {selectedProfile.vatStatus} · {selectedProfile.paymentTerms}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5 text-xs">
            <div className="space-y-2">
              <div className="font-bold text-neutral-900 uppercase text-[11px]">
                Contact Details
              </div>
              <div className="text-neutral-700">
                <span className="text-neutral-500">Contact Person:</span>{' '}
                <span className="font-semibold text-neutral-900">
                  {selectedProfile.contactPerson}
                </span>
              </div>
              <div className="text-neutral-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#8B0000]" />
                <span className="font-mono">{selectedProfile.contactNumber}</span>
              </div>
              <div className="text-neutral-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#8B0000]" />
                <span>{selectedProfile.email}</span>
              </div>
              <div className="text-neutral-700 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#8B0000] shrink-0 mt-0.5" />
                <span>{selectedProfile.address}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-neutral-900 uppercase text-[11px]">
                Commercial Terms
              </div>
              <div>
                <span className="text-neutral-500">Tax Status:</span>{' '}
                <span className="font-semibold text-neutral-900">{selectedProfile.vatStatus}</span>
              </div>
              <div>
                <span className="text-neutral-500">Payment Terms:</span>{' '}
                <span className="font-semibold text-neutral-900">
                  {selectedProfile.paymentTerms}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Delivery Terms:</span>{' '}
                <span className="font-semibold text-neutral-900">
                  {selectedProfile.deliveryTerms}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Remarks:</span>{' '}
                <span className="text-neutral-700">{selectedProfile.remarks || '—'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
              <div>
                <div className="text-[11px] text-neutral-500">Active Quotations</div>
                <div className="text-xl font-bold font-mono text-emerald-700">
                  {activeQuots.length}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-neutral-500">Expired Quotations</div>
                <div className="text-xl font-bold font-mono text-red-700">
                  {expiredQuots.length}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-neutral-500">Products Supplied</div>
                <div className="text-xl font-bold font-mono text-neutral-900">
                  {supProducts.length}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-neutral-500">Lowest Price Items</div>
                <div className="text-xl font-bold font-mono text-[#8B0000]">
                  🏆 {lowestPriceWins.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lowest Prices & Products Supplied */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lowest Prices Offered */}
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="text-sm font-bold text-neutral-900">
                Lowest Market Prices Offered ({lowestPriceWins.length})
              </h3>
            </div>
            <div className="divide-y divide-neutral-200 text-xs">
              {lowestPriceWins.map((rec) => (
                <div key={rec.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-neutral-900">🏆 {rec.productName}</div>
                    <div className="text-[11px] text-neutral-500">
                      {rec.brand} · {rec.specification}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-bold text-emerald-700">
                      {formatPeso(rec.costPrice, db.settings.currencySymbol)}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {rec.quotationNo || formatDate(rec.dateRecorded)}
                    </div>
                  </div>
                </div>
              ))}
              {lowestPriceWins.length === 0 && (
                <div className="p-6 text-center text-xs text-neutral-400">
                  No current lowest-price benchmark items recorded for this supplier.
                </div>
              )}
            </div>
          </div>

          {/* Quotations Submitted (Active & Expired) */}
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#8B0000]" />
              <h3 className="text-sm font-bold text-neutral-900">
                Quotations Submitted ({supQuotations.length})
              </h3>
            </div>
            <div className="divide-y divide-neutral-200 text-xs">
              {supQuotations.map((q) => {
                const st = getQuotationStatus(q.validUntil);
                return (
                  <div key={q.id} className="p-4 flex items-center justify-between">
                    <div>
                      <button
                        onClick={() => onViewQuotation(q)}
                        className="font-mono font-bold text-[#8B0000] hover:underline cursor-pointer"
                      >
                        {q.quotationNo}
                      </button>
                      <div className="text-[11px] text-neutral-500">
                        Date: {formatDate(q.quotationDate)} · Valid: {formatDate(q.validUntil)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-neutral-900">
                        {formatPeso(q.grandTotal, db.settings.currencySymbol)}
                      </div>
                      <div className="text-[11px] font-semibold">{st.label}</div>
                    </div>
                  </div>
                );
              })}
              {supQuotations.length === 0 && (
                <div className="p-6 text-center text-xs text-neutral-400">
                  No quotations recorded for this supplier yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Supplier Historical Price Records Table */}
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center gap-2">
            <History className="w-4 h-4 text-[#8B0000]" />
            <h3 className="text-sm font-bold text-neutral-900">
              Complete Supplier Price History ({supPriceHistory.length} Records)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                  <th className="py-2.5 px-4">Date Recorded</th>
                  <th className="py-2.5 px-4">Product Name</th>
                  <th className="py-2.5 px-4">Brand & Spec</th>
                  <th className="py-2.5 px-4">Quotation Ref</th>
                  <th className="py-2.5 px-4 text-right">Previous Price</th>
                  <th className="py-2.5 px-4 text-right">Quoted Cost</th>
                  <th className="py-2.5 px-4">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs">
                {supPriceHistory.map((ph) => {
                  const change = calculatePriceChange(ph.previousPrice, ph.costPrice);
                  return (
                    <tr key={ph.id} className="hover:bg-neutral-50">
                      <td className="py-2.5 px-4 font-mono text-neutral-600">
                        {formatDate(ph.dateRecorded)}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-neutral-900">
                        {ph.productName}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-600">
                        {ph.brand} · {ph.specification}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[#8B0000]">
                        {ph.quotationNo || 'Direct Entry'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-neutral-500">
                        {ph.previousPrice
                          ? formatPeso(ph.previousPrice, db.settings.currencySymbol)
                          : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-neutral-900">
                        {formatPeso(ph.costPrice, db.settings.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">
                        <span
                          className={
                            change.direction === 'increase'
                              ? 'text-red-700 font-semibold'
                              : change.direction === 'decrease'
                              ? 'text-emerald-700 font-semibold'
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
  }

  return (
    <div className="space-y-6">
      {/* Top Search & Action Bar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search supplier name, contact person, category, address..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:bg-white"
            />
          </div>

          <select
            value={vatFilter}
            onChange={(e) => setVatFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg"
          >
            <option value="ALL">All Tax Statuses</option>
            <option value="VAT Registered">VAT Registered</option>
            <option value="Non-VAT">Non-VAT</option>
          </select>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            type="button"
            onClick={() => triggerSystemPrint('Accredited Suppliers Directory')}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Print Directory</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#8B0000] hover:bg-[#6E0000] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Suppliers Directory Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-semibold text-neutral-500 uppercase">
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Product Categories</th>
                <th className="py-3 px-4">VAT / Terms</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4 text-right">Quotations</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs">
              {filteredSuppliers.map((sup) => {
                const quoteCount = db.quotations.filter(
                  (q) => q.supplierId === sup.id || q.supplierName === sup.name
                ).length;
                return (
                  <tr key={sup.id} className="hover:bg-neutral-50/90 transition-colors">
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setSelectedProfile(sup)}
                        className="font-bold text-neutral-900 hover:text-[#8B0000] hover:underline text-left cursor-pointer"
                      >
                        {sup.name}
                      </button>
                      {sup.isDemo && (
                        <span className="ml-1.5 text-[10px] text-neutral-400">· DEMO DATA</span>
                      )}
                      <div className="text-[11px] text-neutral-500 truncate max-w-xs">
                        {sup.address}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-neutral-900">{sup.contactPerson}</div>
                      <div className="text-[11px] font-mono text-neutral-500">
                        {sup.contactNumber} · {sup.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600">
                      {sup.categories.join(' · ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-neutral-900">{sup.vatStatus}</div>
                      <div className="text-[11px] text-neutral-500">{sup.paymentTerms}</div>
                    </td>
                    <td className="py-3.5 px-4 text-sm whitespace-nowrap">
                      {renderStars(sup.rating)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-neutral-800">
                      {quoteCount}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setSelectedProfile(sup)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded transition-colors cursor-pointer"
                        >
                          Profile
                        </button>
                        <button
                          onClick={() => handleOpenEdit(sup)}
                          className="p-1.5 text-neutral-500 hover:text-[#8B0000] hover:bg-neutral-100 rounded cursor-pointer"
                          title="Edit Supplier"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteSupplier(sup)}
                          className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Delete Supplier"
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

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-300 rounded-xl max-w-2xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200">
              <h3 className="text-base font-bold text-neutral-900">
                {editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Supplier'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 text-neutral-500 hover:text-neutral-900 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.contactPerson}
                    onChange={(e) =>
                      setFormState({ ...formState, contactPerson: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Contact Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.contactNumber}
                    onChange={(e) =>
                      setFormState({ ...formState, contactNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Complete Office / Warehouse Address
                  </label>
                  <input
                    type="text"
                    value={formState.address}
                    onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    VAT Registration
                  </label>
                  <select
                    value={formState.vatStatus}
                    onChange={(e) =>
                      setFormState({ ...formState, vatStatus: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  >
                    <option value="VAT Registered">VAT Registered</option>
                    <option value="Non-VAT">Non-VAT</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Supplier Rating (1–5 Stars)
                  </label>
                  <select
                    value={formState.rating}
                    onChange={(e) =>
                      setFormState({ ...formState, rating: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  >
                    <option value={5}>★★★★★ (5 - Excellent Reliability)</option>
                    <option value={4}>★★★★☆ (4 - Very Good)</option>
                    <option value={3}>★★★☆☆ (3 - Satisfactory)</option>
                    <option value={2}>★★☆☆☆ (2 - Needs Improvement)</option>
                    <option value={1}>★☆☆☆☆ (1 - Poor)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={formState.paymentTerms}
                    onChange={(e) =>
                      setFormState({ ...formState, paymentTerms: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Delivery Terms
                  </label>
                  <input
                    type="text"
                    value={formState.deliveryTerms}
                    onChange={(e) =>
                      setFormState({ ...formState, deliveryTerms: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-700 mb-1.5">
                    Product Categories Supplied
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {db.categories.map((cat) => {
                      const active = formState.categories.includes(cat.name);
                      return (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => handleCategoryToggle(cat.name)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#8B0000] text-white border-[#8B0000]'
                              : 'bg-neutral-50 text-neutral-700 border-neutral-300'
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-700 mb-1">Remarks</label>
                  <textarea
                    rows={2}
                    value={formState.remarks}
                    onChange={(e) => setFormState({ ...formState, remarks: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-[#8B0000] hover:bg-[#6E0000] text-white rounded-lg cursor-pointer"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
