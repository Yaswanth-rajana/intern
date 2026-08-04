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
    <footer className="mt-8 pt-4 pb-6 flex items-center justify-center border-t border-neutral-200">
      <div className="flex flex-wrap items-center gap-8">
        {statuses.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <item.icon className="w-4 h-4 text-neutral-400" />
            <span className="text-sm text-neutral-500 font-medium">{item.label}:</span>
            <div className="flex items-center gap-1.5 ml-1">
               <span className={`w-2 h-2 rounded-full ${item.isOk ? 'bg-success' : 'bg-danger animate-pulse'}`} />
               <span className="text-sm font-semibold text-neutral-700">{item.status}</span>
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}
