import React, { useState, useEffect } from 'react';
import { fetchDevices, fetchTenants, assignDevice, unassignDevice, updateDeviceLocation, registerDevice } from '../../services/api';
import { 
  Server, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Link, 
  Unlink, 
  Repeat, 
  X, 
  Edit3, 
  Clock, 
  MapPin, 
  Cpu,
  Plus
} from 'lucide-react';
import { cn } from '../../utils/cn';

export function SuperAdminDevicesManager() {
  const [devices, setDevices] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState('all'); // all, assigned, unassigned, online, offline
  const [search, setSearch] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [assigningDevice, setAssigningDevice] = useState(null); // device object
  const [reassigningDevice, setReassigningDevice] = useState(null); // device object
  const [unassigningDevice, setUnassigningDevice] = useState(null); // device object
  const [editingLocationDevice, setEditingLocationDevice] = useState(null);

  // Form states
  const [regDeviceId, setRegDeviceId] = useState('');
  const [regName, setRegName] = useState('');
  const [regLocation, setRegLocation] = useState('');
  const [regFirmware, setRegFirmware] = useState('1.0.0');
  const [regHardware, setRegHardware] = useState('T113i');

  const [targetTenantId, setTargetTenantId] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async (showSpinner = false) => {
    if (showSpinner) setFetching(true);
    try {
      const [devRes, tenRes] = await Promise.all([
        fetchDevices(),
        fetchTenants()
      ]);
      setDevices(devRes || []);
      setTenants(tenRes?.tenants || []);
    } catch (err) {
      console.error('Failed to load devices/tenants data:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to fetch devices directory');
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regDeviceId.trim()) {
      setErrorMsg('Device ID is required');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await registerDevice({
        deviceId: regDeviceId.trim(),
        name: regName.trim() || regDeviceId.trim(),
        location: regLocation.trim() || 'Unallocated',
        firmwareVersion: regFirmware.trim() || '1.0.0',
        hardwareVersion: regHardware.trim() || 'T113i',
      });

      setSuccessMsg(`Device "${regDeviceId.trim()}" registered successfully as UNASSIGNED!`);
      setShowRegisterModal(false);
      setRegDeviceId('');
      setRegName('');
      setRegLocation('');
      await loadData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to register device hardware');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!targetTenantId) {
      setErrorMsg('Please select a target client organization');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await assignDevice(targetTenantId, {
        deviceId: assigningDevice.deviceId,
        location: locationInput.trim() || undefined,
      });

      setSuccessMsg(`Device ${assigningDevice.deviceId} assigned successfully!`);
      setAssigningDevice(null);
      setTargetTenantId('');
      setLocationInput('');
      await loadData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to assign device');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!targetTenantId) {
      setErrorMsg('Please select a new client organization');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await assignDevice(targetTenantId, {
        deviceId: reassigningDevice.deviceId,
        location: locationInput.trim() || undefined,
        reassign: true,
      });

      setSuccessMsg(`Device ${reassigningDevice.deviceId} reassigned successfully!`);
      setReassigningDevice(null);
      setTargetTenantId('');
      setLocationInput('');
      await loadData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to reassign device');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassignSubmit = async () => {
    if (!unassigningDevice || !unassigningDevice.tenantId) return;

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await unassignDevice(unassigningDevice.tenantId, unassigningDevice.deviceId);
      setSuccessMsg(`Device ${unassigningDevice.deviceId} unassigned successfully!`);
      setUnassigningDevice(null);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to unassign device');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateLocationSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await updateDeviceLocation(editingLocationDevice.deviceId, locationInput.trim());
      setSuccessMsg(`Location updated for ${editingLocationDevice.deviceId}`);
      setEditingLocationDevice(null);
      setLocationInput('');
      await loadData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to update location');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered devices
  const filteredDevices = devices.filter(d => {
    const matchesSearch = d.deviceId.toLowerCase().includes(search.toLowerCase()) ||
      (d.location && d.location.toLowerCase().includes(search.toLowerCase())) ||
      (d.name && d.name.toLowerCase().includes(search.toLowerCase())) ||
      (d.tenant?.name && d.tenant.name.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    const st = (d.status || '').toUpperCase();
    if (filterType === 'assigned') return !!d.tenantId;
    if (filterType === 'unassigned') return !d.tenantId || st === 'UNASSIGNED';
    if (filterType === 'online') return st === 'ONLINE';
    if (filterType === 'offline') return st === 'OFFLINE' || st === 'WARNING';
    return true;
  });

  const totalAssigned = devices.filter(d => !!d.tenantId).length;
  const totalUnassigned = devices.filter(d => !d.tenantId || (d.status || '').toUpperCase() === 'UNASSIGNED').length;
  const totalOnline = devices.filter(d => (d.status || '').toUpperCase() === 'ONLINE').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <Server className="w-4 h-4" />
            <span>Platform SaaS Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Device Fleet & Ownership Directory
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Register, monitor, assign, reassign, and manage multi-tenant hardware telemetry allocation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={fetching}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-xs rounded-xl border border-neutral-200/80 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", fetching && "animate-spin text-primary")} />
            <span>Refresh Fleet</span>
          </button>

          <button
            onClick={() => setShowRegisterModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-primary/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Hardware</span>
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-soft">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Fleet Devices</span>
            <Server className="w-5 h-5 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900">{devices.length}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-soft">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Online Devices</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{totalOnline}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-soft">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Assigned to Clients</span>
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900">{totalAssigned}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-soft">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Unassigned Devices</span>
            <Unlink className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">{totalUnassigned}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-soft">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Device ID, location, or client..."
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-neutral-100 rounded-xl">
          {[
            { id: 'all', label: 'All' },
            { id: 'assigned', label: 'Assigned' },
            { id: 'unassigned', label: 'Unassigned' },
            { id: 'online', label: 'Online' },
            { id: 'offline', label: 'Offline' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                filterType === f.id ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500 hover:text-neutral-800"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl shadow-soft border border-neutral-200/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-400 font-medium text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span>Loading device fleet...</span>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 font-medium text-sm">
            No devices found matching current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Device ID / Name</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold">Assigned Client</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Hardware</th>
                  <th className="px-6 py-4 font-semibold">Last Telemetry</th>
                  <th className="px-6 py-4 font-semibold text-right">Ownership Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {filteredDevices.map((d) => {
                  const statusUpper = (d.status || 'UNASSIGNED').toUpperCase();
                  const isOnline = statusUpper === 'ONLINE';

                  return (
                    <tr key={d.deviceId} className="hover:bg-neutral-50/60 transition-colors">
                      
                      {/* Device ID */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 font-mono font-bold text-xs flex items-center justify-center border border-neutral-200/60">
                            <Cpu className="w-4 h-4 text-neutral-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold font-mono text-neutral-900">{d.deviceId}</span>
                            <span className="text-[11px] text-neutral-400">{d.name || d.deviceId}</span>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4 text-xs font-medium text-neutral-700">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span>{d.location || 'Unknown'}</span>
                          <button
                            onClick={() => {
                              setEditingLocationDevice(d);
                              setLocationInput(d.location || '');
                            }}
                            className="text-neutral-400 hover:text-neutral-600 p-0.5"
                            title="Edit Location"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Assigned Client */}
                      <td className="px-6 py-4">
                        {d.tenant ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                            <Building2 className="w-3.5 h-3.5 text-primary" />
                            <span>{d.tenant.name}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/60">
                            UNASSIGNED
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide uppercase",
                          statusUpper === 'ONLINE' ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" :
                          statusUpper === 'OFFLINE' ? "bg-rose-50 text-rose-700 border border-rose-200/60" :
                          statusUpper === 'WARNING' ? "bg-amber-50 text-amber-700 border border-amber-200/60" :
                          "bg-neutral-100 text-neutral-600 border border-neutral-200/60"
                        )}>
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            statusUpper === 'ONLINE' ? "bg-emerald-500" :
                            statusUpper === 'OFFLINE' ? "bg-rose-500" :
                            statusUpper === 'WARNING' ? "bg-amber-500" : "bg-neutral-400"
                          )} />
                          {statusUpper}
                        </span>
                      </td>

                      {/* Hardware */}
                      <td className="px-6 py-4 text-xs text-neutral-500 font-mono">
                        {d.hardwareVersion || 'T113i'}
                      </td>

                      {/* Last Telemetry */}
                      <td className="px-6 py-4 text-xs text-neutral-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-neutral-400" />
                          <span>
                            {d.lastSeenAt || d.lastSeen ? new Date(d.lastSeenAt || d.lastSeen).toLocaleTimeString() : 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!d.tenantId ? (
                            <button
                              onClick={() => {
                                setAssigningDevice(d);
                                setLocationInput(d.location || '');
                                setTargetTenantId('');
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                            >
                              <Link className="w-3.5 h-3.5" />
                              <span>Assign Client</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setReassigningDevice(d);
                                  setLocationInput(d.location || '');
                                  setTargetTenantId('');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                                title="Reassign to another client"
                              >
                                <Repeat className="w-3.5 h-3.5" />
                                <span>Reassign</span>
                              </button>

                              <button
                                onClick={() => setUnassigningDevice(d)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs rounded-lg transition-colors border border-rose-200/60 cursor-pointer"
                                title="Unassign device from tenant"
                              >
                                <Unlink className="w-3.5 h-3.5" />
                                <span>Unassign</span>
                              </button>
                            </>
                          )}
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

      {/* REGISTER DEVICE HARDWARE MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-neutral-200 animate-in fade-in">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Register Device Hardware</h3>
                <p className="text-xs text-neutral-500">Onboard new hardware as UNASSIGNED inventory</p>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="text-neutral-400 hover:text-neutral-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Device ID *
                </label>
                <input
                  type="text"
                  value={regDeviceId}
                  onChange={(e) => setRegDeviceId(e.target.value)}
                  placeholder="e.g. IAQ-0005"
                  required
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono font-bold text-neutral-800 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Display / Sensor Name
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Main Office Monitor"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Firmware
                  </label>
                  <input
                    type="text"
                    value={regFirmware}
                    onChange={(e) => setRegFirmware(e.target.value)}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono text-neutral-800 outline-none focus:border-primary focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Hardware Rev
                  </label>
                  <input
                    type="text"
                    value={regHardware}
                    onChange={(e) => setRegHardware(e.target.value)}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono text-neutral-800 outline-none focus:border-primary focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Initial Location
                </label>
                <input
                  type="text"
                  value={regLocation}
                  onChange={(e) => setRegLocation(e.target.value)}
                  placeholder="e.g. Building A - Floor 1"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                <button type="button" onClick={() => setShowRegisterModal(false)} className="px-4 py-2 text-xs font-bold text-neutral-600">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !regDeviceId.trim()}
                  className="px-5 py-2.5 bg-primary text-white font-bold text-xs uppercase rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register Hardware'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN DEVICE MODAL */}
      {assigningDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-neutral-200 animate-in fade-in">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Assign Device to Client</h3>
                <p className="text-xs text-neutral-500 font-mono">Device ID: {assigningDevice.deviceId}</p>
              </div>
              <button onClick={() => setAssigningDevice(null)} className="text-neutral-400 hover:text-neutral-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Select Target Client Organization *
                </label>
                <select
                  value={targetTenantId}
                  onChange={(e) => setTargetTenantId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-800 outline-none focus:border-primary focus:bg-white"
                >
                  <option value="">-- Choose Client --</option>
                  {tenants.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.slug})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Installation / Location Name
                </label>
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="e.g. Building A - Floor 2"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                <button type="button" onClick={() => setAssigningDevice(null)} className="px-4 py-2 text-xs font-bold text-neutral-600">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !targetTenantId}
                  className="px-5 py-2.5 bg-primary text-white font-bold text-xs uppercase rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Assigning...' : 'Assign Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REASSIGN DEVICE MODAL */}
      {reassigningDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-neutral-200 animate-in fade-in">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Reassign Device Ownership</h3>
                <p className="text-xs text-neutral-500 font-mono">Device ID: {reassigningDevice.deviceId}</p>
              </div>
              <button onClick={() => setReassigningDevice(null)} className="text-neutral-400 hover:text-neutral-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReassignSubmit} className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  Reassignment Warning
                </p>
                <p>
                  Current client: <strong>{reassigningDevice.tenant?.name || 'Assigned Client'}</strong>.
                </p>
                <p className="text-[11px] text-amber-800">
                  Future MQTT telemetry will belong to the new client. Existing historical telemetry will remain associated with its original tenant.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Select New Client Organization *
                </label>
                <select
                  value={targetTenantId}
                  onChange={(e) => setTargetTenantId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-800 outline-none focus:border-primary focus:bg-white"
                >
                  <option value="">-- Choose New Client --</option>
                  {tenants.filter(t => t._id !== reassigningDevice.tenantId).map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.slug})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                <button type="button" onClick={() => setReassigningDevice(null)} className="px-4 py-2 text-xs font-bold text-neutral-600">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !targetTenantId}
                  className="px-5 py-2.5 bg-primary text-white font-bold text-xs uppercase rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UNASSIGN CONFIRMATION MODAL */}
      {unassigningDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-neutral-200 p-6 text-center animate-in fade-in">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Unlink className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-1">Unassign Device?</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Device <strong className="font-mono text-neutral-800">{unassigningDevice.deviceId}</strong> will be detached from <strong>{unassigningDevice.tenant?.name}</strong>. Future MQTT telemetry will be stored as unassigned.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setUnassigningDevice(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnassignSubmit}
                disabled={submitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase rounded-xl shadow-md disabled:opacity-50"
              >
                {submitting ? 'Unassigning...' : 'Unassign Device'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE LOCATION MODAL */}
      {editingLocationDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 overflow-hidden border border-neutral-200 animate-in fade-in">
            <h3 className="text-lg font-bold text-neutral-900 mb-1">Update Location</h3>
            <p className="text-xs text-neutral-500 font-mono mb-4">{editingLocationDevice.deviceId}</p>
            
            <form onSubmit={handleUpdateLocationSubmit} className="space-y-4">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="e.g. Building A - Floor 2"
                required
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 outline-none focus:border-primary focus:bg-white"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEditingLocationDevice(null)} className="px-4 py-2 text-xs font-bold text-neutral-600">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-primary text-white font-bold text-xs uppercase rounded-xl shadow-md">
                  Save Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
