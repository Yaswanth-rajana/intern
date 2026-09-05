import React, { useState } from 'react';
import { Server, MapPin, Edit3, X, ShieldAlert, Cpu } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useAuthStore } from '../../store/authStore';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';

export function DevicesManager() {
  const deviceList = useDashboardStore(state => state.deviceList);
  const updateDeviceLocation = useDashboardStore(state => state.updateDeviceLocation);
  
  const user = useAuthStore(state => state.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClientAdmin = user?.role === 'CLIENT_ADMIN';
  const canEditLocation = isSuperAdmin || isClientAdmin;

  const [editingDevice, setEditingDevice] = useState(null);
  const [customLocationText, setCustomLocationText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = (device) => {
    setEditingDevice(device);
    setCustomLocationText(device.location || '');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingDevice) return;
    setIsSaving(true);

    const success = await updateDeviceLocation(
      editingDevice.deviceId,
      customLocationText.trim()
    );

    setIsSaving(false);
    if (success) {
      setEditingDevice(null);
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold text-neutral-900 tracking-tight">
            Organization Hardware Monitors
          </h1>
          <p className="text-neutral-500 text-sm mt-1 font-medium">
            Monitor physical device locations and operational connection status.
          </p>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-[#F8FAFC] rounded-2xl shadow-sm overflow-hidden border border-[#E2E8F0]">
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
              <tr className="bg-neutral-50/80 border-b border-neutral-200/80 text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                <th className="px-6 py-4.5 font-bold">Device Info</th>
                <th className="px-6 py-4.5 font-bold">Status</th>
                <th className="px-6 py-4.5 font-bold">Hardware Rev</th>
                <th className="px-6 py-4.5 font-bold">Packets Received</th>
                <th className="px-6 py-4.5 font-bold">Location Breadcrumb</th>
                <th className="px-6 py-4.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-[#F8FAFC]">
              {deviceList.map((device) => {
                const statusLower = (device.status || 'OFFLINE').toLowerCase();

                return (
                  <tr key={device.deviceId} className="hover:bg-neutral-50/60 transition-colors">
                    
                    {/* Device Info */}
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neutral-100/80 border border-neutral-200/60 flex items-center justify-center text-neutral-600">
                          <Cpu className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[14px] font-bold text-neutral-900">{device.name || device.deviceId}</span>
                          <span className="text-[11px] text-neutral-500 font-mono">ID: {device.deviceId}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4.5">
                      <StatusBadge status={statusLower} />
                    </td>

                    {/* Hardware */}
                    <td className="px-6 py-4.5">
                      <span className="text-[13px] font-mono font-semibold text-neutral-700">
                        {device.hardwareVersion || 'T113i'} ({device.firmwareVersion || 'v1.0.0'})
                      </span>
                    </td>

                    {/* Message Count */}
                    <td className="px-6 py-4.5">
                      <span className="text-[13px] font-bold text-neutral-800 tabular-nums">
                        {device.messageCount?.toLocaleString() || 0}
                      </span>
                    </td>

                    {/* Location Column */}
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-2 text-neutral-700">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-[13px] font-semibold text-neutral-800">
                          {device.location || <span className="text-neutral-400 font-normal italic">Unallocated (Unknown)</span>}
                        </span>
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-4.5 text-right">
                      {canEditLocation ? (
                        <button
                          onClick={() => handleEditClick(device)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[12px] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Allocate / Edit
                        </button>
                      ) : (
                        <span className="text-[11px] text-neutral-400 font-medium inline-flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-neutral-400" /> Read-Only
                        </span>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* LOCATION ALLOCATION MODAL */}
      {editingDevice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 border border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="font-bold text-base text-neutral-900">Allocate Device Location</h3>
                <p className="text-xs text-neutral-500 font-mono">Device ID: {editingDevice.deviceId}</p>
              </div>
              <button onClick={() => setEditingDevice(null)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Location / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={customLocationText}
                  onChange={(e) => setCustomLocationText(e.target.value)}
                  placeholder="e.g. Near East Window"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-semibold text-xs text-neutral-800 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setEditingDevice(null)}
                  className="px-4 py-2 text-neutral-500 font-bold text-xs hover:text-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
