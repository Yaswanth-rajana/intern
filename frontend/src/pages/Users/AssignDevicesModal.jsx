import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  CheckSquare, 
  Square, 
  Cpu, 
  ShieldCheck, 
  RefreshCw, 
  Layers, 
  MapPin, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { fetchDevices, fetchViewerDevices, updateViewerDevices } from '../../services/api';
import { cn } from '../../utils/cn';

export function AssignDevicesModal({ isOpen, onClose, targetUser, onSaved }) {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !targetUser) return;

    let isMounted = true;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setSearchQuery('');

    const loadData = async () => {
      try {
        // Fetch all tenant devices and current assignments for this viewer
        const [devicesData, viewerData] = await Promise.all([
          fetchDevices(),
          fetchViewerDevices(targetUser._id || targetUser.userId || targetUser.id)
        ]);

        if (!isMounted) return;

        const allDevs = Array.isArray(devicesData) ? devicesData : [];
        setDevices(allDevs);

        const assigned = new Set(viewerData?.deviceIds || targetUser.assignedDeviceIds || []);
        setSelectedDeviceIds(assigned);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load device assignments:', err);
        setErrorMsg(err.response?.data?.error || 'Failed to load tenant devices or assignments.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetUser]);

  // Filter devices based on search query
  const filteredDevices = useMemo(() => {
    if (!searchQuery.trim()) return devices;
    const q = searchQuery.toLowerCase().trim();
    return devices.filter(d => 
      d.deviceId?.toLowerCase().includes(q) ||
      d.name?.toLowerCase().includes(q) ||
      d.location?.toLowerCase().includes(q)
    );
  }, [devices, searchQuery]);

  const toggleDevice = (deviceId) => {
    setSelectedDeviceIds(prev => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    // Select all filtered devices or all devices
    setSelectedDeviceIds(new Set(devices.map(d => d.deviceId)));
  };

  const handleClearAll = () => {
    setSelectedDeviceIds(new Set());
  };

  const handleSave = async () => {
    if (!targetUser) return;
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const targetUserId = targetUser._id || targetUser.userId || targetUser.id;
      const deviceIdsArray = Array.from(selectedDeviceIds);

      const res = await updateViewerDevices(targetUserId, deviceIdsArray);
      setSuccessMsg(res.message || 'Assignments updated successfully!');
      
      if (onSaved) {
        onSaved(targetUserId, deviceIdsArray);
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to save device assignments:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to save device assignments.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !targetUser) return null;

  const totalCount = devices.length;
  const selectedCount = selectedDeviceIds.size;
  const isAllSelected = totalCount > 0 && selectedCount === totalCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Glassmorphism Backdrop */}
      <div 
        onClick={!saving ? onClose : undefined}
        className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm transition-opacity duration-200"
      />

      {/* Modal Dialog Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-neutral-200/80 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between bg-neutral-50/50">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Viewer Device Authorization</span>
            </div>
            <h2 className="text-xl font-extrabold text-neutral-900">
              Assign Devices
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-neutral-500 font-medium">Viewer Account:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-xs">
                {targetUser.username}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all disabled:opacity-40 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Search & Actions Toolbar */}
        <div className="px-6 pt-4 pb-3 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search devices by ID, name, or location..."
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter & Counter Toolbar */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2 font-bold text-neutral-600">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>
                Selected: <span className="text-primary font-extrabold">{selectedCount}</span> of {totalCount} {totalCount === 1 ? 'device' : 'devices'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={loading || totalCount === 0 || isAllSelected}
                className="px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Select All
              </button>
              <span className="text-neutral-300">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={loading || selectedCount === 0}
                className="px-2.5 py-1 text-[11px] font-bold text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Device List Container */}
        <div className="flex-1 overflow-y-auto px-6 py-2 divide-y divide-neutral-100 min-h-[220px]">
          {loading ? (
            <div className="py-16 text-center text-neutral-400 font-medium text-xs flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span>Loading tenant devices...</span>
            </div>
          ) : devices.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 text-xs flex flex-col items-center justify-center gap-2">
              <Cpu className="w-8 h-8 text-neutral-300" />
              <p className="font-bold text-neutral-600">No devices in this organization</p>
              <p className="text-neutral-400 max-w-xs">There are currently no devices provisioned under this tenant.</p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-xs">
              No devices match your search query "{searchQuery}".
            </div>
          ) : (
            filteredDevices.map(device => {
              const isSelected = selectedDeviceIds.has(device.deviceId);
              const isOnline = device.status === 'ONLINE' || device.status === 'Online';
              const isWarning = device.status === 'WARNING' || device.status === 'Warning';

              return (
                <div
                  key={device.deviceId}
                  onClick={() => toggleDevice(device.deviceId)}
                  className={cn(
                    "flex items-center justify-between py-3 px-3.5 my-1 rounded-xl transition-all cursor-pointer select-none",
                    isSelected 
                      ? "bg-primary/5 border border-primary/20" 
                      : "hover:bg-neutral-50/80 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Checkbox */}
                    <div className="shrink-0 text-primary">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-primary fill-primary/10" />
                      ) : (
                        <Square className="w-5 h-5 text-neutral-300 hover:text-neutral-400" />
                      )}
                    </div>

                    {/* Device Details */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-mono font-bold text-xs sm:text-sm",
                          isSelected ? "text-primary" : "text-neutral-900"
                        )}>
                          {device.deviceId}
                        </span>
                        {device.name && device.name !== device.deviceId && (
                          <span className="text-xs font-semibold text-neutral-700">
                            — {device.name}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-medium mt-0.5">
                        <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span>{device.location || 'Unallocated location'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator Badge */}
                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      isOnline ? "bg-emerald-500 shadow-xs shadow-emerald-500/50" :
                      isWarning ? "bg-amber-500" : "bg-neutral-400"
                    )} />
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider hidden sm:inline">
                      {device.status || 'Offline'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/70 flex items-center justify-between gap-3">
          <span className="text-xs text-neutral-400 font-medium">
            {selectedCount === 0 ? 'No devices assigned (Viewer cannot see any data)' : `${selectedCount} device(s) selected`}
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-100 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Assignments...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Save Assignments</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
