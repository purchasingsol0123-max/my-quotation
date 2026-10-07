import React, { useEffect, useState } from 'react';
import { Printer, X, CheckCircle2, Eye } from 'lucide-react';
import { SmsiLogo } from './SmsiLogo';
import { getManilaTimestamp, triggerSystemPrint } from '../utils';

interface PrintSectionBarProps {
  title: string;
  subtitle?: string;
  companyName?: string;
  printedBy?: string;
  recordCountLabel?: string;
  isPrintPreviewMode: boolean;
  onTogglePrintPreview: (val: boolean) => void;
}

export const PrintSectionBar: React.FC<PrintSectionBarProps> = ({
  title,
  subtitle,
  companyName = 'SOL MANPOWER SERVICES INC. / SOL Cleaning Materials',
  printedBy = 'Boss Yshua Acogido',
  recordCountLabel,
  isPrintPreviewMode,
  onTogglePrintPreview,
}) => {
  const [printStatusMsg, setPrintStatusMsg] = useState('');

  useEffect(() => {
    const handler = () => {
      onTogglePrintPreview(true);
      setPrintStatusMsg(
        'Direct Printer Dialog Triggered! You can also click "Send to Printer" below anytime.'
      );
    };

    window.addEventListener('sol-open-print-preview', handler);
    return () => window.removeEventListener('sol-open-print-preview', handler);
  }, [onTogglePrintPreview]);

  const handleOpenPrint = () => {
    onTogglePrintPreview(true);
    triggerSystemPrint(title);
  };

  return (
    <>
      {/* Interactive Printing Section Bar (Visible on Screen across every layer) */}
      <div className="bg-white border border-neutral-200 rounded-lg px-4 py-3 mb-5 flex flex-wrap items-center justify-between gap-3 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#8B0000]/10 border border-[#8B0000]/20 flex items-center justify-center shrink-0">
            <Printer className="w-4 h-4 text-[#8B0000]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#D4AF37]/25 text-neutral-900 border border-[#D4AF37]/50">
                OFFICIAL PRINT MODULE
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
                {title} — Printable Sheet
              </h3>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {subtitle ||
                'Includes SMSI Corporate Letterhead, Properties of BOSS YSHUA ACOGIDO, and Signature Blocks.'}
              {recordCountLabel ? ` · ${recordCountLabel}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenPrint}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-lg inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Print {title}</span>
          </button>

          <button
            type="button"
            onClick={() => onTogglePrintPreview(!isPrintPreviewMode)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
              isPrintPreviewMode
                ? 'bg-[#8B0000] text-white border-[#8B0000]'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isPrintPreviewMode ? 'Exit Print Sheet View' : 'Open Print Sheet View'}</span>
          </button>
        </div>
      </div>

      {/* Active Print Preview Control Banner when Print Mode is Open */}
      {isPrintPreviewMode && (
        <div className="bg-[#18191C] text-white border-2 border-[#D4AF37] rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-xl no-print">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0" />
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">
                OFFICIAL PRINT PREVIEW SHEET — {title.toUpperCase()}
              </div>
              <div className="text-[11px] text-neutral-300 mt-0.5">
                {printStatusMsg ||
                  'Formal corporate letterhead and signature blocks are now visible below. Click "Send to Printer" or press Ctrl+P (Windows) / Cmd+P (Mac).'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => triggerSystemPrint(title)}
              className="px-4 py-2 bg-[#D4AF37] hover:bg-[#c59f2d] text-black text-xs font-extrabold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Send to Printer (Ctrl+P)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onTogglePrintPreview(false);
                setPrintStatusMsg('');
              }}
              className="px-3 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Close Preview</span>
            </button>
          </div>
        </div>
      )}

      {/* Formal Printable Corporate Letterhead (Visible when Printing OR when Print Preview Mode is active) */}
      <div className={`${isPrintPreviewMode ? 'block bg-white p-6 rounded-t-xl border-x border-t border-neutral-300' : 'hidden'} print-only mb-6`}>
        <div className="border-b-2 border-[#8B0000] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <SmsiLogo className="h-12 w-auto shrink-0" />
            <div>
              <div className="text-sm font-extrabold tracking-tight text-[#8B0000] uppercase">
                {companyName}
              </div>
              <div className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider">
                PROPERTIES OF BOSS YSHUA ACOGIDO
              </div>
              <div className="text-[10px] text-neutral-600">
                Internal Quotation, Supplier, Price List, Inventory, Barcode & Audit Management System
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right font-mono text-[10px] text-neutral-700">
            <div className="text-xs font-extrabold text-neutral-900 uppercase">
              {title.toUpperCase()} OFFICIAL SHEET
            </div>
            <div>Date Printed: {getManilaTimestamp()}</div>
            <div>Printed By: {printedBy}</div>
          </div>
        </div>
      </div>
    </>
  );
};

export const PrintFooterSignatures: React.FC<{
  printedBy?: string;
  isPrintPreviewMode?: boolean;
}> = ({ printedBy = 'Boss Yshua Acogido', isPrintPreviewMode = false }) => {
  return (
    <div
      className={`${
        isPrintPreviewMode
          ? 'block bg-white p-6 rounded-b-xl border-x border-b border-neutral-300'
          : 'hidden'
      } print-only mt-10 pt-6 border-t-2 border-neutral-300 text-xs`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-4">
        <div>
          <div className="text-[10px] font-semibold text-neutral-500 uppercase mb-7">
            Prepared / Printed By:
          </div>
          <div className="border-b border-neutral-800 pb-1 font-bold text-neutral-900">
            {printedBy}
          </div>
          <div className="text-[10px] text-neutral-600 mt-1">
            Purchasing / Warehouse Operations
          </div>
        </div>

        <div>
          <div className="text-[10px] font-semibold text-neutral-500 uppercase mb-7">
            Verified & Audited By:
          </div>
          <div className="border-b border-neutral-800 pb-1 font-bold text-neutral-900">
            Internal Audit & Cost Control
          </div>
          <div className="text-[10px] text-neutral-600 mt-1">
            SOL Manpower Services Inc.
          </div>
        </div>

        <div>
          <div className="text-[10px] font-semibold text-neutral-500 uppercase mb-7">
            Noted & Approved By:
          </div>
          <div className="border-b border-neutral-800 pb-1 font-extrabold text-[#8B0000]">
            BOSS YSHUA ACOGIDO
          </div>
          <div className="text-[10px] font-semibold text-neutral-700 mt-1">
            Executive Owner · Properties of Boss Yshua Acogido
          </div>
        </div>
      </div>
    </div>
  );
};
