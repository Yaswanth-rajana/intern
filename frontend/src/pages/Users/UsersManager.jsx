import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { fetchUsers, createUser, deleteUser } from '../../services/api';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Shield, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  User as UserIcon,
  RefreshCw,
  Clock,
  Cpu,
  Sliders,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { AssignDevicesModal } from './AssignDevicesModal';

export function UsersManager() {
  const currentUser = useAuthStore(state => state.user);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isClientAdmin = currentUser?.role === 'CLIENT_ADMIN' || currentUser?.role === 'Admin';
  const canManageUsers = isSuperAdmin || isClientAdmin;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('VIEWER');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Assign Devices Modal state
  const [assigningUser, setAssigningUser] = useState(null);

  const loadUsers = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setFetching(true);
    try {
      const data = await fetchUsers();
      if (data && data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to fetch users list');
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  useEffect(() => {
    if (canManageUsers) {
      loadUsers();
    }
  }, [canManageUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username.trim() || !password) {
      setErrorMsg('Username and password are required');
      return;
    }

    if (username.trim().length < 3) {
      setErrorMsg('Username must be at least 3 characters');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const roleToCreate = isSuperAdmin ? selectedRole : 'VIEWER';

      const res = await createUser({
        username: username.trim(),
        password,
        role: roleToCreate,
      });

      setSuccessMsg(`Account "${res.user?.username || username}" (${roleToCreate}) created successfully!`);
      setUsername('');
      setPassword('');
      setSelectedRole('VIEWER');
      await loadUsers();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to create user account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId, userAccountName) => {
    if (!window.confirm(`Are you sure you want to delete user account "${userAccountName}"?`)) {
      return;
    }

    setDeletingId(userId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await deleteUser(userId);
      setSuccessMsg(`Account "${userAccountName}" deleted successfully.`);
      await loadUsers();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to delete user account');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAssignmentsSaved = (userId, newDeviceIds) => {
    setUsers(prev => prev.map(u => {
      if (u._id === userId || u.userId === userId) {
        return {
          ...u,
          assignedDeviceIds: newDeviceIds,
          deviceCount: newDeviceIds.length
        };
      }
      return u;
    }));
    setSuccessMsg(`Device assignments updated successfully.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  if (!canManageUsers) {
    return (
      <div className="p-8 max-w-xl mx-auto bg-[#F8FAFC] rounded-2xl shadow-soft border border-[#E2E8F0] text-center mt-12">
        <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#172033] mb-2">Access Restricted</h2>
        <p className="text-sm text-neutral-500">
          User management is restricted to Client Administrators and Super Administrators. Viewer accounts do not have permission to view or manage user credentials.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>{isSuperAdmin ? 'Platform Management' : 'Client Organization Management'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033] tracking-tight">
            User Credentials Directory
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            {isSuperAdmin 
              ? 'Manage accounts across all tenants with platform role assignment.' 
              : 'Manage Viewer account access credentials and authorized devices for your organization.'}
          </p>
        </div>

        <button
          onClick={() => loadUsers(true)}
          disabled={fetching}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#F8FAFC] hover:bg-white text-[#172033] font-semibold text-xs rounded-xl border border-[#E2E8F0] shadow-xs transition-all disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", fetching && "animate-spin text-primary")} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50/90 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm font-medium flex items-center gap-3 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50/90 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm font-medium flex items-center gap-3 shadow-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Creation Form Card */}
      <div className="bg-[#F8FAFC] rounded-2xl shadow-soft border border-[#E2E8F0] p-6 sm:p-8">
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#172033]">
              {isSuperAdmin ? 'Create New User Account' : 'Create Viewer Credentials'}
            </h2>
            <p className="text-xs text-neutral-500">
              {isSuperAdmin 
                ? 'Provision Super Admin, Client Admin, or Viewer user accounts.' 
                : 'New accounts generated here are created with zero device permissions until you explicitly assign devices.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateUser} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Username Input */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Username *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. viewer_john"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors p-1"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role Selector / Fixed Display */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Assigned Role
              </label>
              {isSuperAdmin ? (
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-800 outline-none focus:border-primary focus:bg-white"
                >
                  <option value="VIEWER">VIEWER (Read-Only)</option>
                  <option value="CLIENT_ADMIN">CLIENT_ADMIN (Tenant Manager)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Platform)</option>
                </select>
              ) : (
                <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-100/70 border border-neutral-200/80 rounded-xl text-sm">
                  <div className="flex items-center gap-2 text-neutral-700 font-semibold">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>VIEWER</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                    Fixed Role
                  </span>
                </div>
              )}
            </div>

          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting || !username.trim() || !password}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{isSuperAdmin ? 'Create Account' : 'Create Viewer Credentials'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Directory Table Card */}
      <div className="bg-[#F8FAFC] rounded-2xl shadow-soft border border-[#E2E8F0] overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Registered User Accounts</h2>
            <p className="text-xs text-neutral-500">
              Total registered users: <span className="font-semibold text-neutral-800">{users.length}</span>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-neutral-400 font-medium text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span>Loading user directory...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 font-medium text-sm">
            No registered users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Created Date</th>
                  <th className="px-6 py-4 font-semibold">Devices</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {users.map((u) => {
                  const isUserSuperAdmin = u.role === 'SUPER_ADMIN' || u.role === 'Admin';
                  const isViewer = u.role === 'VIEWER';
                  const isSelf = u._id === currentUser?.id || u._id === currentUser?.userId;

                  let canDelete = false;
                  if (isSuperAdmin) {
                    canDelete = !isSelf && !isUserSuperAdmin;
                  } else if (isClientAdmin) {
                    canDelete = isViewer && !isSelf;
                  }

                  const deviceCount = typeof u.deviceCount === 'number' 
                    ? u.deviceCount 
                    : (u.assignedDeviceIds?.length || 0);

                  const totalTenantDevices = u.totalTenantDevices || 0;
                  const hasAllDevices = totalTenantDevices > 0 && deviceCount === totalTenantDevices;

                  return (
                    <tr key={u._id} className="hover:bg-neutral-50/60 transition-colors">
                      
                      {/* User Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold uppercase shrink-0",
                            isUserSuperAdmin 
                              ? "bg-purple-500/10 text-purple-600 border border-purple-200" 
                              : u.role === 'CLIENT_ADMIN'
                                ? "bg-primary/10 text-primary"
                                : "bg-neutral-100 text-neutral-700 border border-neutral-200/60"
                          )}>
                            {u.username.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                              {u.username}
                              {isSelf && (
                                <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-normal">
                                  You
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide uppercase",
                          isUserSuperAdmin 
                            ? "bg-purple-50 text-purple-700 border border-purple-200" 
                            : u.role === 'CLIENT_ADMIN'
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                        )}>
                          <Shield className="w-3 h-3" />
                          {u.role}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="px-6 py-4 text-xs text-neutral-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-neutral-400" />
                          <span>
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Devices Column */}
                      <td className="px-6 py-4">
                        {isViewer ? (
                          <button
                            onClick={() => setAssigningUser(u)}
                            className="text-left group cursor-pointer"
                            title="Click to manage assigned devices"
                          >
                            {deviceCount === 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300/80 group-hover:border-amber-400 transition-all shadow-2xs">
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>No devices assigned</span>
                              </span>
                            ) : hasAllDevices ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300/80 group-hover:border-emerald-400 transition-all shadow-2xs">
                                <Cpu className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>All Devices ({deviceCount})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 group-hover:border-purple-300 transition-all shadow-2xs">
                                <Cpu className="w-3 h-3 text-purple-600 shrink-0" />
                                <span>{deviceCount} {deviceCount === 1 ? 'Device' : 'Devices'}</span>
                              </span>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-neutral-600 bg-neutral-100/80 px-2.5 py-1 rounded-lg border border-neutral-200/60 inline-flex items-center gap-1.5">
                            <Cpu className="w-3 h-3 text-neutral-400" />
                            <span>{isUserSuperAdmin ? 'All' : 'All'}</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Assign Devices Button - Only for VIEWER users */}
                          {isViewer && (
                            <button
                              onClick={() => setAssigningUser(u)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-lg transition-colors border border-primary/20 cursor-pointer"
                              title="Assign Devices"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span>Assign Devices</span>
                            </button>
                          )}

                          {canDelete ? (
                            <button
                              onClick={() => handleDeleteUser(u._id, u.username)}
                              disabled={deletingId === u._id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs rounded-lg transition-colors border border-rose-200/60 disabled:opacity-50 cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          ) : !isViewer ? (
                            <span className="text-xs text-neutral-400 font-medium italic">
                              Protected
                            </span>
                          ) : null}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Devices Modal */}
      <AssignDevicesModal
        isOpen={!!assigningUser}
        onClose={() => setAssigningUser(null)}
        targetUser={assigningUser}
        onSaved={handleAssignmentsSaved}
      />
    </div>
  );
}
