import React, { useState } from 'react';
import { Server, MapPin, Edit3, Wifi, Check, X, ShieldAlert } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useAuthStore } from '../../store/authStore';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { cn } from '../../utils/cn';

export function DevicesManager() {
  const deviceList = useDashboardStore(state => state.deviceList);
  const updateDeviceLocation = useDashboardStore(state => state.updateDeviceLocation);
  
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role === 'Admin';

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
          <h1 className="text-[28px] font-bold text-neutral-800">Device Location Allocation</h1>
          <p className="text-neutral-500 text-sm mt-1">Manage and assign devices to specific areas in the building.</p>
        </div>
      </div>

      <div className="bg-white rounded-[16px] shadow-soft overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              <th className="px-6 py-5 font-semibold">Device Info</th>
              <th className="px-6 py-5 font-semibold">Status</th>
              <th className="px-6 py-5 font-semibold">Firmware</th>
              <th className="px-6 py-5 font-semibold">Packets Sent</th>
              <th className="px-6 py-5 font-semibold">Location</th>
              <th className="px-6 py-5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {deviceList.map((device) => {
              const isEditing = editingId === device.deviceId;
              const statusLower = device.status?.toLowerCase() || 'offline';

              return (
                <tr key={device.deviceId} className="hover:bg-neutral-50/50 transition-colors">
                  
                  {/* Device Info */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-500">
                        <Server className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-neutral-800">{device.deviceId}</span>
                        <span className="text-[11px] text-neutral-400 font-medium">Last seen: {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : 'Never'}</span>
                      </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-6 py-5">
                    <StatusBadge status={statusLower} />
                  </td>

                  {/* Firmware */}
                  <td className="px-6 py-5">
                    <span className="text-[13px] font-semibold text-neutral-600">{device.firmwareVersion || 'v1.0.0'}</span>
                  </td>

                  {/* Message Count */}
                  <td className="px-6 py-5">
                    <span className="text-[13px] font-bold text-neutral-700 tabular-nums">{device.messageCount?.toLocaleString() || 0}</span>
                  </td>

                  {/* Location Column */}
                  <td className="px-6 py-5">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newLocation}
                          onChange={(e) => setNewLocation(e.target.value)}
                          placeholder="e.g. Floor 2 - Room 204"
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
                          className="p-1.5 bg-success/10 hover:bg-success/20 text-success rounded-lg transition-colors"
                          title="Save Location"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        {isAdmin ? (
                          <button
                            onClick={() => handleEditClick(device)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-[12px] rounded-lg transition-colors"
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

            {deviceList.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-neutral-400 font-medium text-sm">
                  No active devices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
