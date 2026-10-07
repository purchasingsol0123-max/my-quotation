import JSZip from 'jszip';
import { AppDatabase } from './types';
import { getManilaTimestamp } from './utils';

// Bundle all project source files using Vite's import.meta.glob raw loader
const rootSourceFiles = import.meta.glob(
  [
    '/package.json',
    '/tsconfig.json',
    '/vite.config.ts',
    '/index.html',
    '/metadata.json',
    '/src/**/*.{ts,tsx,css,json}',
  ],
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>;

function toCsvString(rows: Record<string, string | number | boolean | undefined>[]): string {
  if (!rows || rows.length === 0) return 'No records\n';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] === undefined || row[h] === null ? '' : String(row[h]);
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ];
  return '\uFEFF' + lines.join('\n');
}

export async function generateCompleteFolderZipBlob(db: AppDatabase): Promise<{
  blob: Blob;
  fileName: string;
}> {
  const zip = new JSZip();
  const dateStamp = new Date().toISOString().split('T')[0];
  const rootFolder = zip.folder(`SOL_CLEANING_MATERIALS_COMPLETE_PACKAGE_${dateStamp}`);

  if (!rootFolder) {
    throw new Error('Failed to initialize ZIP folder');
  }

  // 1. Subfolder: 01_Database_Backups_JSON
  const dbFolder = rootFolder.folder('01_Database_Backups_JSON');
  if (dbFolder) {
    dbFolder.file(
      `SOL_Full_Database_Backup_${dateStamp}.json`,
      JSON.stringify(db, null, 2)
    );
    dbFolder.file(
      '01_Quotations_Records.json',
      JSON.stringify(db.quotations, null, 2)
    );
    dbFolder.file(
      '02_Suppliers_Directory.json',
      JSON.stringify(db.suppliers, null, 2)
    );
    dbFolder.file(
      '03_Products_Master_Catalog.json',
      JSON.stringify(db.products, null, 2)
    );
    dbFolder.file(
      '04_Historical_Price_List.json',
      JSON.stringify(db.priceHistory, null, 2)
    );
    dbFolder.file(
      '05_Warehouse_Stock_Transactions.json',
      JSON.stringify(db.stockTransactions, null, 2)
    );
    dbFolder.file(
      '06_Stock_Adjustments.json',
      JSON.stringify(db.stockAdjustments, null, 2)
    );
    dbFolder.file(
      '07_Purchase_Orders.json',
      JSON.stringify(db.purchaseOrders, null, 2)
    );
    dbFolder.file(
      '08_RFQ_Records.json',
      JSON.stringify(db.rfqs, null, 2)
    );
    dbFolder.file(
      '09_Audit_Logs_Trail.json',
      JSON.stringify(db.auditLogs, null, 2)
    );
  }

  // 2. Subfolder: 02_Excel_CSV_Reports
  const csvFolder = rootFolder.folder('02_Excel_CSV_Reports');
  if (csvFolder) {
    // Quotations CSV
    csvFolder.file(
      '01_Quotations_Summary.csv',
      toCsvString(
        db.quotations.map((q) => ({
          Quotation_No: q.quotationNo,
          Supplier: q.supplierName,
          Contact_Person: q.contactPerson,
          Contact_Number: q.contactNumber,
          Email: q.email,
          Quotation_Date: q.quotationDate,
          Valid_Until: q.validUntil,
          VAT_Status: q.vatStatus,
          Payment_Terms: q.paymentTerms,
          Delivery_Terms: q.deliveryTerms,
          Items_Count: q.items.length,
          Subtotal_PHP: q.subtotal,
          VAT_PHP: q.vatAmount,
          Grand_Total_PHP: q.grandTotal,
          Remarks: q.remarks,
        }))
      )
    );

    // Suppliers CSV
    csvFolder.file(
      '02_Suppliers_Directory.csv',
      toCsvString(
        db.suppliers.map((s) => ({
          Supplier_ID: s.id,
          Supplier_Name: s.name,
          Contact_Person: s.contactPerson,
          Contact_Number: s.contactNumber,
          Email: s.email,
          Address: s.address,
          VAT_Status: s.vatStatus,
          Payment_Terms: s.paymentTerms,
          Delivery_Terms: s.deliveryTerms,
          Rating: s.rating,
          Categories: s.categories.join(' | '),
          Remarks: s.remarks,
        }))
      )
    );

    // Products CSV
    csvFolder.file(
      '03_Products_Master_Catalog.csv',
      toCsvString(
        db.products.map((p) => ({
          Product_Code: p.code,
          SKU: p.sku || p.code,
          Barcode: p.barcode || '',
          Product_Name: p.name,
          Category: p.category,
          Subcategory: p.subcategory,
          Brand: p.brand,
          Specification: p.specification,
          Size: p.size,
          Unit: p.unit,
          Primary_Supplier: p.supplierName,
          Current_Cost_PHP: p.currentCost,
          Average_Cost_PHP: p.averageCost || p.currentCost,
          Markup_Percent: p.markupPercent,
          Selling_Price_PHP: p.sellingPrice,
          Current_Stock: p.stock,
          Min_Stock: p.minStock,
          Location: p.location || 'Main Warehouse',
          Favorite: p.isFavorite ? 'Yes' : 'No',
          Updated_At: p.updatedAt,
        }))
      )
    );

    // Price History CSV
    csvFolder.file(
      '04_Price_List_And_History.csv',
      toCsvString(
        db.priceHistory.map((ph) => ({
          Record_ID: ph.id,
          Product_Name: ph.productName,
          Category: ph.category,
          Brand: ph.brand,
          Specification: ph.specification,
          Size: ph.size,
          Unit: ph.unit,
          Supplier: ph.supplierName,
          Cost_Price_PHP: ph.costPrice,
          Previous_Price_PHP: ph.previousPrice ?? '',
          Markup_Percent: ph.markupPercent,
          Selling_Price_PHP: ph.sellingPrice,
          Quotation_No: ph.quotationNo || '',
          Date_Recorded: ph.dateRecorded,
          Valid_Until: ph.validUntil || '',
        }))
      )
    );

    // Warehouse Stock Transactions CSV
    csvFolder.file(
      '05_Warehouse_Stock_Movements.csv',
      toCsvString(
        db.stockTransactions.map((t) => ({
          Transaction_No: t.transactionNo,
          Type: t.type,
          Date: t.date,
          Product_Name: t.productName,
          SKU: t.sku,
          Barcode: t.barcode,
          Previous_Stock: t.previousStock,
          Quantity: t.quantity,
          New_Stock: t.newStock,
          Unit: t.unit,
          Unit_Cost_PHP: t.unitCost,
          Total_Cost_PHP: t.totalCost,
          Warehouse: t.warehouse,
          Supplier_Or_ReleasedTo: t.type === 'IN' ? t.supplierName : t.releasedTo,
          Remarks: t.remarks,
        }))
      )
    );

    // Purchase Orders CSV
    csvFolder.file(
      '06_Purchase_Orders.csv',
      toCsvString(
        db.purchaseOrders.map((po) => ({
          PO_Number: po.poNumber,
          Quotation_No: po.quotationNo || '',
          Supplier: po.supplierName,
          Order_Date: po.date,
          Expected_Delivery: po.expectedDeliveryDate,
          Status: po.status,
          Warehouse: po.warehouse,
          Items_Count: po.items.length,
          Total_Amount_PHP: po.totalAmount,
          Prepared_By: po.preparedBy,
          Approved_By: po.approvedBy,
        }))
      )
    );

    // Audit Logs CSV
    csvFolder.file(
      '07_System_Audit_Logs.csv',
      toCsvString(
        db.auditLogs.map((a) => ({
          Timestamp: a.timestamp,
          User: a.user,
          Role: a.role,
          Action: a.action,
          Module: a.module,
          Record_ID: a.recordId,
          Details: a.details,
          Previous_Value: a.previousValue || '',
          New_Value: a.newValue || '',
        }))
      )
    );
  }

  // 3. Subfolder: 03_Source_Code_Project_Files
  const codeFolder = rootFolder.folder('03_Source_Code_Project_Files');
  if (codeFolder) {
    Object.entries(rootSourceFiles).forEach(([filePath, content]) => {
      const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
      codeFolder.file(cleanPath, content);
    });
  }

  // 4. Root README Manifesto
  rootFolder.file(
    'README_SOL_CLEANING_MATERIALS.txt',
    [
      '=========================================================================',
      'SOL MANPOWER SERVICES INC. / SOL CLEANING MATERIALS',
      'COMPLETE SYSTEM SOURCE CODE & DATABASE PACKAGE',
      'PROPERTIES OF BOSS YSHUA ACOGIDO',
      '=========================================================================',
      `Generated Date/Time: ${getManilaTimestamp()} (Asia/Manila)`,
      '',
      'FOLDER CONTENTS:',
      '1. 01_Database_Backups_JSON/ -> Full JSON backup & modular JSON tables',
      '2. 02_Excel_CSV_Reports/     -> Ready-to-open Excel/CSV spreadsheets for:',
      '   - Quotations Summary',
      '   - Suppliers Directory',
      '   - Products Master Catalog',
      '   - Price List & Historical Prices',
      '   - Warehouse Stock Movements (Stock In / Out)',
      '   - Purchase Orders',
      '   - System Audit Logs',
      '3. 03_Source_Code_Project_Files/ -> Complete application source code:',
      '   - package.json, index.html, vite.config.ts, tsconfig.json',
      '   - src/App.tsx, src/types.ts, src/utils.ts, src/initialData.ts',
      '   - src/components/* (All 19 modules)',
      '',
      'HOW TO RUN SOURCE CODE LOCALLY:',
      '1. Extract 03_Source_Code_Project_Files to a folder on your computer.',
      '2. Run: npm install',
      '3. Run: npm run dev',
      '=========================================================================',
    ].join('\n')
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const fileName = `SOL_CLEANING_MATERIALS_COMPLETE_FOLDER_${dateStamp}.zip`;
  return { blob, fileName };
}

export async function downloadAllFilesAsFolderZip(db: AppDatabase): Promise<void> {
  const { blob, fileName } = await generateCompleteFolderZipBlob(db);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

