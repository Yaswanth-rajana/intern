import React, { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { Activity, MessageSquare } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';

export function DiagnosticsPanel({ className }) {
  const system = useDashboardStore(state => state.system);
  const device = useDashboardStore(state => state.device);
  const mqttStats = system.mqttStats || {};
  
  const [timeAgo, setTimeAgo] = useState('0 sec ago');

  useEffect(() => {
    const interval = setInterval(() => {
      if (device.lastPacketTime) {
        const diff = Math.floor((Date.now() - device.lastPacketTime) / 1000);
        setTimeAgo(`${diff} sec ago`);
      } else {
        setTimeAgo('No packets');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [device.lastPacketTime]);

  const payloadSize = device.info ? JSON.stringify(device.info).length : 0;

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", className)}>
      
      {/* Connection Diagnostics */}
      <div className="bg-white rounded-[16px] shadow-soft p-[24px] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-neutral-800" />
            <h3 className="text-[16px] font-bold text-neutral-800">Connection Diagnostics</h3>
          </div>
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
            Network Layer
          </span>
        </div>
        <div className="flex flex-col gap-4 flex-1 justify-center">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <span className="text-[13px] font-medium text-neutral-500">Broker</span>
            <span className={cn("text-[13px] font-bold", system.mqtt.status === 'Connected' ? "text-status-good" : "text-status-critical")}>
              {system.mqtt.status}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <span className="text-[13px] font-medium text-neutral-500">Socket.IO</span>
            <span className={cn("text-[13px] font-bold", system.socket.status === 'Connected' ? "text-status-good" : "text-status-critical")}>
              {system.socket.status}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <span className="text-[13px] font-medium text-neutral-500">Backend</span>
            <span className={cn("text-[13px] font-bold", system.backend.status === 'Running' ? "text-status-good" : "text-status-critical")}>
              {system.backend.status}
            </span>
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-neutral-800" />
            <h3 className="text-[16px] font-bold text-neutral-800">Latest MQTT Message</h3>
          </div>
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
            Telemetry Feed
          </span>
        </div>
        <div className="flex flex-col gap-4 flex-1 justify-center">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <span className="text-[13px] font-medium text-neutral-500">Device</span>
            <span className="text-[13px] font-bold text-neutral-800">{device.info?.deviceId || 'Unknown'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <span className="text-[13px] font-medium text-neutral-500">Topic</span>
            <span className="text-[13px] font-bold text-primary truncate max-w-[200px]" title={mqttStats.topic || 'Unknown'}>
              {mqttStats.topic || 'Unknown'}
            </span>
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
