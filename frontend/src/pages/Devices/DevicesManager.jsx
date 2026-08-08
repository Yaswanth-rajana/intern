import React, { useState } from 'react';
import { Server, MapPin, Edit3, Wifi, Check, X, ShieldAlert, Cpu } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useAuthStore } from '../../store/authStore';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { cn } from '../../utils/cn';

export function DevicesManager() {
  const deviceList = useDashboardStore(state => state.deviceList);
  const updateDeviceLocation = useDashboardStore(state => state.updateDeviceLocation);
  
  const user = useAuthStore(state => state.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClientAdmin = user?.role === 'CLIENT_ADMIN';
  const canEditLocation = isSuperAdmin || isClientAdmin;

  const [editingId, setEditingId] = useState(null);
  const [newLocation, setNewLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = (device) => {
    setEditingId(device.deviceId);
    setNewLocation(device.location || '');
  };

  const handleSave = async (deviceId) => {
    setIsSaving(true);
    const success = await updateDeviceLocation(deviceId, newLocation.trim());
    setIsSaving(false);
    if (success) {
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-neutral-800">Organization Hardware Monitors</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Monitor physical device locations and operational connection status.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[16px] shadow-soft overflow-hidden">
        {deviceList.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto">
            <div className="w-12 h-12 bg-neutral-100 text-neutral-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-800 mb-1">No Devices Assigned</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Your system administrator has not allocated any air quality monitoring hardware to your organization yet.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                <th className="px-6 py-5 font-semibold">Device Info</th>
                <th className="px-6 py-5 font-semibold">Status</th>
                <th className="px-6 py-5 font-semibold">Hardware Rev</th>
                <th className="px-6 py-5 font-semibold">Packets Received</th>
                <th className="px-6 py-5 font-semibold">Location</th>
                <th className="px-6 py-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {deviceList.map((device) => {
                const isEditing = editingId === device.deviceId;
                const statusLower = (device.status || 'OFFLINE').toLowerCase();

                return (
                  <tr key={device.deviceId} className="hover:bg-neutral-50/50 transition-colors">
                    
                    {/* Device Info */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-500">
                          <Cpu className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[14px] font-bold text-neutral-800">{device.name || device.deviceId}</span>
                          <span className="text-[11px] text-neutral-400 font-mono">ID: {device.deviceId}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-5">
                      <StatusBadge status={statusLower} />
                    </td>

                    {/* Hardware */}
                    <td className="px-6 py-5">
                      <span className="text-[13px] font-mono font-semibold text-neutral-600">
                        {device.hardwareVersion || 'T113i'} ({device.firmwareVersion || 'v1.0.0'})
                      </span>
                    </td>

                    {/* Message Count */}
                    <td className="px-6 py-5">
                      <span className="text-[13px] font-bold text-neutral-700 tabular-nums">
                        {device.messageCount?.toLocaleString() || 0}
                      </span>
                    </td>

                    {/* Location Column */}
                    <td className="px-6 py-5">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newLocation}
                            onChange={(e) => setNewLocation(e.target.value)}
                            placeholder="e.g. Building A - Floor 2"
                            className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-[13px] font-semibold text-neutral-800 outline-none focus:border-primary focus:bg-white transition-all w-60"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-neutral-600">
                          <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                          <span className="text-[13px] font-semibold text-neutral-700">
                            {device.location || <span className="text-neutral-400 font-normal italic">Unallocated (Unknown)</span>}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-5 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSave(device.deviceId)}
                            disabled={isSaving}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors border border-emerald-200 cursor-pointer"
                            title="Save Location"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg transition-colors cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          {canEditLocation ? (
                            <button
                              onClick={() => handleEditClick(device)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[12px] rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Allocate
                            </button>
                          ) : (
                            <span className="text-[11px] text-neutral-400 font-medium inline-flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-neutral-400" /> Read-Only
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
