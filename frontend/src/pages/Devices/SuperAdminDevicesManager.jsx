import React, { useState, useEffect } from 'react';
import { 
  fetchDevices, 
  fetchTenants, 
  assignDevice, 
  unassignDevice, 
  updateDeviceLocation, 
  registerDevice,
  bulkUnassignDevices,
  bulkArchiveDevices,
  bulkAssignDevices,
  bulkRestoreDevices,
  restoreDevice
} from '../../services/api';
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
  Plus,
  Archive,
  RotateCcw,
  CheckSquare,
  Square,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../../utils/cn';

export function SuperAdminDevicesManager() {
  const [devices, setDevices] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState('all'); // all, assigned, unassigned, online, offline, archived
  const [search, setSearch] = useState('');

  // Bulk Selection State
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [isAllFilteredSelected, setIsAllFilteredSelected] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [assigningDevice, setAssigningDevice] = useState(null); // device object
  const [reassigningDevice, setReassigningDevice] = useState(null); // device object
  const [unassigningDevice, setUnassigningDevice] = useState(null); // device object
  const [editingLocationDevice, setEditingLocationDevice] = useState(null);

  // Bulk Modals
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showBulkUnassignConfirm, setShowBulkUnassignConfirm] = useState(false);
  const [showBulkArchiveConfirm, setShowBulkArchiveConfirm] = useState(false);
  const [showBulkRestoreConfirm, setShowBulkRestoreConfirm] = useState(false);

  // Form states
  const [regDeviceId, setRegDeviceId] = useState('');
  const [regName, setRegName] = useState('');
  const [regLocation, setRegLocation] = useState('');
  const [regFirmware, setRegFirmware] = useState('1.0.0');
  const [regHardware, setRegHardware] = useState('T113i');

  const [targetTenantId, setTargetTenantId] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [locationSelection, setLocationSelection] = useState({ buildingId: '', floorId: '', roomId: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async (showSpinner = false) => {
    if (showSpinner) setFetching(true);
    try {
      const [devRes, tenRes] = await Promise.all([
        fetchDevices({ status: 'ALL' }),
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

  // Clear selection when filters or search change
  useEffect(() => {
    setSelectedDeviceIds([]);
    setIsAllFilteredSelected(false);
  }, [filterType, search]);

  // Filtered devices calculation
  const filteredDevices = devices.filter(d => {
    const matchesSearch = d.deviceId.toLowerCase().includes(search.toLowerCase()) ||
      (d.location && d.location.toLowerCase().includes(search.toLowerCase())) ||
      (d.name && d.name.toLowerCase().includes(search.toLowerCase())) ||
      (d.tenant?.name && d.tenant.name.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    const st = (d.status || '').toUpperCase();

    if (filterType === 'archived') return st === 'ARCHIVED';
    
    // For default active fleet views, hide archived devices
    if (st === 'ARCHIVED') return false;

    if (filterType === 'assigned') return !!d.tenantId;
    if (filterType === 'unassigned') return !d.tenantId || st === 'UNASSIGNED';
    if (filterType === 'online') return st === 'ONLINE';
    if (filterType === 'offline') return st === 'OFFLINE' || st === 'WARNING';
    return true;
  });

  // Checkbox Selection Handlers
  const isAllVisibleSelected = filteredDevices.length > 0 && filteredDevices.every(d => selectedDeviceIds.includes(d.deviceId));

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected || isAllFilteredSelected) {
      setSelectedDeviceIds([]);
      setIsAllFilteredSelected(false);
    } else {
      setSelectedDeviceIds(filteredDevices.map(d => d.deviceId));
      setIsAllFilteredSelected(false);
    }
  };

  const handleSelectAllMatching = () => {
    setSelectedDeviceIds(filteredDevices.map(d => d.deviceId));
    setIsAllFilteredSelected(true);
  };

  const handleToggleDeviceSelect = (deviceId) => {
    if (selectedDeviceIds.includes(deviceId)) {
      setSelectedDeviceIds(prev => prev.filter(id => id !== deviceId));
      setIsAllFilteredSelected(false);
    } else {
      setSelectedDeviceIds(prev => [...prev, deviceId]);
    }
  };

  const handleClearSelection = () => {
    setSelectedDeviceIds([]);
    setIsAllFilteredSelected(false);
  };

  // Metric Stats
  const totalFleet = devices.length;
  const activeDevicesCount = devices.filter(d => (d.status || '').toUpperCase() !== 'ARCHIVED').length;
  const archivedCount = devices.filter(d => (d.status || '').toUpperCase() === 'ARCHIVED').length;
  const onlineCount = devices.filter(d => (d.status || '').toUpperCase() === 'ONLINE').length;
  const assignedCount = devices.filter(d => (d.status || '').toUpperCase() !== 'ARCHIVED' && !!d.tenantId).length;
  const unassignedCount = devices.filter(d => (d.status || '').toUpperCase() !== 'ARCHIVED' && (!d.tenantId || (d.status || '').toUpperCase() === 'UNASSIGNED')).length;

  // Handlers for single device ops
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
        buildingId: locationSelection.buildingId || undefined,
        floorId: locationSelection.floorId || undefined,
        roomId: locationSelection.roomId || undefined,
      });

      setSuccessMsg(`Device ${assigningDevice.deviceId} assigned successfully!`);
      setAssigningDevice(null);
      setTargetTenantId('');
      setLocationInput('');
      setLocationSelection({ buildingId: '', floorId: '', roomId: '' });
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
        buildingId: locationSelection.buildingId || undefined,
        floorId: locationSelection.floorId || undefined,
        roomId: locationSelection.roomId || undefined,
      });

      setSuccessMsg(`Device ${reassigningDevice.deviceId} reassigned successfully!`);
      setReassigningDevice(null);
      setTargetTenantId('');
      setLocationInput('');
      setLocationSelection({ buildingId: '', floorId: '', roomId: '' });
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
      await updateDeviceLocation(
        editingLocationDevice.deviceId,
        locationInput.trim() || null,
        locationSelection.buildingId || null,
        locationSelection.floorId || null,
        locationSelection.roomId || null
      );
      setSuccessMsg(`Location updated for ${editingLocationDevice.deviceId}`);
      setEditingLocationDevice(null);
      setLocationInput('');
      setLocationSelection({ buildingId: '', floorId: '', roomId: '' });
      await loadData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to update location');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSingleRestore = async (deviceId) => {
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await restoreDevice(deviceId);
      setSuccessMsg(res.message || `Device ${deviceId} restored successfully`);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to restore device');
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk Action Handlers
  const handleBulkUnassignSubmit = async () => {
    if (selectedDeviceIds.length === 0) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await bulkUnassignDevices(selectedDeviceIds);
      setSuccessMsg(res.message || `${selectedDeviceIds.length} device(s) unassigned successfully.`);
      setShowBulkUnassignConfirm(false);
      handleClearSelection();
      await loadData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to unassign devices');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkArchiveSubmit = async () => {
    if (selectedDeviceIds.length === 0) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await bulkArchiveDevices(selectedDeviceIds);
      setSuccessMsg(res.message || `${selectedDeviceIds.length} device(s) archived successfully.`);
      setShowBulkArchiveConfirm(false);
      handleClearSelection();
      await loadData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to archive devices');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkAssignSubmit = async (e) => {
    e.preventDefault();
    if (!targetTenantId) {
      setErrorMsg('Please select a target client organization');
      return;
    }
    if (selectedDeviceIds.length === 0) return;

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await bulkAssignDevices(targetTenantId, selectedDeviceIds, locationInput.trim() || undefined);
      setSuccessMsg(res.message || `${selectedDeviceIds.length} device(s) assigned successfully.`);
      setShowBulkAssignModal(false);
      setTargetTenantId('');
      setLocationInput('');
      handleClearSelection();
      await loadData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to assign devices');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkRestoreSubmit = async () => {
    if (selectedDeviceIds.length === 0) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await bulkRestoreDevices(selectedDeviceIds);
      setSuccessMsg(res.message || `${selectedDeviceIds.length} device(s) restored successfully.`);
      setShowBulkRestoreConfirm(false);
      handleClearSelection();
      await loadData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to restore devices');
    } finally {
      setSubmitting(false);
    }
  };

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
            Register, monitor, assign, reassign, archive, and manage multi-tenant hardware telemetry allocation.
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

      {/* Metric Cards (6 Statistics Counters) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* Total Fleet */}
        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0] shadow-soft">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Fleet</span>
            <Server className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-extrabold text-[#172033]">{totalFleet}</div>
          <span className="text-[10px] text-neutral-400 font-medium">All registered hardware</span>
        </div>

        {/* Active Devices */}
        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0] shadow-soft">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Devices</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">{activeDevicesCount}</div>
          <span className="text-[10px] text-neutral-400 font-medium">Non-archived fleet</span>
        </div>

        {/* Archived Devices */}
        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0] shadow-soft">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Archived</span>
            <Archive className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-700">{archivedCount}</div>
          <span className="text-[10px] text-neutral-400 font-medium">Safely lifecycle-preserved</span>
        </div>

        {/* Online Devices */}
        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0] shadow-soft">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Online</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">{onlineCount}</div>
          <span className="text-[10px] text-neutral-400 font-medium">Telemetry transmitting</span>
        </div>

        {/* Assigned Devices */}
        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0] shadow-soft">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Assigned</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-[#172033]">{assignedCount}</div>
          <span className="text-[10px] text-neutral-400 font-medium">Allocated to clients</span>
        </div>

        {/* Unassigned Devices */}
        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0] shadow-soft">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Unassigned</span>
            <Unlink className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{unassignedCount}</div>
          <span className="text-[10px] text-neutral-400 font-medium">Unallocated inventory</span>
        </div>

      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0] shadow-soft">
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
            { id: 'all', label: 'All Active' },
            { id: 'assigned', label: 'Assigned' },
            { id: 'unassigned', label: 'Unassigned' },
            { id: 'online', label: 'Online' },
            { id: 'offline', label: 'Offline' },
            { id: 'archived', label: `Archived (${archivedCount})` }
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

      {/* BULK ACTION TOOLBAR (Appears when 1+ devices selected) */}
      {selectedDeviceIds.length > 0 && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs">
              {selectedDeviceIds.length}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100">
                {selectedDeviceIds.length} device(s) selected
              </div>
              <div className="text-[11px] text-slate-400">
                {isAllFilteredSelected 
                  ? `All ${filteredDevices.length} matching devices selected across directory.` 
                  : `Selected from current view.`}
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 w-full sm:w-auto justify-end">
            {filterType !== 'archived' && (
              <>
                <button
                  onClick={() => {
                    setTargetTenantId('');
                    setLocationInput('');
                    setShowBulkAssignModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Assign to Client</span>
                </button>

                <button
                  onClick={() => setShowBulkUnassignConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Unassign</span>
                </button>

                <button
                  onClick={() => setShowBulkArchiveConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive</span>
                </button>
              </>
            )}

            {filterType === 'archived' && (
              <button
                onClick={() => setShowBulkRestoreConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore to Active Fleet</span>
              </button>
            )}

            <button
              onClick={handleClearSelection}
              className="px-3 py-2 text-slate-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Fleet Directory Table */}
      <div className="bg-[#F8FAFC] rounded-2xl shadow-soft border border-[#E2E8F0] overflow-hidden">

        {/* Selection Banner across pages */}
        {selectedDeviceIds.length > 0 && selectedDeviceIds.length < filteredDevices.length && !isAllFilteredSelected && (
          <div className="bg-primary/5 border-b border-primary/10 px-6 py-2.5 flex items-center justify-between text-xs text-primary font-medium">
            <span>
              All <strong>{selectedDeviceIds.length}</strong> devices currently displayed are selected.
            </span>
            <button
              onClick={handleSelectAllMatching}
              className="font-bold underline hover:text-primary/80 cursor-pointer ml-2"
            >
              Select all {filteredDevices.length} matching devices
            </button>
          </div>
        )}

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
                  <th className="px-4 py-4 w-10 text-center">
                    <button
                      onClick={handleToggleSelectAll}
                      className="text-neutral-400 hover:text-primary transition-colors cursor-pointer p-1"
                      title={isAllVisibleSelected ? "Deselect visible" : "Select all visible"}
                    >
                      {isAllVisibleSelected || isAllFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
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
                  const isSelected = selectedDeviceIds.includes(d.deviceId);

                  return (
                    <tr 
                      key={d.deviceId} 
                      className={cn(
                        "transition-colors",
                        isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-neutral-50/60"
                      )}
                    >
                      {/* Checkbox Column */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleDeviceSelect(d.deviceId)}
                          className="w-4 h-4 accent-primary rounded cursor-pointer"
                        />
                      </td>
                      
                      {/* Device ID */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "w-8 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center border",
                            statusUpper === 'ARCHIVED' ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-neutral-100 text-neutral-700 border-neutral-200/60"
                          )}>
                            <Cpu className="w-4 h-4" />
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
                          {statusUpper !== 'ARCHIVED' && (
                            <button
                              onClick={() => {
                                setEditingLocationDevice(d);
                                setLocationSelection({
                                  buildingId: d.buildingId || '',
                                  floorId: d.floorId || '',
                                  roomId: d.roomId || '',
                                });
                                setLocationInput(d.buildingId ? '' : (d.location && d.location !== 'Unallocated' ? d.location : ''));
                              }}
                              className="text-neutral-400 hover:text-neutral-600 p-0.5"
                              title="Edit Location"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Assigned Client */}
                      <td className="px-6 py-4">
                        {statusUpper === 'ARCHIVED' ? (
                          <span className="text-xs text-slate-400 font-mono italic">Archived Record</span>
                        ) : d.tenant ? (
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

                      {/* Status Badge */}
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide uppercase",
                          statusUpper === 'ONLINE' ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" :
                          statusUpper === 'OFFLINE' ? "bg-rose-50 text-rose-700 border border-rose-200/60" :
                          statusUpper === 'WARNING' ? "bg-amber-50 text-amber-700 border border-amber-200/60" :
                          statusUpper === 'ARCHIVED' ? "bg-slate-100 text-slate-700 border border-slate-300" :
                          "bg-neutral-100 text-neutral-600 border border-neutral-200/60"
                        )}>
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            statusUpper === 'ONLINE' ? "bg-emerald-500" :
                            statusUpper === 'OFFLINE' ? "bg-rose-500" :
                            statusUpper === 'WARNING' ? "bg-amber-500" :
                            statusUpper === 'ARCHIVED' ? "bg-slate-400" : "bg-neutral-400"
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
                          {statusUpper === 'ARCHIVED' ? (
                            <button
                              onClick={() => handleSingleRestore(d.deviceId)}
                              disabled={submitting}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg transition-colors border border-emerald-200/60 cursor-pointer shadow-xs"
                              title="Restore to active fleet"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                          ) : !d.tenantId ? (
                            <button
                              onClick={() => {
                                setAssigningDevice(d);
                                setLocationSelection({
                                  buildingId: d.buildingId || '',
                                  floorId: d.floorId || '',
                                  roomId: d.roomId || '',
                                });
                                setLocationInput(d.buildingId ? '' : (d.location && d.location !== 'Unallocated' ? d.location : ''));
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
                                  setLocationSelection({
                                    buildingId: d.buildingId || '',
                                    floorId: d.floorId || '',
                                    roomId: d.roomId || '',
                                  });
                                  setLocationInput(d.buildingId ? '' : (d.location && d.location !== 'Unallocated' ? d.location : ''));
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

      {/* BULK ASSIGN MODAL */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-neutral-200 animate-in fade-in">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Bulk Assign Devices</h3>
                <p className="text-xs text-neutral-500 font-mono">Assigning {selectedDeviceIds.length} device(s)</p>
              </div>
              <button onClick={() => setShowBulkAssignModal(false)} className="text-neutral-400 hover:text-neutral-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkAssignSubmit} className="p-6 space-y-4">
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
                  <option value="">-- Choose Client Organization --</option>
                  {tenants.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.slug})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Installation / Location Tag (Optional)
                </label>
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="e.g. Main Facility"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                <button type="button" onClick={() => setShowBulkAssignModal(false)} className="px-4 py-2 text-xs font-bold text-neutral-600">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !targetTenantId}
                  className="px-5 py-2.5 bg-primary text-white font-bold text-xs uppercase rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Assigning...' : `Assign ${selectedDeviceIds.length} Devices`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK UNASSIGN CONFIRMATION MODAL */}
      {showBulkUnassignConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-neutral-200 p-6 text-center animate-in fade-in">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Unlink className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-1">Unassign {selectedDeviceIds.length} Devices?</h3>
            <p className="text-xs text-neutral-500 mb-4">
              These devices will no longer belong to their currently assigned clients. Historical telemetry and reports will be preserved safely.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowBulkUnassignConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkUnassignSubmit}
                disabled={submitting}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase rounded-xl shadow-md disabled:opacity-50"
              >
                {submitting ? 'Unassigning...' : 'Unassign Devices'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK ARCHIVE CONFIRMATION MODAL */}
      {showBulkArchiveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-neutral-200 p-6 text-center animate-in fade-in">
            <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Archive className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-1">Archive {selectedDeviceIds.length} Devices?</h3>
            <p className="text-xs text-neutral-500 mb-4">
              These devices will be removed from the active device fleet but their historical telemetry and reports will be preserved.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowBulkArchiveConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkArchiveSubmit}
                disabled={submitting}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase rounded-xl shadow-md disabled:opacity-50"
              >
                {submitting ? 'Archiving...' : 'Archive Devices'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK RESTORE CONFIRMATION MODAL */}
      {showBulkRestoreConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-neutral-200 p-6 text-center animate-in fade-in">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-1">Restore {selectedDeviceIds.length} Devices?</h3>
            <p className="text-xs text-neutral-500 mb-4">
              These devices will be restored from Archived state back into the active UNASSIGNED device fleet.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowBulkRestoreConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkRestoreSubmit}
                disabled={submitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl shadow-md disabled:opacity-50"
              >
                {submitting ? 'Restoring...' : 'Restore Devices'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* SINGLE ASSIGN DEVICE MODAL */}
      {assigningDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-neutral-200 animate-in fade-in">
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
                  Custom Location Notes (Optional)
                </label>
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="e.g. Near Window"
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

      {/* SINGLE REASSIGN DEVICE MODAL */}
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

      {/* SINGLE UNASSIGN CONFIRMATION MODAL */}
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
