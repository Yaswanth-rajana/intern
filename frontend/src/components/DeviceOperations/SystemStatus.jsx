import React, { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { useDashboardStore } from '../../store/dashboardStore';

export function SystemStatus() {
  const system = useDashboardStore(state => state.system);
  const device = useDashboardStore(state => state.device);

  const [devStatus, setDevStatus] = useState('Offline');
  const [signalQuality, setSignalQuality] = useState('Poor');
  const [sensorHealth, setSensorHealth] = useState('Offline');

  useEffect(() => {
    const tick = () => {
      const lastPacketTime = useDashboardStore.getState().device.lastPacketTime;

      if (!lastPacketTime) {
        setDevStatus('Offline');
        setSignalQuality('None');
        setSensorHealth('Offline');
        return;
      }
      const age = Date.now() - lastPacketTime;

      // Use the device's own measured avg packet interval as the baseline.
      // Falls back to 15 000 ms if we haven't collected enough data yet.
      const { avgPacketInterval } = useDashboardStore.getState().stats;
      const baseInterval = avgPacketInterval > 0 ? avgPacketInterval : 15000;

      // Online  → within 2.5× the device's own interval
      // Warning → within 5×  (packet is late but device may not be dead)
      // Offline → beyond 5×
      if (age < baseInterval * 2.5) {
        setDevStatus('Online');
        setSignalQuality('Excellent');
      } else if (age < baseInterval * 5) {
        setDevStatus('Warning');
        setSignalQuality('Fair');
      } else {
        setDevStatus('Offline');
        setSignalQuality('Poor');
      }

      setSensorHealth(age < baseInterval * 3 ? 'Online' : 'Offline');
    };

    // Run immediately so there's no initial blank state
    tick();
    const interval = setInterval(tick, 2000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← empty deps: interval created once, reads fresh store state each tick

  const operations = [
    { label: 'MQTT Broker', value: system.mqtt.status, status: system.mqtt.status === 'Connected' ? 'bg-success' : 'bg-danger' },
    { label: 'Backend API', value: system.backend.status, status: system.backend.status === 'Running' ? 'bg-success' : 'bg-danger' },
    { label: 'Device Status', value: devStatus, status: devStatus === 'Online' ? 'bg-success' : devStatus === 'Warning' ? 'bg-status-moderate' : 'bg-danger' },
    { label: 'Signal Quality', value: signalQuality, status: signalQuality === 'Excellent' ? 'bg-success' : signalQuality === 'Fair' ? 'bg-status-moderate' : 'bg-danger' },
  ];

  const sensors = [
    { label: 'AQI Sensor', status: sensorHealth, state: sensorHealth === 'Online' ? 'good' : 'bad' },
    { label: 'CO₂ Sensor', status: sensorHealth, state: sensorHealth === 'Online' ? 'good' : 'bad' },
    { label: 'VOC Sensor', status: sensorHealth, state: sensorHealth === 'Online' ? 'good' : 'bad' },
    { label: 'PM Sensor', status: sensorHealth, state: sensorHealth === 'Online' ? 'good' : 'bad' },
  ];

  return (
    <div className="flex flex-col gap-[24px] opacity-[0.80]">
      <div className="bg-white rounded-[16px] shadow-soft p-[24px] min-h-[220px]">
        <h2 className="text-[16px] font-bold text-neutral-800 mb-6">System Status</h2>
        <div className="flex flex-col gap-5 flex-1 justify-center">
          {operations.map((op, idx) => (
            <div key={idx} className="flex items-center justify-between border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-3">
                <span className={cn("w-2.5 h-2.5 rounded-full", op.status)}></span>
                <span className="text-[14px] font-medium text-neutral-600">{op.label}</span>
              </div>
              <span className="text-[14px] font-bold text-neutral-800">{op.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[16px] shadow-soft p-[24px]">
        <h2 className="text-[16px] font-bold text-neutral-800 mb-6">Sensor Health</h2>
        <div className="flex flex-col gap-4">
          {sensors.map((sensor, idx) => (
            <div key={idx} className="flex items-center justify-between bg-neutral-50 p-3 rounded-lg border border-neutral-100">
              <span className="text-[13px] font-semibold text-neutral-600">{sensor.label}</span>
              <span className={cn(
                "text-[12px] font-bold uppercase tracking-wider px-2 py-1 rounded-md",
                sensor.state === 'good' ? "bg-status-good/10 text-status-good" : "bg-danger/10 text-danger"
              )}>
                {sensor.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
