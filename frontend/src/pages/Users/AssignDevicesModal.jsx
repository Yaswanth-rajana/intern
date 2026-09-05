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
  CheckCircle2,
  Building2,
  DoorOpen
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

  // Group devices by spatial location string
  const groupedDevices = useMemo(() => {
    const groups = {};
    filteredDevices.forEach(d => {
      const locKey = d.location || 'Unallocated Location';
      if (!groups[locKey]) groups[locKey] = [];
      groups[locKey].push(d);
    });
    return groups;
  }, [filteredDevices]);

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

  const toggleGroup = (groupDeviceList) => {
    const groupIds = groupDeviceList.map(d => d.deviceId);
    const allSelected = groupIds.every(id => selectedDeviceIds.has(id));

    setSelectedDeviceIds(prev => {
      const next = new Set(prev);
      groupIds.forEach(id => {
        if (allSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      });
      return next;
    });
  };

  const handleSelectAll = () => {
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
      <div 
        onClick={!saving ? onClose : undefined}
        className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm transition-opacity duration-200"
      />

      <div className="relative bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-200/80 dark:border-neutral-700/80 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] z-10">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-700 flex items-start justify-between bg-neutral-50/50 dark:bg-neutral-800/50">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Viewer Device Authorization</span>
            </div>
            <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
              Assign Devices to Viewer
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-neutral-500 font-medium">Target Viewer:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-xs">
                {targetUser.username}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all cursor-pointer"
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

        {/* Search & Toolbar */}
        <div className="px-6 pt-4 pb-3 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search devices by ID, name, or location..."
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl text-xs font-medium text-neutral-800 dark:text-white placeholder-neutral-400 outline-none focus:border-primary transition-all"
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

          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2 font-bold text-neutral-600 dark:text-neutral-300">
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
                className="px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
              >
                Select All
              </button>
              <span className="text-neutral-300">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={loading || selectedCount === 0}
                className="px-2.5 py-1 text-[11px] font-bold text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Grouped Device List */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-[240px]">
          {loading ? (
            <div className="py-16 text-center text-neutral-400 font-medium text-xs flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span>Loading tenant devices...</span>
            </div>
          ) : devices.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 text-xs flex flex-col items-center justify-center gap-2">
              <Cpu className="w-8 h-8 text-neutral-300" />
              <p className="font-bold text-neutral-600 dark:text-neutral-300">No devices in this organization</p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-xs">
              No devices match your search query "{searchQuery}".
            </div>
          ) : (
            Object.entries(groupedDevices).map(([locName, groupDevs]) => {
              const allGroupSelected = groupDevs.every(d => selectedDeviceIds.has(d.deviceId));
              const someGroupSelected = groupDevs.some(d => selectedDeviceIds.has(d.deviceId));

              return (
                <div key={locName} className="border border-neutral-200/80 dark:border-neutral-700/80 rounded-xl overflow-hidden bg-neutral-50/50 dark:bg-neutral-800/50">
                  {/* Group Header */}
                  <div className="px-3.5 py-2.5 bg-neutral-100 dark:bg-neutral-700/60 flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-700/60">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleGroup(groupDevs)}
                        className="text-primary cursor-pointer p-0.5"
                      >
                        {allGroupSelected ? (
                          <CheckSquare className="w-4 h-4 fill-primary/10" />
                        ) : (
                          <Square className="w-4 h-4 text-neutral-400" />
                        )}
                      </button>
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-bold text-xs text-neutral-800 dark:text-white truncate max-w-sm">
                        {locName}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      {groupDevs.length} device(s)
                    </span>
                  </div>

                  {/* Device List in Location */}
                  <div className="p-2 space-y-1 bg-white dark:bg-neutral-800">
                    {groupDevs.map(device => {
                      const isSelected = selectedDeviceIds.has(device.deviceId);
                      const isOnline = device.status === 'ONLINE' || device.status === 'Online';

                      return (
                        <div
                          key={device.deviceId}
                          onClick={() => toggleDevice(device.deviceId)}
                          className={cn(
                            "flex items-center justify-between py-2 px-3 rounded-lg transition-all cursor-pointer select-none",
                            isSelected 
                              ? "bg-primary/5 border border-primary/20" 
                              : "hover:bg-neutral-50 dark:hover:bg-neutral-700/40 border border-transparent"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="shrink-0 text-primary">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 fill-primary/10" />
                              ) : (
                                <Square className="w-4 h-4 text-neutral-300" />
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "font-mono font-bold text-xs",
                                isSelected ? "text-primary" : "text-neutral-800 dark:text-white"
                              )}>
                                {device.deviceId}
                              </span>
                              {device.name && device.name !== device.deviceId && (
                                <span className="text-xs font-semibold text-neutral-500">
                                  ({device.name})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              isOnline ? "bg-emerald-500" : "bg-neutral-400"
                            )} />
                            <span className="text-[10px] font-bold text-neutral-400 capitalize">
                              {device.status || 'Offline'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-800/70 flex items-center justify-between gap-3">
          <span className="text-xs text-neutral-400 font-medium">
            {selectedCount === 0 ? 'No devices selected' : `${selectedCount} device(s) authorized for ${targetUser.username}`}
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 font-bold text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Save Authorization</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
