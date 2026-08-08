import React, { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { Activity, MessageSquare, Heart } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';

export function DiagnosticsPanel({ className }) {
  const system = useDashboardStore(state => state.system);
  const device = useDashboardStore(state => state.device);
  const stats = useDashboardStore(state => state.stats);
  const mqttStats = system.mqttStats || {};
  
  const [timeAgo, setTimeAgo] = useState('0 sec ago');
  const [uptimeStr, setUptimeStr] = useState('0 sec');
  const [sensorHealth, setSensorHealth] = useState('Offline');

  useEffect(() => {
    const tick = () => {
      const lastPacketTime = useDashboardStore.getState().device.lastPacketTime;
      if (!lastPacketTime) {
        setSensorHealth('Offline');
        return;
      }
      const { avgPacketInterval } = useDashboardStore.getState().stats;
      const baseInterval = avgPacketInterval > 0 ? avgPacketInterval : 15000;
      setSensorHealth((Date.now() - lastPacketTime) < baseInterval * 3 ? 'Online' : 'Offline');
    };
    tick();
    const healthInterval = setInterval(tick, 2000);
    return () => clearInterval(healthInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (device.lastPacketTime) {
        const diff = Math.floor((Date.now() - device.lastPacketTime) / 1000);
        setTimeAgo(`${diff} sec ago`);
      }
      
      if (mqttStats.uptime) {
        const up = mqttStats.uptime;
        if (up < 60) setUptimeStr(`${up} sec ago`);
        else if (up < 3600) setUptimeStr(`${Math.floor(up/60)} min ago`);
        else setUptimeStr(`${Math.floor(up/3600)} hours ago`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [device.lastPacketTime, mqttStats.uptime]);

  const payloadSize = device.info ? JSON.stringify(device.info).length : 0;

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-[24px]", className)}>

      {/* Sensor Health */}
      <div className="bg-white rounded-[16px] shadow-soft p-[24px] flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <Heart className="w-5 h-5 text-neutral-800" />
          <h2 className="text-[16px] font-bold text-neutral-800">Sensor Health</h2>
        </div>
        <div className="flex flex-col gap-4 flex-1 justify-center">
          {['AQI Sensor', 'CO₂ Sensor', 'VOC Sensor', 'PM Sensor'].map((label, idx) => (
            <div key={idx} className="flex items-center justify-between bg-neutral-50 p-3 rounded-lg border border-neutral-100">
              <span className="text-[13px] font-semibold text-neutral-600">{label}</span>
              <span className={cn(
                "text-[12px] font-bold uppercase tracking-wider px-2 py-1 rounded-md",
                sensorHealth === 'Online' ? "bg-status-good/10 text-status-good" : "bg-danger/10 text-danger"
              )}>{sensorHealth}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Connection Diagnostics */}
      <div className="bg-white rounded-[16px] shadow-soft p-[24px] flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-neutral-800" />
          <h2 className="text-[16px] font-bold text-neutral-800">Connection Diagnostics</h2>
        </div>
        <div className="flex flex-col gap-4 flex-1 justify-center">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <span className="text-[13px] font-medium text-neutral-500">Broker</span>
            <span className={cn("text-[13px] font-bold", system.mqtt.status === 'Connected' ? "text-status-good" : "text-status-critical")}>{system.mqtt.status}</span>
          </div>
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <span className="text-[13px] font-medium text-neutral-500">Socket.IO</span>
            <span className={cn("text-[13px] font-bold", system.socket.status === 'Connected' ? "text-status-good" : "text-status-critical")}>{system.socket.status}</span>
          </div>
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <span className="text-[13px] font-medium text-neutral-500">Backend</span>
            <span className={cn("text-[13px] font-bold", system.backend.status === 'Running' ? "text-status-good" : "text-status-critical")}>{system.backend.status}</span>
          </div>
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <span className="text-[13px] font-medium text-neutral-500">Last Packet</span>
            <span className="text-[13px] font-bold text-neutral-800 tabular-nums">{timeAgo}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-neutral-500">Reconnect Attempts</span>
            <span className="text-[13px] font-bold text-neutral-800 tabular-nums">{mqttStats.reconnectAttempts || 0}</span>
          </div>
        </div>
      </div>

      {/* Latest MQTT Message */}
      <div className="bg-white rounded-[16px] shadow-soft p-[24px] flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-5 h-5 text-neutral-800" />
          <h2 className="text-[16px] font-bold text-neutral-800">Latest MQTT Message</h2>
        </div>
        <div className="flex flex-col gap-4 flex-1 justify-center">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <span className="text-[13px] font-medium text-neutral-500">Device</span>
            <span className="text-[13px] font-bold text-neutral-800">{device.info.deviceId || 'Unknown'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <span className="text-[13px] font-medium text-neutral-500">Topic</span>
            <span className="text-[13px] font-bold text-primary truncate max-w-[150px]" title={mqttStats.topic || 'Unknown'}>{mqttStats.topic || 'Unknown'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <span className="text-[13px] font-medium text-neutral-500">Received</span>
            <span className="text-[13px] font-bold text-neutral-800 tabular-nums">{timeAgo}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-neutral-500">Payload Size</span>
            <span className="text-[13px] font-bold text-neutral-800 tabular-nums">{payloadSize} bytes</span>
          </div>
        </div>
      </div>


    </div>
  );
}
