import React, { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { Activity, MessageSquare, Database, Server, Clock, BarChart2 } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';

export function DiagnosticsPanel({ className }) {
  const system = useDashboardStore(state => state.system);
  const device = useDashboardStore(state => state.device);
  const stats = useDashboardStore(state => state.stats);
  const mqttStats = system.mqttStats || {};
  
  const [timeAgo, setTimeAgo] = useState('0 sec ago');
  const [uptimeStr, setUptimeStr] = useState('0 sec');

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

      {/* Message Counter */}
      <div className="bg-white rounded-[16px] shadow-soft p-[24px] flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <BarChart2 className="w-5 h-5 text-neutral-800" />
          <h2 className="text-[16px] font-bold text-neutral-800">Message Statistics</h2>
        </div>
        <div className="flex flex-col gap-4 flex-1 justify-center">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <span className="text-[13px] font-medium text-neutral-500">Messages Received</span>
            <span className="text-[13px] font-bold text-neutral-800 tabular-nums">{(mqttStats.totalMessages || 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <span className="text-[13px] font-medium text-neutral-500">Messages Today</span>
            <span className="text-[13px] font-bold text-neutral-800 tabular-nums">{(stats.messagesToday || 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <span className="text-[13px] font-medium text-neutral-500">Average / sec</span>
            <span className="text-[13px] font-bold text-neutral-800 tabular-nums">{mqttStats.messagesPerSecond || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-neutral-500">Last Restart</span>
            <span className="text-[13px] font-bold text-neutral-800 tabular-nums">{uptimeStr}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
