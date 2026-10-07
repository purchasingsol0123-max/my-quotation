import React, { useState } from 'react';
import {
  Shield,
  UserPlus,
  Edit3,
  KeyRound,
  Lock,
  Unlock,
  CheckCircle2,
  X,
  Printer,
} from 'lucide-react';
import { AppDatabase, UserAccount, UserRole } from '../types';
import { canPerformAction, simpleHashPassword, triggerSystemPrint } from '../utils';

interface UsersViewProps {
  db: AppDatabase;
  currentUser: UserAccount;
  onSaveUser: (user: UserAccount, isEdit: boolean) => void;
  onToggleUserStatus: (userId: string) => void;
  onResetUserPassword: (userId: string, newPasswordHash: string) => void;
}

const ROLES: UserRole[] = [
  'SUPER ADMIN',
  'ADMIN',
  'PURCHASING STAFF',
  'WAREHOUSE STAFF',
  'VIEWER',
];

export const UsersView: React.FC<UsersViewProps> = ({
  db,
  currentUser,
  onSaveUser,
  onToggleUserStatus,
  onResetUserPassword,
}) => {
  const canManage = canPerformAction(currentUser.role, 'manage_users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [resetTarget, setResetTarget] = useState<UserAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const [formState, setFormState] = useState({
    id: '',
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'PURCHASING STAFF' as UserRole,
    department: 'Purchasing & Logistics',
    status: 'Active' as 'Active' | 'Disabled',
  });

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormState({
      id: `USR-${String(db.users.length + 101).slice(-3)}`,
      name: '',
      email: '',
      username: '',
      password: '',
      role: 'PURCHASING STAFF',
      department: 'Purchasing & Logistics',
      status: 'Active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: UserAccount) => {
    setEditingUser(u);
    setFormState({
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username,
      password: '',
      role: u.role,
      department: u.department,
      status: u.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = Boolean(editingUser);
    const userObj: UserAccount = {
      id: formState.id,
      name: formState.name,
      email: formState.email,
      username: formState.username,
      passwordHash: isEdit
        ? editingUser!.passwordHash
        : simpleHashPassword(formState.password || 'sol12345'),
      role: formState.role,
      department: formState.department,
      status: formState.status,
      lastLogin: isEdit ? editingUser!.lastLogin : 'Never',
      createdAt: isEdit
        ? editingUser!.createdAt
        : new Date().toISOString().split('T')[0],
    };
    onSaveUser(userObj, isEdit);
    setIsModalOpen(false);
  };

  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || newPasswordInput.length < 6) return;
    onResetUserPassword(resetTarget.id, simpleHashPassword(newPasswordInput));
    setResetTarget(null);
    setNewPasswordInput('');
  };

  return (
    <div className="space-y-6">
      {/* Role-Based Access Control (RBAC) Matrix Overview (#4) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-200">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-[#8B0000]" />
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                User Accounts & Role-Based Access Control (RBAC)
              </h2>
              <p className="text-xs text-neutral-500">
                Passwords are stored as cryptographic SHA-256 hashes. Accounts are deactivated rather than deleted to preserve audit integrity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={() => triggerSystemPrint('User Accounts & RBAC Roster')}
              className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Print Users Roster</span>
            </button>
            {canManage && (
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-[#8B0000] hover:bg-[#6E0000] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create User Account</span>
              </button>
            )}
          </div>
        </div>

        {/* 5 Role Capabilities Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 text-xs">
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
            <div className="font-extrabold text-[#8B0000]">1. SUPER ADMIN</div>
            <p className="text-[11px] text-neutral-600 mt-1">
              Full access: Users, Permissions, Quotations, Prices, Inventory, Adjustments, Audit Logs, Backup & Settings.
            </p>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
            <div className="font-extrabold text-neutral-900">2. ADMIN</div>
            <p className="text-[11px] text-neutral-600 mt-1">
              Manage Quotations, Suppliers, Products, Prices, Inventory, Stock In/Out & Reports. Cannot delete Super Admin.
            </p>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
            <div className="font-extrabold text-emerald-800">3. PURCHASING STAFF</div>
            <p className="text-[11px] text-neutral-600 mt-1">
              Add/View Quotations, Compare Supplier Prices, Create Purchase Orders, View Inventory & Receive Stock.
            </p>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
            <div className="font-extrabold text-amber-800">4. WAREHOUSE STAFF</div>
            <p className="text-[11px] text-neutral-600 mt-1">
              Access strictly limited from Dashboard up to Price History (Dashboard, Quotations, Suppliers, Products, Price List, Price Comparison, Price History).
            </p>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
            <div className="font-extrabold text-neutral-600">5. VIEWER</div>
            <p className="text-[11px] text-neutral-600 mt-1">
              Read-only access strictly limited from Dashboard up to Price History (Dashboard, Quotations, Suppliers, Products, Price List, Price Comparison, Price History).
            </p>
          </div>
        </div>
      </div>

      {/* Users Table (#5) */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Name & Email</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs">
              {db.users.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50">
                  <td className="py-3.5 px-4 font-mono font-bold text-neutral-800">{u.id}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-neutral-900">{u.name}</div>
                    <div className="text-[11px] text-neutral-500">{u.email}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#8B0000]">
                    {u.username}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-neutral-900">{u.role}</td>
                  <td className="py-3.5 px-4 text-neutral-600">{u.department}</td>
                  <td className="py-3.5 px-4 font-semibold">
                    {u.status === 'Active' ? (
                      <span className="text-emerald-700">🟢 Active</span>
                    ) : (
                      <span className="text-red-700">🔴 Disabled</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-neutral-600">{u.lastLogin}</td>
                  <td className="py-3.5 px-4 font-mono text-neutral-500">{u.createdAt}</td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {canManage ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          title="Edit User / Role"
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setResetTarget(u)}
                          title="Reset Password"
                          className="p-1.5 text-neutral-500 hover:text-[#8B0000] hover:bg-neutral-100 rounded cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== 'USR-001' && (
                          <button
                            onClick={() => onToggleUserStatus(u.id)}
                            title={u.status === 'Active' ? 'Disable Account' : 'Enable Account'}
                            className="p-1.5 text-neutral-500 hover:text-amber-700 hover:bg-neutral-100 rounded cursor-pointer"
                          >
                            {u.status === 'Active' ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-neutral-400">Super Admin Only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-300 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-200">
              <h3 className="text-base font-bold text-neutral-900">
                {editingUser ? `Edit User (${editingUser.id})` : 'Create Authorized User'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-500 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={formState.username}
                    onChange={(e) => setFormState({ ...formState, username: e.target.value })}
                    className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>

                {!editingUser && (
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Initial Password (Will be SHA-256 Hashed) *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={formState.password}
                      onChange={(e) => setFormState({ ...formState, password: e.target.value })}
                      placeholder="Minimum 6 characters..."
                      className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Role *</label>
                  <select
                    value={formState.role}
                    onChange={(e) =>
                      setFormState({ ...formState, role: e.target.value as UserRole })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg font-semibold"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.department}
                    onChange={(e) => setFormState({ ...formState, department: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-neutral-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#8B0000] text-white rounded-lg font-semibold"
                >
                  Save User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-300 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-neutral-900 mb-2">
              Reset Password for {resetTarget.name} ({resetTarget.username})
            </h3>
            <form onSubmit={handlePasswordResetSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  New Strong Password (min 6 chars) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 bg-neutral-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#8B0000] text-white rounded-lg font-semibold"
                >
                  Update Password Hash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
