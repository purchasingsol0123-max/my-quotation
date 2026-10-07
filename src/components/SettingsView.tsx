import React, { useState } from 'react';
import {
  Save,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Database,
  Building2,
  CheckCircle2,
  Printer,
  FolderDown,
} from 'lucide-react';
import { AppDatabase, AppSettings } from '../types';
import { exportToCSV, triggerSystemPrint } from '../utils';
import { downloadAllFilesAsFolderZip } from '../downloadPackage';

interface SettingsViewProps {
  db: AppDatabase;
  onUpdateSettings: (settings: AppSettings) => void;
  onRestoreDatabase: (newDb: AppDatabase) => void;
  onResetToDefaultDemo: () => void;
  onPurgeDemoData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  db,
  onUpdateSettings,
  onRestoreDatabase,
  onResetToDefaultDemo,
  onPurgeDemoData,
}) => {
  const [formState, setFormState] = useState<AppSettings>({ ...db.settings });
  const [importError, setImportError] = useState('');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formState);
  };

  // Backup full database as JSON
  const handleBackupJSON = () => {
    const jsonString = JSON.stringify(db, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `SOL_Cleaning_Materials_Backup_${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Restore / Import JSON Backup
  const handleRestoreJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || '{}'));
        if (
          parsed &&
          Array.isArray(parsed.quotations) &&
          Array.isArray(parsed.suppliers) &&
          Array.isArray(parsed.products) &&
          Array.isArray(parsed.priceHistory)
        ) {
          setImportError('');
          onRestoreDatabase(parsed as AppDatabase);
        } else {
          setImportError(
            'Invalid backup file structure. Please upload a valid SOL Cleaning Materials JSON backup file.'
          );
        }
      } catch {
        setImportError('Failed to parse JSON file. Ensure the file is valid JSON.');
      }
    };
    reader.readAsText(file);
  };

  // Export Complete Price List CSV
  const handleExportAllCSV = () => {
    const rows = db.priceHistory.map((r) => ({
      Record_ID: r.id,
      Product_Name: r.productName,
      Category: r.category,
      Brand: r.brand,
      Specification: r.specification,
      Size: r.size,
      Unit: r.unit,
      Supplier: r.supplierName,
      Cost_Price_PHP: r.costPrice,
      Previous_Price_PHP: r.previousPrice ?? '',
      Markup_Percent: r.markupPercent,
      Selling_Price_PHP: r.sellingPrice,
      Quotation_No: r.quotationNo ?? '',
      Date_Recorded: r.dateRecorded,
      Valid_Until: r.validUntil ?? '',
    }));
    exportToCSV('SOL_Complete_PriceHistory_Export.csv', rows);
  };

  const demoCount =
    db.quotations.filter((q) => q.isDemo).length +
    db.suppliers.filter((s) => s.isDemo).length +
    db.products.filter((p) => p.isDemo).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Company & System Defaults Configuration (#17) */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 mb-5 border-b border-neutral-200">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-[#8B0000]" />
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  Corporate Profile & Default Calculation Settings
                </h2>
                <p className="text-xs text-neutral-500">
                  Configure company details, default VAT %, default markup %, currency, and quotation validity
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => triggerSystemPrint('Corporate Profile & System Settings Sheet')}
              className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer no-print"
            >
              <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Print Settings Sheet</span>
            </button>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-neutral-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formState.companyName}
                  onChange={(e) =>
                    setFormState({ ...formState, companyName: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-neutral-700 mb-1">
                  Company Address
                </label>
                <input
                  type="text"
                  value={formState.companyAddress}
                  onChange={(e) =>
                    setFormState({ ...formState, companyAddress: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={formState.contactNumber}
                  onChange={(e) =>
                    setFormState({ ...formState, contactNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Corporate Email
                </label>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Default Markup %
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formState.defaultMarkupPercent}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      defaultMarkupPercent: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 font-mono font-bold bg-neutral-50 border border-neutral-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Default VAT % (Default: 12%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formState.defaultVatPercent}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      defaultVatPercent: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 font-mono font-bold bg-neutral-50 border border-neutral-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Default Currency (PHP / ₱)
                </label>
                <select
                  value={formState.currencySymbol}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      currencySymbol: e.target.value,
                      currencyCode: e.target.value === '₱' ? 'PHP' : 'USD',
                    })
                  }
                  className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                >
                  <option value="₱">PHP / ₱ (Philippine Peso)</option>
                  <option value="$">USD / $</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Default Quotation Validity (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formState.defaultValidityDays}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      defaultValidityDays: parseInt(e.target.value, 10) || 30,
                    })
                  }
                  className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Administrator Name
                </label>
                <input
                  type="text"
                  value={formState.userName}
                  onChange={(e) => setFormState({ ...formState, userName: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Administrator Role / Title
                </label>
                <input
                  type="text"
                  value={formState.userRole}
                  onChange={(e) => setFormState({ ...formState, userRole: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#8B0000] hover:bg-[#6E0000] text-white font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Admin Settings</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Offline LocalStorage Data Storage, Backup, Restore & Demo Data Control (#16 & #20) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-200">
              <Database className="w-5 h-5 text-[#8B0000]" />
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  LocalStorage Data Backup & Restore
                </h3>
                <p className="text-xs text-neutral-500">
                  All records persist offline in your browser LocalStorage across sessions
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Offline LocalStorage Active</div>
                <div className="text-[11px] text-emerald-800 mt-0.5">
                  Currently storing {db.quotations.length} quotations, {db.suppliers.length}{' '}
                  suppliers, {db.products.length} products, and {db.priceHistory.length} historical
                  price records.
                </div>
              </div>
            </div>

            {importError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {importError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <button
                type="button"
                onClick={handleBackupJSON}
                className="p-3 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#D4AF37]" />
                <span>Backup Data (JSON)</span>
              </button>

              <label className="p-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-300 font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4 text-[#8B0000]" />
                <span>Restore Data (JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreJSON}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => downloadAllFilesAsFolderZip(db)}
                className="p-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-lg flex items-center justify-center gap-2 cursor-pointer sm:col-span-2 shadow-sm"
              >
                <FolderDown className="w-4 h-4 text-white" />
                <span>Download All System Files, Source Code & CSVs in Folder (.ZIP)</span>
              </button>

              <button
                type="button"
                onClick={handleExportAllCSV}
                className="p-3 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer sm:col-span-2"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>Export Complete Price History (CSV / Excel)</span>
              </button>
            </div>
          </div>

          {/* Sample / Demo Data Management (#20) */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">
              Sample DEMO DATA Management
            </h3>
            <p className="text-xs text-neutral-500">
              Sample records are labeled as <span className="font-mono font-bold">DEMO DATA</span>{' '}
              so you can inspect the system immediately or purge them when ready for live deployment.
            </p>

            <div className="flex flex-col gap-2.5 text-xs">
              {demoCount > 0 && (
                <button
                  type="button"
                  onClick={onPurgeDemoData}
                  className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete All Labeled DEMO DATA Records</span>
                </button>
              )}

              <button
                type="button"
                onClick={onResetToDefaultDemo}
                className="w-full py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 font-semibold rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset System to Default Sample Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
