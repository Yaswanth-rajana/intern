import React from 'react';
import { cn } from '../../utils/cn';
import { useDashboardStore } from '../../store/dashboardStore';

export function SystemStatus() {
  const system = useDashboardStore(state => state.system);
  const device = useDashboardStore(state => state.device);
  const deviceList = useDashboardStore(state => state.deviceList);
  const selectedDeviceId = useDashboardStore(state => state.selectedDeviceId);

  const selectedDeviceObj = deviceList.find(d => d.deviceId === selectedDeviceId) || device.info || {};
  const currentDevStatus = (selectedDeviceObj.status || device.info.status || 'ONLINE').toUpperCase();

  const isOnline = currentDevStatus === 'ONLINE';
  const isWarning = currentDevStatus === 'WARNING';

  const devStatusLabel = isOnline ? 'Online' : isWarning ? 'Warning' : 'Offline';
  const signalQuality = isOnline ? 'Excellent' : isWarning ? 'Fair' : 'Poor';

  const operations = [
    { label: 'MQTT Broker', value: system.mqtt.status, status: system.mqtt.status === 'Connected' ? 'bg-success' : 'bg-danger' },
    { label: 'Backend API', value: system.backend.status, status: system.backend.status === 'Running' ? 'bg-success' : 'bg-danger' },
    { label: 'Device Status', value: devStatusLabel, status: isOnline ? 'bg-success' : isWarning ? 'bg-status-moderate' : 'bg-danger' },
    { label: 'Signal Quality', value: signalQuality, status: isOnline ? 'bg-success' : isWarning ? 'bg-status-moderate' : 'bg-danger' },
  ];

  return (
    <div className="bg-white rounded-[16px] shadow-soft p-[24px] h-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[16px] font-bold text-neutral-800">System Status</h2>
        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
          Live Status
        </span>
      </div>
      <div className="flex flex-col gap-4 flex-1 justify-center">
        {operations.map((op, idx) => (
          <div key={idx} className="flex items-center justify-between border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
            <div className="flex items-center gap-3">
              <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", op.status)}></span>
              <span className="text-[14px] font-medium text-neutral-600">{op.label}</span>
            </div>
            <span className="text-[14px] font-bold text-neutral-800">{op.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
