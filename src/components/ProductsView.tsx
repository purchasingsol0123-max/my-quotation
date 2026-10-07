import React, { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Star,
  Edit3,
  Trash2,
  FolderPlus,
  X,
  Download,
  AlertCircle,
  Printer,
  Eye,
} from 'lucide-react';
import { AppDatabase, Product } from '../types';
import {
  directPrintHtml,
  exportToCSV,
  formatDate,
  formatPeso,
  getManilaTimestamp,
  triggerSystemPrint,
} from '../utils';
import { SmsiLogo } from './SmsiLogo';

interface ProductsViewProps {
  db: AppDatabase;
  onSaveProduct: (product: Product, isEdit: boolean) => void;
  onDeleteProduct: (product: Product) => void;
  onToggleFavorite: (productId: string) => void;
  onAddCategory: (categoryName: string, subcategoryName?: string) => void;
  initialOpenModal?: boolean;
  onClearModalState: () => void;
  onlyFavorites?: boolean;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  db,
  onSaveProduct,
  onDeleteProduct,
  onToggleFavorite,
  onAddCategory,
  initialOpenModal,
  onClearModalState,
  onlyFavorites = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');

  const [isProductModalOpen, setIsProductModalOpen] = useState(Boolean(initialOpenModal));
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

  React.useEffect(() => {
    if (initialOpenModal) {
      setEditingProduct(null);
      setFormState(getEmptyProduct());
      setIsProductModalOpen(true);
    }
  }, [initialOpenModal]);

  function getEmptyProduct(): Product {
    const firstCat = db.categories[0];
    const firstSup = db.suppliers[0];
    const defaultMarkup = db.settings.defaultMarkupPercent || 30;
    const defaultCost = 295;
    return {
      id: `prod-${Date.now()}`,
      code: `SOL-PRD-${String(db.products.length + 101).slice(-3)}`,
      name: '',
      category: firstCat?.name || 'CLEANING CHEMICALS',
      subcategory: firstCat?.subcategories[0] || 'All-Purpose Cleaner',
      brand: '',
      specification: '',
      size: '1 Gallon',
      unit: 'Gallon',
      description: '',
      supplierId: firstSup?.id || '',
      supplierName: firstSup?.name || '',
      currentCost: defaultCost,
      markupPercent: defaultMarkup,
      sellingPrice: Number((defaultCost * (1 + defaultMarkup / 100)).toFixed(2)),
      stock: 50,
      minStock: 15,
      remarks: '',
      isFavorite: false,
      updatedAt: new Date().toISOString().split('T')[0],
    };
  }

  const [formState, setFormState] = useState<Product>(() => getEmptyProduct());

  const handleOpenAdd = () => {
    onClearModalState();
    setEditingProduct(null);
    setFormState(getEmptyProduct());
    setIsProductModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormState({ ...prod });
    setIsProductModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
    onClearModalState();
  };

  const handleCostOrMarkupChange = (cost: number, markup: number) => {
    const selling = Number((cost * (1 + markup / 100)).toFixed(2));
    setFormState((prev) => ({
      ...prev,
      currentCost: cost,
      markupPercent: markup,
      sellingPrice: selling,
    }));
  };

  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = Boolean(editingProduct);
    onSaveProduct(
      {
        ...formState,
        updatedAt: new Date().toISOString().split('T')[0],
      },
      isEdit
    );
    handleCloseModal();
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    onAddCategory(newCategoryName.trim().toUpperCase(), newSubcategoryName.trim() || undefined);
    setNewCategoryName('');
    setNewSubcategoryName('');
    setIsCategoryModalOpen(false);
  };

  const filteredProducts = useMemo(() => {
    return db.products.filter((p) => {
      if (onlyFavorites && !p.isFavorite) return false;
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (supplierFilter !== 'ALL' && p.supplierId !== supplierFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.specification.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q)
      );
    });
  }, [db.products, onlyFavorites, categoryFilter, supplierFilter, searchQuery]);

  const currentSubcategories = useMemo(() => {
    const found = db.categories.find((c) => c.name === formState.category);
    return found ? found.subcategories : [];
  }, [db.categories, formState.category]);

  const handleDirectPrintProduct = (prod: Product) => {
    setViewingProduct(prod);
    const historyRows = db.priceRecords.filter(
      (pr) => pr.productId === prod.id || pr.productName.toLowerCase() === prod.name.toLowerCase()
    );
    const historyHtml =
      historyRows.length > 0
        ? historyRows
            .map(
              (pr) => `
          <tr>
            <td>${formatDate(pr.dateRecorded)}</td>
            <td><strong>${pr.quotationNo}</strong></td>
            <td>${pr.supplierName}</td>
            <td class="text-right">${pr.previousPrice ? formatPeso(pr.previousPrice, db.settings.currencySymbol) : '—'}</td>
            <td class="text-right"><strong>${formatPeso(pr.unitCost, db.settings.currencySymbol)}</strong></td>
            <td>${pr.vatStatus}</td>
          </tr>`
            )
            .join('')
        : `<tr><td colspan="6" style="text-align:center;color:#6b7280;">Initial master product record</td></tr>`;

    directPrintHtml(
      `Product_${prod.code}_${prod.name}`,
      `
      <div class="header">
        <div>
          <div class="company">${db.settings.companyName}</div>
          <div class="doc-title">MASTER PRODUCT SPECIFICATION & PRICING SHEET</div>
          <div>${db.settings.companyAddress}</div>
          <div class="owner">Properties of BOSS YSHUA ACOGIDO</div>
        </div>
        <div class="meta">
          <div><strong>Product Code: ${prod.code}</strong></div>
          <div>SKU: ${prod.sku || prod.code}</div>
          <div>Barcode: ${prod.barcode || '899000100101'}</div>
          <div>Printed: ${getManilaTimestamp()}</div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="row"><span class="label">Product Name:</span><span class="val">${prod.name}</span></div>
          <div class="row"><span class="label">Category / Subcategory:</span><span class="val">${prod.category} · ${prod.subcategory}</span></div>
          <div class="row"><span class="label">Brand & Packaging:</span><span class="val">${prod.brand} (${prod.size} · ${prod.unit})</span></div>
          <div class="row"><span class="label">Specification:</span><span class="val">${prod.specification || '—'}</span></div>
          <div class="row"><span class="label">Primary Supplier:</span><span class="val">${prod.supplierName}</span></div>
        </div>
        <div class="card">
          <div class="row"><span class="label">Current Supplier Cost:</span><span class="val">${formatPeso(prod.currentCost, db.settings.currencySymbol)}</span></div>
          <div class="row"><span class="label">Standard Markup %:</span><span class="val">${prod.markupPercent}%</span></div>
          <div class="row"><span class="label">Suggested Selling Price:</span><span class="val-red">${formatPeso(prod.sellingPrice, db.settings.currencySymbol)}</span></div>
          <div class="row"><span class="label">Current Warehouse Stock:</span><span class="val">${prod.stock} ${prod.unit}s (Min: ${prod.minStock})</span></div>
          <div class="row"><span class="label">Total Stock Cost Valuation:</span><span class="val">${formatPeso(prod.stock * prod.currentCost, db.settings.currencySymbol)}</span></div>
        </div>
      </div>

      <h4 style="margin: 14px 0 6px; text-transform: uppercase; font-size: 11px;">Supplier Price History — ${prod.name}</h4>
      <table>
        <thead>
          <tr>
            <th>Date Recorded</th>
            <th>Quotation Ref</th>
            <th>Supplier</th>
            <th class="text-right">Previous Price</th>
            <th class="text-right">Unit Cost</th>
            <th>VAT Status</th>
          </tr>
        </thead>
        <tbody>
          ${historyHtml}
        </tbody>
      </table>

      <div class="signatures">
        <div>
          <div class="sig-label">Prepared By:</div>
          <div class="sig-line">Purchasing & Inventory Control</div>
        </div>
        <div>
          <div class="sig-label">Verified By:</div>
          <div class="sig-line">Internal Audit Department</div>
        </div>
        <div>
          <div class="sig-label">Approved By:</div>
          <div class="sig-owner">BOSS YSHUA ACOGIDO</div>
        </div>
      </div>
      `
    );
  };

  const handleDirectPrintCatalog = () => {
    const rowsHtml = filteredProducts
      .map(
        (p) => `
      <tr>
        <td><strong>${p.code}</strong></td>
        <td><strong>${p.name}</strong><br/><span style="color:#6b7280;font-size:10px;">${p.specification || ''}</span></td>
        <td>${p.category}<br/><span style="color:#6b7280;font-size:10px;">${p.subcategory}</span></td>
        <td>${p.brand} (${p.size} · ${p.unit})</td>
        <td>${p.supplierName}</td>
        <td class="text-right">${formatPeso(p.currentCost, db.settings.currencySymbol)}</td>
        <td class="text-right">${p.markupPercent}%</td>
        <td class="text-right"><strong>${formatPeso(p.sellingPrice, db.settings.currencySymbol)}</strong></td>
        <td class="text-right">${p.stock}</td>
      </tr>`
      )
      .join('');

    directPrintHtml(
      'SOL_Master_Products_Catalog',
      `
      <div class="header">
        <div>
          <div class="company">${db.settings.companyName}</div>
          <div class="doc-title">OFFICIAL MASTER PRODUCTS & PRICE CATALOG</div>
          <div>${db.settings.companyAddress}</div>
          <div class="owner">Properties of BOSS YSHUA ACOGIDO</div>
        </div>
        <div class="meta">
          <div>Total Products Listed: ${filteredProducts.length}</div>
          <div>Printed: ${getManilaTimestamp()}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Product Name & Spec</th>
            <th>Category</th>
            <th>Brand & Unit</th>
            <th>Supplier</th>
            <th class="text-right">Cost</th>
            <th class="text-right">Markup</th>
            <th class="text-right">Selling Price</th>
            <th class="text-right">Stock</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div class="signatures">
        <div>
          <div class="sig-label">Prepared By:</div>
          <div class="sig-line">Purchasing & Inventory Control</div>
        </div>
        <div>
          <div class="sig-label">Verified By:</div>
          <div class="sig-line">Internal Audit Department</div>
        </div>
        <div>
          <div class="sig-label">Approved By:</div>
          <div class="sig-owner">BOSS YSHUA ACOGIDO</div>
        </div>
      </div>
      `
    );
  };

  return (
    <div className="space-y-6">
      {/* Category Taxonomy Reference Strip */}
      {!onlyFavorites && (
        <div className="bg-white border border-neutral-200 rounded-lg p-4 no-print">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase">
                Master Product Categories ({db.categories.length} Groups)
              </h3>
              <p className="text-[11px] text-neutral-500">
                Select a category tab below to filter products or create unlimited custom categories & subcategories
              </p>
            </div>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-[#8B0000]" />
              <span>+ Add Category / Subcategory</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                categoryFilter === 'ALL'
                  ? 'bg-[#8B0000] text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              All Categories ({db.products.length})
            </button>
            {db.categories.map((cat) => {
              const count = db.products.filter((p) => p.category === cat.name).length;
              return (
                <button
                  key={cat.name}
                  onClick={() => setCategoryFilter(cat.name)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    categoryFilter === cat.name
                      ? 'bg-[#8B0000] text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {cat.name} ({count}) · {cat.subcategories.length} types
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product code, name, brand, specification, subcategory..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:bg-white"
            />
          </div>

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg"
          >
            <option value="ALL">All Default Suppliers</option>
            {db.suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              const rows = filteredProducts.map((p) => ({
                Product_Code: p.code,
                Product_Name: p.name,
                Category: p.category,
                Subcategory: p.subcategory,
                Brand: p.brand,
                Specification: p.specification,
                Size: p.size,
                Unit: p.unit,
                Supplier: p.supplierName,
                Current_Cost_PHP: p.currentCost,
                Markup_Percent: p.markupPercent,
                Suggested_Selling_Price_PHP: p.sellingPrice,
                Stock: p.stock,
                Min_Stock: p.minStock,
                Favorite: p.isFavorite ? 'Yes' : 'No',
              }));
              exportToCSV('SOL_Master_Products.csv', rows);
            }}
            className="px-3.5 py-2 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleDirectPrintCatalog}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Print Catalog</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#8B0000] hover:bg-[#6E0000] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Master Products Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-semibold text-neutral-500 uppercase">
                <th className="py-3 px-3 text-center w-10">⭐</th>
                <th className="py-3 px-3">Code</th>
                <th className="py-3 px-4">Product Name & Spec</th>
                <th className="py-3 px-3">Category / Subcategory</th>
                <th className="py-3 px-3">Brand & Size</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-3 text-right">Current Cost</th>
                <th className="py-3 px-3 text-right">Markup</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-right">Stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs">
              {filteredProducts.map((prod) => {
                const isLowStock = prod.stock <= prod.minStock;
                return (
                  <tr key={prod.id} className="hover:bg-neutral-50/90 transition-colors">
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onToggleFavorite(prod.id)}
                        title={prod.isFavorite ? 'Remove from Favorites' : 'Mark as Favorite'}
                        className="cursor-pointer"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            prod.isFavorite
                              ? 'fill-[#D4AF37] text-[#D4AF37]'
                              : 'text-neutral-300 hover:text-neutral-500'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-neutral-700 whitespace-nowrap">
                      {prod.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-900">
                        {prod.name}
                        {prod.isDemo && (
                          <span className="ml-1.5 text-[10px] font-normal text-neutral-400">
                            · DEMO
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500">{prod.specification}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-neutral-800 text-[11px]">
                        {prod.category}
                      </div>
                      <div className="text-[11px] text-neutral-500">{prod.subcategory}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-neutral-900">{prod.brand}</div>
                      <div className="text-[11px] text-neutral-500">
                        {prod.size} · {prod.unit}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-neutral-800">{prod.supplierName}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-neutral-900 whitespace-nowrap">
                      {formatPeso(prod.currentCost, db.settings.currencySymbol)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-neutral-600">
                      {prod.markupPercent}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#8B0000] whitespace-nowrap">
                      {formatPeso(prod.sellingPrice, db.settings.currencySymbol)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                      <span
                        className={
                          isLowStock ? 'text-red-700 font-bold' : 'text-neutral-800 font-medium'
                        }
                      >
                        {prod.stock}
                      </span>
                      <span className="text-[10px] text-neutral-400"> / min {prod.minStock}</span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDirectPrintProduct(prod)}
                          className="px-2 py-1 text-[11px] font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded inline-flex items-center gap-1 cursor-pointer"
                          title="Direct Print Product Sheet"
                        >
                          <Printer className="w-3 h-3 text-[#D4AF37]" />
                          <span>Print</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          className="p-1.5 text-neutral-500 hover:text-[#8B0000] hover:bg-neutral-100 rounded cursor-pointer"
                          title="Edit Product & Price"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteProduct(prod)}
                          className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-xs text-neutral-500">
                    {onlyFavorites
                      ? 'No favorite products starred yet. Click the ⭐ icon next to any product to add it to your Favorites.'
                      : 'No products match your search criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-300 rounded-xl max-w-3xl w-full p-6 shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  {editingProduct ? `Edit Product (${editingProduct.code})` : 'Add New Product'}
                </h3>
                <p className="text-xs text-neutral-500">
                  Changing Current Cost automatically appends a new record to Price History without deleting old prices.
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 text-neutral-500 hover:text-neutral-900 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Product Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.code}
                    onChange={(e) => setFormState({ ...formState, code: e.target.value })}
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    placeholder="e.g., Floor Cleaner 1 Gallon"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Category *</label>
                  <select
                    value={formState.category}
                    onChange={(e) => {
                      const cat = db.categories.find((c) => c.name === e.target.value);
                      setFormState({
                        ...formState,
                        category: e.target.value,
                        subcategory: cat?.subcategories[0] || 'General',
                      });
                    }}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  >
                    {db.categories.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Subcategory</label>
                  <input
                    type="text"
                    list="subcategories-list"
                    value={formState.subcategory}
                    onChange={(e) => setFormState({ ...formState, subcategory: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                  <datalist id="subcategories-list">
                    {currentSubcategories.map((sub) => (
                      <option key={sub} value={sub} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Brand *</label>
                  <input
                    type="text"
                    required
                    value={formState.brand}
                    onChange={(e) => setFormState({ ...formState, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Specification *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.specification}
                    onChange={(e) => setFormState({ ...formState, specification: e.target.value })}
                    placeholder="Concentration, GSM, gauge, power rating, material..."
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Size</label>
                  <input
                    type="text"
                    value={formState.size}
                    onChange={(e) => setFormState({ ...formState, size: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Unit *</label>
                  <input
                    type="text"
                    required
                    value={formState.unit}
                    onChange={(e) => setFormState({ ...formState, unit: e.target.value })}
                    placeholder="Gallon, Pack, Pair, Unit, Dozen"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Primary Supplier *
                  </label>
                  <select
                    value={formState.supplierId}
                    onChange={(e) => {
                      const sup = db.suppliers.find((s) => s.id === e.target.value);
                      setFormState({
                        ...formState,
                        supplierId: sup?.id || '',
                        supplierName: sup?.name || '',
                      });
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

                {/* Pricing & Markup Block */}
                <div className="sm:col-span-3 bg-amber-50/70 border border-[#D4AF37]/40 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-neutral-800 mb-1">
                      Current Cost (₱) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={formState.currentCost}
                      onChange={(e) =>
                        handleCostOrMarkupChange(
                          parseFloat(e.target.value) || 0,
                          formState.markupPercent
                        )
                      }
                      className="w-full px-3 py-2 font-mono font-bold bg-white border border-neutral-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-800 mb-1">Markup % *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      required
                      value={formState.markupPercent}
                      onChange={(e) =>
                        handleCostOrMarkupChange(
                          formState.currentCost,
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 font-mono bg-white border border-neutral-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#8B0000] mb-1">
                      Suggested Selling Price (₱)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formState.sellingPrice}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          sellingPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 font-mono font-bold text-[#8B0000] bg-white border border-neutral-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formState.stock}
                    onChange={(e) =>
                      setFormState({ ...formState, stock: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Minimum Alert Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formState.minStock}
                    onChange={(e) =>
                      setFormState({ ...formState, minStock: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-neutral-800">
                    <input
                      type="checkbox"
                      checked={formState.isFavorite}
                      onChange={(e) =>
                        setFormState({ ...formState, isFavorite: e.target.checked })
                      }
                      className="rounded border-neutral-300 text-[#8B0000]"
                    />
                    <span>⭐ Mark as Favorite Item</span>
                  </label>
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Product Description
                  </label>
                  <input
                    type="text"
                    value={formState.description}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-neutral-700 mb-1">Remarks</label>
                  <input
                    type="text"
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
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Unlimited Category / Subcategory Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-300 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-200">
              <h3 className="text-sm font-bold text-neutral-900">
                Add Custom Category or Subcategory
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-neutral-500 hover:text-neutral-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Category Group Name *
                </label>
                <input
                  type="text"
                  required
                  list="existing-cats"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. WASHROOM DISPENSERS or CLEANING CHEMICALS"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                />
                <datalist id="existing-cats">
                  {db.categories.map((c) => (
                    <option key={c.name} value={c.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Subcategory / Product Type (Optional)
                </label>
                <input
                  type="text"
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  placeholder="e.g. Paper Towel Dispenser"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3.5 py-2 bg-neutral-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#8B0000] text-white rounded-lg font-semibold"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Individual Product Specification & Price History Sheet Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-2 border-[#D4AF37] rounded-xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
            {/* Top Action Toolbar (Hidden when printing) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-neutral-200 no-print">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-[#8B0000] text-white text-[10px] font-mono font-bold uppercase rounded">
                  OFFICIAL PRODUCT SHEET
                </span>
                <span className="text-xs font-bold text-neutral-900">
                  {viewingProduct.code} — {viewingProduct.name}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDirectPrintProduct(viewingProduct)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-[#D4AF37]" />
                  <span>SEND TO PRINTER (Ctrl+P)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    exportToCSV(`Product_Sheet_${viewingProduct.code}.csv`, [
                      {
                        Code: viewingProduct.code,
                        SKU: viewingProduct.sku || viewingProduct.code,
                        Barcode: viewingProduct.barcode || '',
                        Name: viewingProduct.name,
                        Category: viewingProduct.category,
                        Subcategory: viewingProduct.subcategory,
                        Brand: viewingProduct.brand,
                        Specification: viewingProduct.specification,
                        Size: viewingProduct.size,
                        Unit: viewingProduct.unit,
                        Supplier: viewingProduct.supplierName,
                        Current_Cost_PHP: viewingProduct.currentCost,
                        Markup_Percent: viewingProduct.markupPercent,
                        Selling_Price_PHP: viewingProduct.sellingPrice,
                        Current_Stock: viewingProduct.stock,
                        Min_Stock: viewingProduct.minStock,
                        Updated_At: viewingProduct.updatedAt,
                      },
                    ]);
                  }}
                  className="px-3.5 py-2 bg-[#D4AF37]/25 hover:bg-[#D4AF37]/40 text-neutral-900 border border-[#D4AF37]/50 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = viewingProduct;
                    setViewingProduct(null);
                    handleOpenEdit(target);
                  }}
                  className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Product</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingProduct(null)}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Formal Printable Corporate Letterhead */}
            <div className="space-y-6">
              <div className="border-b-2 border-[#8B0000] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <SmsiLogo className="h-14 w-auto shrink-0" />
                  <div>
                    <div className="text-xs font-bold tracking-widest text-[#8B0000] uppercase">
                      {db.settings.companyName}
                    </div>
                    <h2 className="text-xl font-extrabold text-neutral-900 mt-0.5">
                      MASTER PRODUCT SPECIFICATION & PRICING SHEET
                    </h2>
                    <p className="text-xs text-neutral-500">{db.settings.companyAddress}</p>
                    <p className="text-[11px] font-extrabold text-[#8B0000] uppercase tracking-wider mt-0.5">
                      Properties of BOSS YSHUA ACOGIDO
                    </p>
                  </div>
                </div>
                <div className="sm:text-right font-mono text-xs space-y-1">
                  <div className="text-sm font-bold text-[#8B0000]">
                    Product Code: {viewingProduct.code}
                  </div>
                  <div>SKU: {viewingProduct.sku || viewingProduct.code}</div>
                  <div>Barcode: {viewingProduct.barcode || '899000100101'}</div>
                  <div>Last Updated: {formatDate(viewingProduct.updatedAt)}</div>
                </div>
              </div>

              {/* Product Details & Pricing Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200 text-xs">
                <div className="space-y-2">
                  <div>
                    <span className="text-neutral-500">Product Name:</span>{' '}
                    <span className="font-bold text-neutral-900 text-sm">{viewingProduct.name}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Category / Subcategory:</span>{' '}
                    <span className="font-semibold text-neutral-800">
                      {viewingProduct.category} · {viewingProduct.subcategory}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Brand & Packaging:</span>{' '}
                    <span className="font-semibold text-neutral-800">
                      {viewingProduct.brand} ({viewingProduct.size} · {viewingProduct.unit})
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Technical Specification:</span>{' '}
                    <span className="text-neutral-800">{viewingProduct.specification || '—'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Primary Supplier:</span>{' '}
                    <span className="font-bold text-[#8B0000]">{viewingProduct.supplierName}</span>
                  </div>
                </div>

                <div className="space-y-2 bg-white p-3.5 rounded-lg border border-neutral-200">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 font-semibold">Current Supplier Cost:</span>
                    <span className="font-mono font-bold text-sm text-neutral-900">
                      {formatPeso(viewingProduct.currentCost, db.settings.currencySymbol)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 font-semibold">Standard Markup %:</span>
                    <span className="font-mono font-semibold text-neutral-800">
                      {viewingProduct.markupPercent}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-neutral-200 pt-2">
                    <span className="text-[#8B0000] font-bold">Suggested Selling Price:</span>
                    <span className="font-mono font-extrabold text-base text-[#8B0000]">
                      {formatPeso(viewingProduct.sellingPrice, db.settings.currencySymbol)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-neutral-200 pt-2">
                    <span className="text-neutral-500 font-semibold">Current Warehouse Stock:</span>
                    <span className="font-mono font-bold text-neutral-900">
                      {viewingProduct.stock} {viewingProduct.unit}s (Min Alert: {viewingProduct.minStock})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 font-semibold">Total Stock Cost Valuation:</span>
                    <span className="font-mono font-bold text-neutral-900">
                      {formatPeso(
                        viewingProduct.stock * viewingProduct.currentCost,
                        db.settings.currencySymbol
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Historical Supplier Price Records for this Product */}
              <div>
                <h4 className="text-xs font-bold text-neutral-900 uppercase mb-2">
                  Supplier Price History for {viewingProduct.name}
                </h4>
                <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-100 border-b border-neutral-200 text-[11px] font-semibold text-neutral-600 uppercase">
                        <th className="py-2 px-3">Date Recorded</th>
                        <th className="py-2 px-3">Quotation Ref</th>
                        <th className="py-2 px-3">Supplier</th>
                        <th className="py-2 px-3 text-right">Previous Price</th>
                        <th className="py-2 px-3 text-right">Unit Cost</th>
                        <th className="py-2 px-3">VAT Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 text-xs">
                      {db.priceRecords
                        .filter(
                          (pr) =>
                            pr.productId === viewingProduct.id ||
                            pr.productName.toLowerCase() === viewingProduct.name.toLowerCase()
                        )
                        .map((pr) => (
                          <tr key={pr.id}>
                            <td className="py-2 px-3 font-mono text-neutral-600">
                              {formatDate(pr.dateRecorded)}
                            </td>
                            <td className="py-2 px-3 font-mono font-semibold text-[#8B0000]">
                              {pr.quotationNo}
                            </td>
                            <td className="py-2 px-3 font-medium text-neutral-900">
                              {pr.supplierName}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-neutral-500">
                              {pr.previousPrice
                                ? formatPeso(pr.previousPrice, db.settings.currencySymbol)
                                : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-neutral-900">
                              {formatPeso(pr.unitCost, db.settings.currencySymbol)}
                            </td>
                            <td className="py-2 px-3 text-neutral-700">{pr.vatStatus}</td>
                          </tr>
                        ))}
                      {db.priceRecords.filter(
                        (pr) =>
                          pr.productId === viewingProduct.id ||
                          pr.productName.toLowerCase() === viewingProduct.name.toLowerCase()
                      ).length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-neutral-500">
                            Initial master product record — no separate quotation price changes logged yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signature Footer inside Product Sheet */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t-2 border-neutral-300 text-xs">
                <div>
                  <div className="text-[10px] font-semibold text-neutral-500 uppercase mb-6">
                    Prepared By:
                  </div>
                  <div className="border-b border-neutral-800 pb-1 font-bold text-neutral-900">
                    Purchasing & Inventory Control
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-neutral-500 uppercase mb-6">
                    Verified By:
                  </div>
                  <div className="border-b border-neutral-800 pb-1 font-bold text-neutral-900">
                    Internal Audit Department
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-neutral-500 uppercase mb-6">
                    Approved By:
                  </div>
                  <div className="border-b border-neutral-800 pb-1 font-extrabold text-[#8B0000]">
                    BOSS YSHUA ACOGIDO
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
