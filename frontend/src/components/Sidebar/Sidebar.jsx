import React from 'react';
import { LayoutDashboard, Server, LineChart, FileText, Users, Settings, Info, Wind } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Sidebar({ className }) {
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, active: true },
    { label: 'Devices', icon: Server, active: false },
    { label: 'Trends', icon: LineChart, active: false },
    { label: 'Reports', icon: FileText, active: false },
    { label: 'Users', icon: Users, active: false },
    { label: 'Settings', icon: Settings, active: false },
    { label: 'About', icon: Info, active: false },
  ];

  return (
    <aside className={cn("w-64 bg-neutral-900 text-neutral-300 flex flex-col h-screen fixed left-0 top-0", className)}>
      <div className="p-[24px] flex items-center gap-3 text-white border-b border-neutral-800">
        <Wind className="w-8 h-8 text-primary-light" />
        <span className="text-xl font-bold tracking-wide">AeroSense</span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-sm",
              item.active 
                ? "bg-primary text-white" 
                : "hover:bg-neutral-800 hover:text-white"
            )}
          >
            <item.icon className="w-7 h-7" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* AQI Guide at the bottom */}
      <div className="mt-auto p-[24px]">
        <div className="bg-[#1e2332] rounded-xl p-4 text-[12px] border border-white/5">
          <h4 className="text-white/80 font-bold mb-3 uppercase tracking-widest text-[10px]">AQI Guide</h4>
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-status-good"><span className="font-semibold tabular-nums">0–50</span><span className="font-medium">Good</span></div>
            <div className="flex justify-between items-center text-status-moderate"><span className="font-semibold tabular-nums">51–100</span><span className="font-medium">Moderate</span></div>
            <div className="flex justify-between items-center text-status-poor"><span className="font-semibold tabular-nums">101–150</span><span className="font-medium">Poor</span></div>
            <div className="flex justify-between items-center text-[#ef4444]"><span className="font-semibold tabular-nums">151–200</span><span className="font-medium">Unhealthy</span></div>
            <div className="flex justify-between items-center text-[#a855f7]"><span className="font-semibold tabular-nums">201–300</span><span className="font-medium shrink-0 ml-2 text-right">Very Unhealthy</span></div>
            <div className="flex justify-between items-center text-[#9f1239]"><span className="font-semibold tabular-nums">301–500</span><span className="font-medium">Hazardous</span></div>
          </div>
        </div>
      </div>
    </aside>
  );
}
