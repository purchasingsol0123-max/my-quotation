import React, { useMemo, useState } from 'react';
import {
  ShieldAlert,
  Bell,
  Search,
  Download,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  SlidersHorizontal,
  Printer,
} from 'lucide-react';
import { AppDatabase, NavPage, SystemNotification } from '../types';
import {
  calculatePriceChange,
  exportToCSV,
  formatDate,
  formatPeso,
  getQuotationStatus,
  triggerSystemPrint,
} from '../utils';

interface AuditNotificationsViewProps {
  db: AppDatabase;
  mode: 'audit' | 'notifications';
  onNavigate: (page: NavPage) => void;
}

export const AuditNotificationsView: React.FC<AuditNotificationsViewProps> = ({
  db,
  mode,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  // Generate real-time Notification Center items (#31)
  const notifications = useMemo<SystemNotification[]>(() => {
    const list: SystemNotification[] = [];

    // 1. Out of Stock & Low Stock (#24, #31)
    db.products.forEach((p) => {
      if (p.stock <= 0) {
        list.push({
          id: `notif-out-${p.id}`,
          type: 'Out of Stock',
          title: `🔴 OUT OF STOCK: ${p.name}`,
          message: `Current stock is 0 ${p.unit} (Minimum required: ${p.minStock} ${p.unit}). Immediate Purchase Order required.`,
          date: p.updatedAt,
          isRead: false,
          linkPage: 'inventory',
        });
      } else if (p.stock <= p.minStock) {
        list.push({
          id: `notif-low-${p.id}`,
          type: 'Low Stock',
          title: `🟡 LOW STOCK ALERT: ${p.name}`,
          message: `Only ${p.stock} ${p.unit} remaining in ${p.location || 'Main Warehouse'} (Minimum threshold: ${p.minStock} ${p.unit}).`,
          date: p.updatedAt,
          isRead: false,
          linkPage: 'inventory',
        });
      }
    });

    // 2. Quotation Expiring & Expired (#11, #31)
    db.quotations.forEach((q) => {
      const st = getQuotationStatus(q.validUntil);
      if (st.status === 'Expiring Soon') {
        list.push({
          id: `notif-qexp-${q.id}`,
          type: 'Quotation Expiring',
          title: `🟡 QUOTATION EXPIRING SOON: ${q.quotationNo}`,
          message: `Supplier quotation from ${q.supplierName} expires on ${formatDate(q.validUntil)} (${st.daysRemaining} days left).`,
          date: q.quotationDate,
          isRead: false,
          linkPage: 'quotations',
        });
      } else if (st.status === 'Expired') {
        list.push({
          id: `notif-qold-${q.id}`,
          type: 'Quotation Expired',
          title: `🔴 QUOTATION EXPIRED: ${q.quotationNo}`,
          message: `Quotation from ${q.supplierName} expired on ${formatDate(q.validUntil)}. Request an updated RFQ.`,
          date: q.quotationDate,
          isRead: false,
          linkPage: 'quotations',
        });
      }
    });

    // 3. Pending Stock Adjustment Requests (#19, #31)
    db.stockAdjustments
      .filter((adj) => adj.status === 'Pending Approval')
      .forEach((adj) => {
        list.push({
          id: `notif-adj-${adj.id}`,
          type: 'Stock Adjustment Request',
          title: `🟡 PENDING STOCK ADJUSTMENT: ${adj.adjustmentNo}`,
          message: `${adj.requestedBy} requested adjustment for ${adj.productName} (Diff: ${adj.difference}) due to "${adj.reason}".`,
          date: adj.date,
          isRead: false,
          linkPage: 'adjustments',
        });
      });

    // 4. Price Increases & Decreases (#14, #31)
    db.priceHistory.slice(0, 8).forEach((ph) => {
      const ch = calculatePriceChange(ph.previousPrice, ph.costPrice);
      if (ch.direction === 'increase') {
        list.push({
          id: `notif-pi-${ph.id}`,
          type: 'Price Increased',
          title: `📈 PRICE INCREASED: ${ph.productName}`,
          message: `${ph.supplierName} cost changed from ${formatPeso(ph.previousPrice || 0)} to ${formatPeso(ph.costPrice)} (${ch.summaryText}).`,
          date: ph.dateRecorded,
          isRead: true,
          linkPage: 'history',
        });
      } else if (ch.direction === 'decrease') {
        list.push({
          id: `notif-pd-${ph.id}`,
          type: 'Price Decreased',
          title: `📉 PRICE DECREASED: ${ph.productName}`,
          message: `${ph.supplierName} reduced cost from ${formatPeso(ph.previousPrice || 0)} to ${formatPeso(ph.costPrice)} (${ch.summaryText}).`,
          date: ph.dateRecorded,
          isRead: true,
          linkPage: 'history',
        });
      }
    });

    return list;
  }, [db]);

  const filteredLogs = useMemo(() => {
    return db.auditLogs.filter((log) => {
      if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        log.user.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q) ||
        log.recordId.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
      );
    });
  }, [db.auditLogs, actionFilter, searchQuery]);

  if (mode === 'notifications') {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-neutral-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-[#8B0000]" />
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                Real-Time Notification & Alert Center ({notifications.length} Alerts)
              </h2>
              <p className="text-xs text-neutral-500">
                Automated monitoring for Low Stock, Out of Stock, Expiring Quotations, Pending Approvals, and Price Movements
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => triggerSystemPrint('System Alerts & Notification Report')}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer no-print"
          >
            <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Print Alerts Report</span>
          </button>
        </div>

        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#8B0000]/40 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-neutral-900">{n.title}</span>
                  <span className="text-[11px] font-mono text-neutral-400">· {n.date}</span>
                </div>
                <p className="text-xs text-neutral-600">{n.message}</p>
              </div>
              <button
                onClick={() => onNavigate(n.linkPage)}
                className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap self-start sm:self-auto cursor-pointer"
              >
                Inspect Module →
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Audit Log Header & Search Bar (#28) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit trail by user, action, module, record ID, details..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg font-medium"
          >
            <option value="ALL">All Audit Actions</option>
            <option value="Login">Login</option>
            <option value="Logout">Logout</option>
            <option value="Stock In">Stock In</option>
            <option value="Stock Out">Stock Out</option>
            <option value="Stock Adjustment">Stock Adjustment</option>
            <option value="Price Change">Price Change</option>
            <option value="Purchase Order">Purchase Order</option>
            <option value="Add">Add Record</option>
            <option value="Edit">Edit Record</option>
            <option value="Delete">Delete Record</option>
          </select>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            type="button"
            onClick={() => triggerSystemPrint('Immutable Security & Transaction Audit Trail')}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Print Audit Trail</span>
          </button>
          <button
            onClick={() => {
              const rows = filteredLogs.map((l) => ({
                Timestamp_Manila: l.timestamp,
                User: l.user,
                Role: l.role,
                Action: l.action,
                Module: l.module,
                Record_ID: l.recordId,
                Previous_Value: l.previousValue || '',
                New_Value: l.newValue || '',
                Details: l.details,
                IP_Address: l.ipAddress,
                Device: l.deviceInfo,
              }));
              exportToCSV('SOL_Security_Audit_Log.csv', rows);
            }}
            className="px-3.5 py-2 bg-[#8B0000] hover:bg-[#6E0000] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit Trail CSV</span>
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#8B0000]" />
          <h3 className="text-sm font-bold text-neutral-900">
            Immutable Security & Transaction Audit Trail ({filteredLogs.length} Events)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                <th className="py-3 px-4">Date & Time (Asia/Manila)</th>
                <th className="py-3 px-3">User & Role</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Module & Ref ID</th>
                <th className="py-3 px-3">Previous → New Value</th>
                <th className="py-3 px-4">Details & Session Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50">
                  <td className="py-3 px-4 font-mono text-neutral-600 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-neutral-900">{log.user}</div>
                    <div className="text-[10px] font-mono text-neutral-500">{log.role}</div>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-[#8B0000] whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-neutral-800">{log.module}</div>
                    <div className="text-[11px] font-mono text-neutral-500">{log.recordId}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px]">
                    {log.previousValue || log.newValue ? (
                      <span>
                        <span className="text-neutral-500">{log.previousValue || '—'}</span> →{' '}
                        <span className="font-bold text-emerald-700">{log.newValue || '—'}</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-neutral-900 font-medium">{log.details}</div>
                    <div className="text-[10px] font-mono text-neutral-400">
                      {log.ipAddress} · {log.deviceInfo}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
