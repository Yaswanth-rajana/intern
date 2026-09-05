import React, { useState, useEffect } from 'react';
import { 
  fetchTenants, 
  createTenant, 
  updateTenant, 
  deleteTenant, 
  fetchTenant, 
  unassignDevice
} from '../../services/api';
import { 
  Building2, 
  Plus, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Server, 
  Users, 
  Eye, 
  EyeOff, 
  X, 
  Clock, 
  UserPlus,
  Trash2,
  Edit3
} from 'lucide-react';
import { cn } from '../../utils/cn';

export function ClientsManager() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTenantDetails, setSelectedTenantDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form states for Create Client
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);



  const loadTenants = async (showSpinner = false) => {
    if (showSpinner) setFetching(true);
    try {
      const data = await fetchTenants();
      if (data && data.tenants) {
        setTenants(data.tenants);
      }
    } catch (err) {
      console.error('Failed to load tenants:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to fetch tenants list');
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleCreateClientSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Organization name is required');
      return;
    }

    if (adminUsername.trim() && adminUsername.trim().length < 3) {
      setErrorMsg('Admin username must be at least 3 characters');
      return;
    }

    if (adminPassword) {
      if (adminPassword.length < 6) {
        setErrorMsg('Password must be at least 6 characters');
        return;
      }
      if (adminPassword !== confirmPassword) {
        setErrorMsg('Passwords do not match');
        return;
      }
    }

    setSubmitting(true);
    try {
      await createTenant({
        name: name.trim(),
        slug: slug.trim() || undefined,
        adminUsername: adminUsername.trim() || undefined,
        adminPassword: adminPassword || undefined,
      });

      setSuccessMsg(`Client "${name}" created successfully!`);
      setName('');
      setSlug('');
      setAdminUsername('');
      setAdminPassword('');
      setConfirmPassword('');
      setShowCreateModal(false);
      await loadTenants();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to create client tenant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (tenant) => {
    const newStatus = tenant.status === 'active' ? 'inactive' : 'active';
    const actionName = newStatus === 'active' ? 'activate' : 'deactivate';
    
    if (!window.confirm(`Are you sure you want to ${actionName} "${tenant.name}"? ${newStatus === 'inactive' ? 'All client users will be blocked from logging in.' : ''}`)) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    try {
      await updateTenant(tenant._id, { status: newStatus });
      setSuccessMsg(`Client "${tenant.name}" is now ${newStatus}.`);
      await loadTenants();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || `Failed to ${actionName} client`);
    }
  };

  const handleDeleteTenant = async (tenant) => {
    if (!window.confirm(`Are you sure you want to delete client organization "${tenant.name}"? All assigned devices will become unassigned and user accounts will be permanently deleted.`)) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    try {
      await deleteTenant(tenant._id);
      setSuccessMsg(`Client "${tenant.name}" deleted successfully.`);
      if (selectedTenantDetails?.tenant?._id === tenant._id) {
        setSelectedTenantDetails(null);
      }
      await loadTenants();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to delete client organization');
    }
  };

  const handleViewDetails = async (tenantId) => {
    setLoadingDetails(true);
    setSelectedTenantDetails(null);
    try {
      const data = await fetchTenant(tenantId);
      setSelectedTenantDetails(data);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to fetch tenant details');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Filtered tenants
  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalDevicesAssigned = tenants.reduce((acc, t) => acc + (t.deviceCount || 0), 0);
  const totalUsersCount = tenants.reduce((acc, t) => acc + (t.userCount || 0), 0);
  const activeTenantsCount = tenants.filter(t => t.status === 'active').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Platform SaaS Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Client / Tenant Directory
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Manage client organization accounts, status, credentials, and hardware allocation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadTenants(true)}
            disabled={fetching}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#F8FAFC] hover:bg-white text-[#172033] font-semibold text-xs rounded-xl border border-[#E2E8F0] shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", fetching && "animate-spin text-primary")} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-primary/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Client</span>
          </button>
        </div>
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

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-[#E2E8F0] shadow-soft">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Clients</span>
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#172033]">{tenants.length}</div>
        </div>

        <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-[#E2E8F0] shadow-soft">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Tenants</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{activeTenantsCount}</div>
        </div>

        <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-[#E2E8F0] shadow-soft">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Assigned Devices</span>
            <Server className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#172033]">{totalDevicesAssigned}</div>
        </div>

        <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-[#E2E8F0] shadow-soft">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Client Users</span>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#172033]">{totalUsersCount}</div>
        </div>
      </div>

      {/* Directory Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0] shadow-soft">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organization name or slug..."
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider shrink-0">Status:</span>
          <div className="flex bg-neutral-100 p-1 rounded-xl w-full sm:w-auto">
            {['all', 'active', 'inactive'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer",
                  statusFilter === st ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500 hover:text-neutral-800"
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Directory Table Card */}
      <div className="bg-[#F8FAFC] rounded-2xl shadow-soft border border-[#E2E8F0] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-400 font-medium text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span>Loading client directory...</span>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 font-medium text-sm">
            No clients found matching the search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Client Organization</th>
                  <th className="px-6 py-4 font-semibold">Devices (Online / Total)</th>
                  <th className="px-6 py-4 font-semibold">Users</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Created Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {filteredTenants.map((t) => {
                  const isActive = t.status === 'active';

                  return (
                    <tr key={t._id} className="hover:bg-neutral-50/60 transition-colors">
                      
                      {/* Organization Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-extrabold uppercase shrink-0">
                            {t.name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-neutral-900">{t.name}</span>
                            <span className="text-xs text-neutral-400 font-mono">slug: {t.slug}</span>
                          </div>
                        </div>
                      </td>

                      {/* Devices Counts */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-600">{t.onlineDeviceCount || 0}</span>
                          <span className="text-neutral-400">/</span>
                          <span className="font-bold text-neutral-800">{t.deviceCount || 0}</span>
                          <span className="text-xs text-neutral-400">devices</span>
                        </div>
                      </td>

                      {/* Users Count */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-bold text-neutral-800">
                          <Users className="w-4 h-4 text-purple-600" />
                          <span>{t.userCount || 0}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide uppercase",
                          isActive 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" 
                            : "bg-rose-50 text-rose-700 border border-rose-200/60"
                        )}>
                          <span className={cn("w-2 h-2 rounded-full", isActive ? "bg-emerald-500" : "bg-rose-500")} />
                          {t.status}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="px-6 py-4 text-xs text-neutral-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-neutral-400" />
                          <span>
                            {t.createdAt ? new Date(t.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(t._id)}
                            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            Manage Client
                          </button>
                          
                          <button
                            onClick={() => handleToggleStatus(t)}
                            className={cn(
                              "px-3 py-1.5 font-semibold text-xs rounded-lg transition-colors border cursor-pointer",
                              isActive 
                                ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200/60" 
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200/60"
                            )}
                          >
                            {isActive ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            onClick={() => handleDeleteTenant(t)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs rounded-lg transition-colors border border-rose-200/60 cursor-pointer"
                            title="Delete Client Organization"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
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

      {/* CREATE CLIENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Create New Client</h3>
                  <p className="text-xs text-neutral-500">Register tenant organization & admin credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClientSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. ABC Industries"
                  required
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Tenant Slug (URL Identifer)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="e.g. abc-industries"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="border-t border-neutral-100 pt-4">
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  Initial Client Admin Credentials
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1">
                      Client Admin Username
                    </label>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="e.g. abc_admin"
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1">
                        Admin Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          className="w-full pl-4 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-neutral-600 hover:text-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-primary/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLIENT MANAGEMENT DETAILS MODAL */}
      {selectedTenantDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-neutral-200 max-h-[92vh] flex flex-col">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-extrabold uppercase">
                  {selectedTenantDetails.tenant.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">{selectedTenantDetails.tenant.name}</h3>
                  <p className="text-xs text-neutral-400 font-mono">slug: {selectedTenantDetails.tenant.slug}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTenantDetails(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
                  <div className="text-xs font-bold text-neutral-500 uppercase">Assigned Devices</div>
                  <div className="text-2xl font-extrabold text-neutral-900 mt-1">
                    {selectedTenantDetails.stats.deviceCount}
                  </div>
                </div>

                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
                  <div className="text-xs font-bold text-neutral-500 uppercase">Online Devices</div>
                  <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                    {selectedTenantDetails.stats.onlineDeviceCount}
                  </div>
                </div>

                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
                  <div className="text-xs font-bold text-neutral-500 uppercase">Registered Users</div>
                  <div className="text-2xl font-extrabold text-purple-600 mt-1">
                    {selectedTenantDetails.stats.userCount}
                  </div>
                </div>
              </div>

              {/* Devices Section */}
              <div>
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" />
                  Assigned Devices ({selectedTenantDetails.devices.length})
                </h4>
                {selectedTenantDetails.devices.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No devices assigned to this client yet.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {selectedTenantDetails.devices.map(d => (
                      <div key={d._id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl text-xs font-medium border border-neutral-200/60">
                        <div className="flex items-center gap-3">
                          <span className="font-bold font-mono text-neutral-900">{d.deviceId}</span>
                          <span className="text-neutral-500">{d.location || 'No location'}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            d.status === 'ONLINE' || d.status === 'Online' ? "bg-emerald-100 text-emerald-700" : "bg-neutral-200 text-neutral-600"
                          )}>
                            {d.status}
                          </span>
                        </div>
                        <button
                          onClick={() => handleUnassignDeviceFromTenant(selectedTenantDetails.tenant._id, d.deviceId)}
                          className="text-rose-600 hover:text-rose-800 font-bold text-[11px] cursor-pointer"
                        >
                          Unassign
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Users Section */}
              <div>
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  Registered Client Accounts ({selectedTenantDetails.users.length})
                </h4>
                {selectedTenantDetails.users.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No user accounts registered for this client.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {selectedTenantDetails.users.map(u => (
                      <div key={u._id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl text-xs font-medium border border-neutral-200/60">
                        <span className="font-bold text-neutral-900">{u.username}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          u.role === 'CLIENT_ADMIN' ? "bg-primary/10 text-primary" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {u.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedTenantDetails(null)}
                className="px-5 py-2 bg-neutral-800 hover:bg-neutral-900 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
