import React from 'react';
import { Server, Radio, Database } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';

export function ConnectionStatus() {
  const system = useDashboardStore(state => state.system);

  const statuses = [
    { label: 'Backend API', status: system.backend.status, icon: Server, isOk: system.backend.status === 'Running' },
    { label: 'MQTT Broker', status: system.mqtt.status, icon: Radio, isOk: system.mqtt.status === 'Connected' },
    { label: 'Socket.IO', status: system.socket.status, icon: Database, isOk: system.socket.status === 'Connected' },
  ];

  return (
    <footer className="mt-8 pt-4 pb-3 border-t border-neutral-200/80 flex items-center justify-center shrink-0 select-none">
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
        {statuses.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <item.icon className="w-4 h-4 text-neutral-400" />
            <span className="text-xs font-semibold text-neutral-500">{item.label}:</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${item.isOk ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
              <span className="text-xs font-bold text-neutral-800">{item.status}</span>
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}
