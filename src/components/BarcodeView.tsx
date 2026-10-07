import React, { useEffect, useRef, useState } from 'react';
import {
  QrCode,
  Camera,
  Printer,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { AppDatabase, Product, StockTransaction, UserAccount } from '../types';
import { formatPeso, triggerSystemPrint } from '../utils';

interface BarcodeViewProps {
  db: AppDatabase;
  currentUser: UserAccount;
  onRecordStockIn: (tx: Omit<StockTransaction, 'id' | 'previousStock' | 'newStock'>) => void;
  onRecordStockOut: (
    tx: Omit<StockTransaction, 'id' | 'previousStock' | 'newStock'>,
    allowNegative: boolean
  ) => boolean;
}

export const BarcodeView: React.FC<BarcodeViewProps> = ({
  db,
  currentUser,
  onRecordStockIn,
  onRecordStockOut,
}) => {
  const [scanInput, setScanInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(db.products[0] || null);
  const [actionMode, setActionMode] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState<number>(10);
  const [counterparty, setCounterparty] = useState<string>('Main Warehouse Receiving');
  const [referenceNo, setReferenceNo] = useState<string>('SCAN-2026-001');

  // Camera Scanner State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Label Print Configuration (#23)
  const [labelCopies, setLabelCopies] = useState<number>(4);
  const [showPriceOnLabel, setShowPriceOnLabel] = useState<boolean>(true);

  const handleBarcodeLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const q = scanInput.trim().toLowerCase();
    if (!q) return;
    const found = db.products.find(
      (p) =>
        (p.barcode || '').toLowerCase() === q ||
        (p.sku || '').toLowerCase() === q ||
        (p.qrCode || '').toLowerCase() === q ||
        p.code.toLowerCase() === q ||
        p.name.toLowerCase().includes(q)
    );
    if (found) {
      setScannedProduct(found);
    }
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      setCameraError(
        'Camera permission unavailable in this browser frame. Use handheld USB/Bluetooth scanner input or quick-select product below.'
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleConfirmScannedTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedProduct) return;
    const today = new Date().toISOString().split('T')[0];

    if (actionMode === 'IN') {
      onRecordStockIn({
        transactionNo: referenceNo || `SI-SCAN-${Date.now().toString().slice(-4)}`,
        type: 'IN',
        date: today,
        productId: scannedProduct.id,
        productName: scannedProduct.name,
        sku: scannedProduct.sku || scannedProduct.code,
        barcode: scannedProduct.barcode || '',
        unit: scannedProduct.unit,
        quantity,
        unitCost: scannedProduct.currentCost,
        totalCost: Number((quantity * scannedProduct.currentCost).toFixed(2)),
        warehouse: scannedProduct.location || 'Main Warehouse',
        supplierId: scannedProduct.supplierId,
        supplierName: scannedProduct.supplierName,
        receivedBy: currentUser.name,
        remarks: `Barcode Scan Stock In (${counterparty})`,
      });
    } else {
      onRecordStockOut(
        {
          transactionNo: referenceNo || `DR-SCAN-${Date.now().toString().slice(-4)}`,
          type: 'OUT',
          date: today,
          productId: scannedProduct.id,
          productName: scannedProduct.name,
          sku: scannedProduct.sku || scannedProduct.code,
          barcode: scannedProduct.barcode || '',
          unit: scannedProduct.unit,
          quantity,
          unitCost: scannedProduct.averageCost || scannedProduct.currentCost,
          totalCost: Number(
            (quantity * (scannedProduct.averageCost || scannedProduct.currentCost)).toFixed(2)
          ),
          warehouse: scannedProduct.location || 'Main Warehouse',
          releasedTo: counterparty,
          clientOrDept: counterparty,
          drNumber: referenceNo,
          releasedBy: currentUser.name,
          approvedBy: currentUser.name,
          remarks: 'Barcode Scan Stock Out',
        },
        currentUser.role === 'SUPER ADMIN'
      );
    }
  };

  // Sync scannedProduct with latest db state
  const liveProduct =
    db.products.find((p) => p.id === scannedProduct?.id) || scannedProduct;

  // Deterministic SVG Barcode Bars generator
  const renderBarcodeBars = (codeStr: string) => {
    const clean = codeStr || '4800016100017';
    const bars: number[] = [];
    for (let i = 0; i < clean.length; i++) {
      const charCode = clean.charCodeAt(i);
      bars.push((charCode % 3) + 1);
      bars.push(((charCode >> 2) % 2) + 1);
    }
    return (
      <svg viewBox="0 0 180 48" className="w-full h-12">
        {bars.map((w, idx) => {
          const x = 8 + idx * 6;
          if (x > 170) return null;
          return (
            <rect
              key={idx}
              x={x}
              y={2}
              width={w * 1.4}
              height={34}
              fill="#000000"
            />
          );
        })}
        <text
          x="90"
          y="46"
          textAnchor="middle"
          fontSize="9"
          fontFamily="monospace"
          fontWeight="bold"
        >
          {clean}
        </text>
      </svg>
    );
  };

  // Deterministic SVG QR Matrix generator
  const renderQRCodeSvg = (qrStr: string) => {
    const seed = qrStr || 'SOL-QR';
    const cells: { r: number; c: number }[] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const isCorner =
          (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
        const charVal = seed.charCodeAt((r * 9 + c) % seed.length);
        if (isCorner || (charVal + r * c) % 2 === 0) {
          cells.push({ r, c });
        }
      }
    }
    return (
      <svg viewBox="0 0 90 90" className="w-16 h-16 border border-neutral-300 p-1 bg-white">
        {cells.map((cell, i) => (
          <rect
            key={i}
            x={cell.c * 10}
            y={cell.r * 10}
            width={9}
            height={9}
            fill="#111113"
          />
        ))}
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        {/* Left: Barcode / QR Scanner & Instant Stock Movement Terminal (#22) */}
        <div className="lg:col-span-6 bg-white border border-neutral-200 rounded-lg p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#8B0000]" />
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  Barcode & QR Scanner Terminal
                </h2>
                <p className="text-xs text-neutral-500">
                  Scan Barcode → Display Product → Choose Stock In / Stock Out → Confirm
                </p>
              </div>
            </div>

            {!cameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[#22d3ee]" />
                <span>Use Camera</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Stop Camera</span>
              </button>
            )}
          </div>

          {cameraActive && (
            <div className="bg-black rounded-lg overflow-hidden relative h-48 flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <div className="absolute inset-x-12 top-1/2 h-0.5 bg-[#22d3ee] shadow" />
            </div>
          )}

          {cameraError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
              {cameraError}
            </div>
          )}

          {/* Barcode Search Input */}
          <form onSubmit={handleBarcodeLookup} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan or type Barcode (e.g. 4800016100017), SKU (FC001), or QR..."
                className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#8B0000] hover:bg-[#6E0000] text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Find Item
            </button>
          </form>

          {/* Quick Select Product Chip Strip */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5">
              Or Quick-Select Product Barcode to Simulate Scan:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {db.products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setScannedProduct(p);
                    setScanInput(p.barcode || p.sku || p.code);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold border cursor-pointer ${
                    liveProduct?.id === p.id
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  {p.sku || p.code} ({p.stock})
                </button>
              ))}
            </div>
          </div>

          {/* Scanned Product Action Card */}
          {liveProduct && (
            <form
              onSubmit={handleConfirmScannedTransaction}
              className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-4 text-xs"
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-200">
                <div>
                  <div className="text-[11px] font-mono text-[#8B0000] font-bold">
                    SKU: {liveProduct.sku || liveProduct.code} · BARCODE: {liveProduct.barcode}
                  </div>
                  <h3 className="text-base font-extrabold text-neutral-900 mt-0.5">
                    {liveProduct.name}
                  </h3>
                  <div className="text-neutral-500">
                    {liveProduct.brand} · {liveProduct.location || 'Main Warehouse'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-neutral-500 uppercase">Current Stock</div>
                  <div className="text-2xl font-mono font-extrabold text-emerald-700">
                    {liveProduct.stock} <span className="text-xs">{liveProduct.unit}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActionMode('IN')}
                  className={`py-2.5 px-3 rounded-lg font-bold inline-flex items-center justify-center gap-1.5 border cursor-pointer ${
                    actionMode === 'IN'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-neutral-700 border-neutral-300'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>STOCK IN</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActionMode('OUT')}
                  className={`py-2.5 px-3 rounded-lg font-bold inline-flex items-center justify-center gap-1.5 border cursor-pointer ${
                    actionMode === 'OUT'
                      ? 'bg-amber-700 text-white border-amber-700'
                      : 'bg-white text-neutral-700 border-neutral-300'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>STOCK OUT</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Enter Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 font-mono font-bold bg-white border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Ref / DR / PO No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-white border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Department / Note
                  </label>
                  <input
                    type="text"
                    value={counterparty}
                    onChange={(e) => setCounterparty(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#8B0000] hover:bg-[#6E0000] text-white font-bold rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Confirm {actionMode === 'IN' ? 'Stock In' : 'Stock Out'} ({quantity}{' '}
                  {liveProduct.unit}) & Update Inventory
                </span>
              </button>
            </form>
          )}
        </div>

        {/* Right: Printable Barcode & QR Label Generator (#23) */}
        <div className="lg:col-span-6 bg-white border border-neutral-200 rounded-lg p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Barcode & QR Label Generator (#23)
              </h3>
              <p className="text-xs text-neutral-500">
                Generate and print multiple adhesive warehouse labels with Barcode & QR Code
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                triggerSystemPrint(
                  `Barcode & QR Labels - ${liveProduct?.name || 'Warehouse Labels'}`
                )
              }
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Print Labels</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs bg-neutral-50 p-3.5 rounded-lg border border-neutral-200">
            <div>
              <label className="font-semibold text-neutral-700 mr-2">Number of Labels:</label>
              <select
                value={labelCopies}
                onChange={(e) => setLabelCopies(Number(e.target.value))}
                className="px-2.5 py-1 bg-white border border-neutral-300 rounded font-mono"
              >
                <option value={1}>1 Label</option>
                <option value={2}>2 Labels</option>
                <option value={4}>4 Labels</option>
                <option value={6}>6 Labels</option>
                <option value={8}>8 Labels</option>
              </select>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-neutral-700">
              <input
                type="checkbox"
                checked={showPriceOnLabel}
                onChange={(e) => setShowPriceOnLabel(e.target.checked)}
              />
              <span>Show Selling Price on Label</span>
            </label>
          </div>

          {/* Preview Grid of Printable Labels */}
          {liveProduct && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: labelCopies }).map((_, idx) => (
                <div
                  key={idx}
                  className="border-2 border-dashed border-neutral-400 rounded-lg p-3.5 bg-white flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-neutral-200 pb-1.5">
                    <div>
                      <div className="text-[9px] font-extrabold tracking-wider text-[#8B0000] uppercase">
                        SOL CLEANING MATERIALS
                      </div>
                      <div className="text-xs font-extrabold text-neutral-900 leading-tight">
                        {liveProduct.name}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-600">
                        SKU: {liveProduct.sku || liveProduct.code} · {liveProduct.unit}
                      </div>
                    </div>
                    {showPriceOnLabel && (
                      <div className="text-right font-mono font-extrabold text-xs text-neutral-900 bg-amber-100 px-1.5 py-0.5 rounded">
                        {formatPeso(liveProduct.sellingPrice, db.settings.currencySymbol)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex-1">
                      {renderBarcodeBars(liveProduct.barcode || '4800016100017')}
                    </div>
                    <div className="shrink-0">
                      {renderQRCodeSvg(liveProduct.qrCode || liveProduct.code)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Print-Only Sheet when user clicks Print Labels */}
      {liveProduct && (
        <div className="hidden print-only">
          <div className="grid grid-cols-2 gap-4 p-4">
            {Array.from({ length: labelCopies }).map((_, idx) => (
              <div
                key={idx}
                className="border-2 border-black rounded p-4 flex flex-col justify-between space-y-2"
              >
                <div className="flex justify-between border-b border-black pb-1">
                  <div>
                    <div className="text-[10px] font-bold uppercase">
                      SOL CLEANING MATERIALS · BOSS YSHUA ACOGIDO
                    </div>
                    <div className="text-sm font-extrabold">{liveProduct.name}</div>
                    <div className="text-xs font-mono">
                      SKU: {liveProduct.sku || liveProduct.code} · Unit: {liveProduct.unit}
                    </div>
                  </div>
                  {showPriceOnLabel && (
                    <div className="font-mono font-bold text-sm">
                      {formatPeso(liveProduct.sellingPrice, db.settings.currencySymbol)}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    {renderBarcodeBars(liveProduct.barcode || '4800016100017')}
                  </div>
                  <div>{renderQRCodeSvg(liveProduct.qrCode || liveProduct.code)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
