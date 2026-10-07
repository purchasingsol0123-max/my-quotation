import { QuotationStatus, UserRole } from './types';

export function formatPeso(amount: number, currencySymbol = '₱'): string {
  const safeVal = Number.isFinite(amount) ? amount : 0;
  return `${currencySymbol}${safeVal.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getManilaTimestamp(): string {
  try {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date());
  } catch {
    return new Date().toLocaleString();
  }
}

// Asynchronous SHA-256 hashing + deterministic fallback so passwords are never stored in plain text
export function simpleHashPassword(password: string): string {
  let h1 = 0xdeadbeef ^ password.length;
  let h2 = 0x41c6ce57 ^ password.length;
  for (let i = 0, ch; i < password.length; i++) {
    ch = password.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    'sha256$' +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h1 >>> 0).toString(16).padStart(8, '0')
  );
}

// Role-Based Access Control (RBAC) Matrix (#4)
export function canPerformAction(
  role: UserRole,
  permission:
    | 'manage_users'
    | 'manage_settings'
    | 'view_audit'
    | 'manage_quotations'
    | 'delete_records'
    | 'manage_suppliers'
    | 'manage_products'
    | 'view_prices'
    | 'manage_prices'
    | 'manage_purchasing'
    | 'stock_in'
    | 'stock_out'
    | 'approve_adjustment'
    | 'request_adjustment'
    | 'backup_restore'
): boolean {
  if (role === 'SUPER ADMIN') return true;

  if (role === 'ADMIN') {
    if (permission === 'manage_users' || permission === 'manage_settings' || permission === 'backup_restore') {
      return false;
    }
    return true;
  }

  if (role === 'PURCHASING STAFF') {
    return [
      'manage_quotations',
      'manage_suppliers',
      'manage_products',
      'view_prices',
      'manage_prices',
      'manage_purchasing',
      'stock_in',
    ].includes(permission);
  }

  if (role === 'WAREHOUSE STAFF') {
    return ['stock_in', 'stock_out', 'request_adjustment'].includes(permission);
  }

  // VIEWER is strictly read-only
  if (role === 'VIEWER') {
    return permission === 'view_prices';
  }

  return false;
}

export function getQuotationStatus(validUntil: string): {
  status: QuotationStatus;
  daysRemaining: number;
  label: string;
} {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const validDate = new Date(validUntil + 'T00:00:00');
  const diffTime = validDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining > 7) {
    return {
      status: 'Active',
      daysRemaining,
      label: `🟢 ACTIVE (${daysRemaining}d left)`,
    };
  } else if (daysRemaining >= 1) {
    return {
      status: 'Expiring Soon',
      daysRemaining,
      label: `🟡 EXPIRING SOON (${daysRemaining}d left)`,
    };
  } else if (daysRemaining === 0) {
    return {
      status: 'Expiring Soon',
      daysRemaining: 0,
      label: '🟡 EXPIRING TODAY',
    };
  } else {
    return {
      status: 'Expired',
      daysRemaining,
      label: `🔴 EXPIRED (${Math.abs(daysRemaining)}d ago)`,
    };
  }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export function formatMonthYear(dateStr: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function calculatePriceChange(oldPrice?: number, newPrice?: number): {
  diff: number;
  percent: number;
  direction: 'increase' | 'decrease' | 'same';
  summaryText: string;
} {
  if (oldPrice === undefined || oldPrice === null || oldPrice <= 0 || newPrice === undefined) {
    return { diff: 0, percent: 0, direction: 'same', summaryText: 'Initial Record' };
  }
  const diff = newPrice - oldPrice;
  const percent = (diff / oldPrice) * 100;
  if (Math.abs(diff) < 0.005) {
    return { diff: 0, percent: 0, direction: 'same', summaryText: 'No Change (0.00%)' };
  }
  const sign = diff > 0 ? '+' : '-';
  const absDiff = Math.abs(diff).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const absPct = Math.abs(percent).toFixed(2);
  return {
    diff,
    percent,
    direction: diff > 0 ? 'increase' : 'decrease',
    summaryText: `${diff > 0 ? 'Price Increased' : 'Price Decreased'}: ${sign}₱${absDiff} (${sign}${absPct}%)`,
  };
}

function showInPagePrintSheet(title: string, innerHtml: string) {
  let overlay = document.getElementById('sol-universal-print-overlay');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'sol-universal-print-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.82);display:flex;flex-direction:column;align-items:center;padding:20px;overflow-y:auto;';

  const card = document.createElement('div');
  card.style.cssText =
    'background:#ffffff;color:#111827;width:100%;max-width:1050px;border-radius:12px;border:3px solid #D4AF37;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);padding:28px;margin-bottom:40px;';

  card.innerHTML = `
    <div class="no-print" style="background:#18191C;color:#ffffff;border:2px solid #D4AF37;border-radius:10px;padding:14px 18px;margin-bottom:22px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;">
      <div>
        <div style="font-size:13px;font-weight:800;color:#D4AF37;text-transform:uppercase;">🖨️ DIRECT PRINTER READY — ${title}</div>
        <div style="font-size:11px;color:#e5e7eb;margin-top:2px;">System Printer Triggered! Click <strong>"Print Now"</strong> or press <strong>Ctrl + P</strong> (Windows) / <strong>Cmd + P</strong> (Mac) to print immediately.</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button id="sol-overlay-print-now" type="button" style="background:#D4AF37;color:#000000;border:none;padding:9px 18px;border-radius:8px;font-weight:800;font-size:12px;cursor:pointer;">🖨️ Print Now (Ctrl+P)</button>
        <button id="sol-overlay-download-html" type="button" style="background:#8B0000;color:#ffffff;border:none;padding:9px 14px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;">⬇ Download Printable File</button>
        <button id="sol-overlay-close" type="button" style="background:rgba(255,255,255,0.15);color:#ffffff;border:none;padding:9px 14px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;">✕ Close</button>
      </div>
    </div>
    <div id="sol-printable-sheet-body">${innerHtml}</div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const triggerIframeAndWindowPrint = () => {
    try {
      let iframe = document.getElementById('sol-direct-print-frame') as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'sol-direct-print-frame';
        iframe.style.cssText =
          'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);
      }
      const doc = iframe.contentWindow?.document;
      if (doc && iframe.contentWindow) {
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map((el) => el.outerHTML)
          .join('\n');
        doc.open();
        doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>${styles}
          <style>
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { background:#fff !important; color:#111827 !important; padding:20px; font-family:sans-serif; font-size:12px; }
            .no-print { display:none !important; }
            table { width:100%; border-collapse:collapse; margin-top:8px; font-size:11px; }
            th { background:#f3f4f6; color:#374151; text-transform:uppercase; font-size:10px; padding:8px; border:1px solid #d1d5db; text-align:left; }
            td { padding:8px; border:1px solid #e5e7eb; }
            .text-right { text-align:right; font-family:monospace; }
          </style>
        </head><body>${innerHtml}</body></html>`);
        doc.close();
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    } catch {
      // ignore
    }
    try {
      window.focus();
      window.print();
    } catch {
      // ignore
    }
  };

  document.getElementById('sol-overlay-print-now')?.addEventListener('click', () => {
    triggerIframeAndWindowPrint();
  });

  document.getElementById('sol-overlay-download-html')?.addEventListener('click', () => {
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');
    const standalone = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>${styles}
      <style>
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { background:#fff; color:#111827; padding:28px; font-family:sans-serif; font-size:12px; }
        table { width:100%; border-collapse:collapse; margin-top:8px; font-size:11px; }
        th { background:#f3f4f6; padding:8px; border:1px solid #d1d5db; text-align:left; }
        td { padding:8px; border:1px solid #e5e7eb; }
      </style>
    </head><body onload="window.print()">${innerHtml}</body></html>`;
    const blob = new Blob([standalone], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  document.getElementById('sol-overlay-close')?.addEventListener('click', () => {
    overlay?.remove();
  });

  triggerIframeAndWindowPrint();
}

export function triggerSystemPrint(sectionTitle?: string) {
  window.dispatchEvent(
    new CustomEvent('sol-open-print-preview', {
      detail: { sectionTitle },
    })
  );

  const mainEl = document.querySelector('main');
  if (mainEl) {
    const activeModalCard = mainEl.querySelector('.fixed.inset-0 > div') as HTMLElement | null;
    const sourceNode = activeModalCard || mainEl;
    const clone = sourceNode.cloneNode(true) as HTMLElement;

    // Copy live input, textarea, and select values so forms and calculators print their exact active numbers
    const origInputs = sourceNode.querySelectorAll('input, textarea');
    const cloneInputs = clone.querySelectorAll('input, textarea');
    origInputs.forEach((orig, idx) => {
      const target = cloneInputs[idx] as HTMLInputElement | HTMLTextAreaElement | undefined;
      if (!target) return;
      if (orig instanceof HTMLInputElement && (orig.type === 'checkbox' || orig.type === 'radio')) {
        if (orig.checked) target.setAttribute('checked', 'checked');
        else target.removeAttribute('checked');
      } else {
        target.setAttribute('value', (orig as HTMLInputElement).value);
        target.textContent = (orig as HTMLInputElement).value;
      }
    });

    const origSelects = sourceNode.querySelectorAll('select');
    const cloneSelects = clone.querySelectorAll('select');
    origSelects.forEach((orig, idx) => {
      const target = cloneSelects[idx] as HTMLSelectElement | undefined;
      if (!target) return;
      Array.from(target.options).forEach((opt) => {
        if (opt.value === orig.value) opt.setAttribute('selected', 'selected');
        else opt.removeAttribute('selected');
      });
    });

    clone.querySelectorAll('.no-print, [data-sol-print-ignore="true"]').forEach((el) => el.remove());
    clone.querySelectorAll('.hidden.print-only, .print-only').forEach((el) => {
      el.classList.remove('hidden');
      (el as HTMLElement).style.display = 'block';
    });

    const titleText = sectionTitle || 'SOL Cleaning Materials — Official Printout';
    const stamp = getManilaTimestamp();

    const fullBodyHtml = `
      ${
        !activeModalCard
          ? `<div style="border-bottom:2px solid #8B0000;padding-bottom:12px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
              <div>
                <div style="font-size:14px;font-weight:800;color:#8B0000;text-transform:uppercase;">SOL MANPOWER SERVICES INC. / SOL Cleaning Materials</div>
                <div style="font-size:18px;font-weight:800;color:#111827;margin:2px 0;">${titleText.toUpperCase()} — OFFICIAL SHEET</div>
                <div style="font-size:11px;font-weight:800;color:#8B0000;text-transform:uppercase;">Properties of BOSS YSHUA ACOGIDO</div>
              </div>
              <div style="text-align:right;font-family:monospace;font-size:11px;">
                <div><strong>Date Printed:</strong> ${stamp}</div>
                <div><strong>System:</strong> Internal Enterprise Management</div>
              </div>
            </div>`
          : ''
      }
      <div>${clone.innerHTML}</div>
      ${
        !activeModalCard
          ? `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:32px;padding-top:16px;border-top:2px solid #d1d5db;font-size:11px;">
              <div>
                <div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;margin-bottom:26px;">Prepared / Printed By:</div>
                <div style="border-bottom:1px solid #111827;padding-bottom:4px;font-weight:700;">Purchasing & Warehouse Operations</div>
              </div>
              <div>
                <div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;margin-bottom:26px;">Verified & Audited By:</div>
                <div style="border-bottom:1px solid #111827;padding-bottom:4px;font-weight:700;">Internal Audit & Cost Control</div>
              </div>
              <div>
                <div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;margin-bottom:26px;">Noted & Approved By:</div>
                <div style="border-bottom:1px solid #8B0000;padding-bottom:4px;font-weight:800;color:#8B0000;">BOSS YSHUA ACOGIDO</div>
              </div>
            </div>`
          : ''
      }
    `;

    showInPagePrintSheet(titleText, fullBodyHtml);
  }
}

export function directPrintHtml(title: string, bodyHtml: string) {
  const styledBody = `
    <style>
      .header { border-bottom: 2px solid #8B0000; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
      .company { font-size: 14px; font-weight: 800; color: #8B0000; text-transform: uppercase; letter-spacing: 0.04em; }
      .doc-title { font-size: 18px; font-weight: 800; color: #111827; margin: 4px 0; }
      .owner { font-size: 11px; font-weight: 800; color: #8B0000; text-transform: uppercase; letter-spacing: 0.06em; }
      .meta { text-align: right; font-family: monospace; font-size: 11px; line-height: 1.5; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
      .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
      .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #e5e7eb; }
      .row:last-child { border-bottom: none; }
      .label { color: #6b7280; font-weight: 600; }
      .val { font-weight: 700; color: #111827; text-align: right; }
      .val-red { font-weight: 800; color: #8B0000; font-size: 14px; text-align: right; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
      th { background: #f3f4f6; color: #374151; text-transform: uppercase; font-size: 10px; padding: 8px; border: 1px solid #d1d5db; text-align: left; }
      td { padding: 8px; border: 1px solid #e5e7eb; }
      .text-right { text-align: right; font-family: monospace; }
      .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 36px; padding-top: 16px; border-top: 2px solid #d1d5db; }
      .sig-label { font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 28px; }
      .sig-line { border-bottom: 1px solid #111827; padding-bottom: 4px; font-weight: 700; }
      .sig-owner { border-bottom: 1px solid #8B0000; padding-bottom: 4px; font-weight: 800; color: #8B0000; }
    </style>
    ${bodyHtml}
  `;
  showInPagePrintSheet(title, styledBody);
}

export function exportToCSV(filename: string, rows: Record<string, string | number | boolean | undefined>[]) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((fieldName) => {
          const val = row[fieldName] ?? '';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
