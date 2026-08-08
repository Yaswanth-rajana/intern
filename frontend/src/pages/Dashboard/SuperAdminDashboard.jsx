import React, { useState, useEffect } from 'react';
import { fetchTenants, fetchDevices, deleteTenant } from '../../services/api';
import { useDashboardStore } from '../../store/dashboardStore';
import { 
  Building2, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  Unlink, 
  Users, 
  ArrowRight, 
  RefreshCw, 
  Activity, 
  Clock,
  Trash2
} from 'lucide-react';
import { cn } from '../../utils/cn';

export function SuperAdminDashboard() {
  const setActiveTab = useDashboardStore(state => state.setActiveTab);
  
  const [tenants, setTenants] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPlatformOverview = async () => {
    try {
      const [tenRes, devRes] = await Promise.all([
        fetchTenants(),
        fetchDevices()
      ]);
      setTenants(tenRes?.tenants || []);
      setDevices(devRes || []);
    } catch (err) {
      console.error('Failed to load Super Admin dashboard overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlatformOverview();
  }, []);

  const handleDeleteTenant = async (tenant) => {
    if (tenant.slug === 'default-tenant') {
      alert('System Default Tenant cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete client organization "${tenant.name}"? All assigned devices will be unassigned and user accounts will be deleted.`)) {
      return;
    }
    try {
      await deleteTenant(tenant._id);
      await loadPlatformOverview();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete tenant');
    }
  };

  const totalClients = tenants.length;
  const totalDevices = devices.length;
  const onlineDevices = devices.filter(d => (d.status || '').toUpperCase() === 'ONLINE').length;
  const offlineDevices = devices.filter(d => {
    const st = (d.status || '').toUpperCase();
    return st === 'OFFLINE' || st === 'WARNING';
  }).length;
  const unassignedDevices = devices.filter(d => !d.tenantId || (d.status || '').toUpperCase() === 'UNASSIGNED').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Super Admin Platform Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            System Overview & Fleet Health
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            High-level overview of multi-tenant clients, hardware fleet allocation, and system status.
          </p>
        </div>

        <button
          onClick={loadPlatformOverview}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-xs rounded-xl border border-neutral-200/80 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin text-primary")} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Clients</span>
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-extrabold text-neutral-900">{totalClients}</div>
          <div className="text-[11px] text-neutral-400 mt-2 font-medium">Registered SaaS Tenants</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Devices</span>
            <Server className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-neutral-900">{totalDevices}</div>
          <div className="text-[11px] text-neutral-400 mt-2 font-medium">Platform Monitor Fleet</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Online Devices</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">{onlineDevices}</div>
          <div className="text-[11px] text-emerald-700/70 mt-2 font-semibold">Active telemetry stream</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Offline Devices</span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-3xl font-extrabold text-rose-600">{offlineDevices}</div>
          <div className="text-[11px] text-neutral-400 mt-2 font-medium">Offline or warning state</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Unassigned</span>
            <Unlink className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-amber-600">{unassignedDevices}</div>
          <div className="text-[11px] text-amber-700/70 mt-2 font-semibold">Available for assignment</div>
        </div>

      </div>

      {/* Quick Navigation Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div 
          onClick={() => setActiveTab('Clients')}
          className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white p-6 rounded-2xl shadow-lg border border-neutral-800 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-all group"
        >
          <div>
            <div className="flex items-center gap-2 text-primary-light font-bold text-xs uppercase tracking-wider mb-1">
              <Building2 className="w-4 h-4" />
              <span>Tenant Management</span>
            </div>
            <h3 className="text-xl font-bold text-white">Client Directory & Provisioning</h3>
            <p className="text-xs text-neutral-400 mt-1">Create clients, manage Client Admin credentials, and view tenant stats.</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shrink-0">
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('Devices')}
          className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white p-6 rounded-2xl shadow-lg border border-neutral-800 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-all group"
        >
          <div>
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Server className="w-4 h-4" />
              <span>Hardware Allocation</span>
            </div>
            <h3 className="text-xl font-bold text-white">Device Ownership & Assignment</h3>
            <p className="text-xs text-neutral-400 mt-1">Assign unassigned hardware, reassign devices across tenants, or unassign telemetry.</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Client Overview Table */}
      <div className="bg-white rounded-2xl shadow-soft border border-neutral-200/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Client Platform Summary</h2>
            <p className="text-xs text-neutral-500">Breakdown of assigned monitors, active connections, and registered users per tenant.</p>
          </div>
          <button
            onClick={() => setActiveTab('Clients')}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>View All Clients</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-neutral-400 font-medium text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span>Loading client summary...</span>
          </div>
        ) : tenants.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 font-medium text-sm">
            No client tenants registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Client Organization</th>
                  <th className="px-6 py-4 font-semibold">Assigned Devices</th>
                  <th className="px-6 py-4 font-semibold">Online Status</th>
                  <th className="px-6 py-4 font-semibold">Registered Users</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {tenants.map((t) => (
                  <tr key={t._id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-extrabold uppercase shrink-0">
                          {t.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-neutral-900">{t.name}</div>
                          <div className="text-xs text-neutral-400 font-mono">{t.slug}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-bold text-neutral-800">
                      {t.deviceCount || 0}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-600">{t.onlineDeviceCount || 0}</span>
                        <span className="text-xs text-neutral-400">Online</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-neutral-800">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span>{t.userCount || 0}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase",
                        t.status === 'active' ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-rose-50 text-rose-700 border border-rose-200/60"
                      )}>
                        {t.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setActiveTab('Clients')}
                          className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Manage
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
