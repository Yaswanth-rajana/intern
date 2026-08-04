import React, { useState, useEffect } from 'react';
import { Bell, ChevronDown } from 'lucide-react';

export function Header({ isConnected = true, lastPacketTime = null, alarmCount = 0 }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeSinceLastPacket = lastPacketTime ? Math.floor((time.getTime() - lastPacketTime) / 1000) : null;
  let lastPacketText = "Waiting for data...";
  if (timeSinceLastPacket !== null) {
    if (timeSinceLastPacket === 0) lastPacketText = "Just now";
    else if (timeSinceLastPacket < 60) lastPacketText = `${timeSinceLastPacket} sec ago`;
    else lastPacketText = `${Math.floor(timeSinceLastPacket / 60)} min ago`;
  }

  const lastMessageTimeFormatted = lastPacketTime ? new Date(lastPacketTime).toLocaleTimeString() : '--:--:--';

  return (
    <header className="bg-white border-b border-black/[0.08] px-8 py-7 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-6">
        <h1 className="text-[40px] font-bold text-[#1F2937] tracking-normal leading-none">Indoor Air Quality Monitoring Platform</h1>
      </div>

      <div className="flex items-center gap-[24px]">
        
        {/* MQTT Status with refined details */}
        <div className="flex items-center gap-3 pr-[24px] border-r border-black/[0.08]" title="MQTT Broker Status">
          <div className="flex items-center justify-center w-[40px] h-[40px] rounded-full hover:bg-black/5 transition-colors cursor-default">
            {isConnected ? (
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-good opacity-60"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-status-good"></span>
              </div>
            ) : (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-danger"></span>
            )}
          </div>
          <div className="flex flex-col cursor-default">
            <span className="text-[15px] font-semibold text-neutral-800 leading-tight">
              {isConnected ? "Live" : "Disconnected"}
            </span>
            <span className="text-[12px] text-neutral-500 font-medium whitespace-nowrap">
              {isConnected ? `Last Packet: ${lastPacketText}` : "Offline"}
            </span>
          </div>
        </div>

        {/* Last Update & Current Time */}
        <div className="flex items-center gap-[24px] pr-[24px] border-r border-black/[0.08]">
          <div className="flex flex-col cursor-default">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Last Update</span>
            <span className="text-[15px] font-semibold text-neutral-800 tabular-nums leading-tight">{lastMessageTimeFormatted}</span>
          </div>

          <div className="flex flex-col cursor-default">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Current Time</span>
            <span className="text-[15px] font-semibold text-neutral-800 tabular-nums leading-tight">{time.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Notifications & Profile */}
        <div className="flex items-center gap-4">
          <button 
            className="w-[44px] h-[44px] flex items-center justify-center text-neutral-500 hover:text-neutral-800 hover:bg-black/5 rounded-full transition-all relative"
            title="Notifications"
          >
            <Bell className="w-[22px] h-[22px]" />
            {alarmCount > 0 && (
              <span className="absolute top-2 right-2 min-w-[14px] h-[14px] bg-danger text-white text-[9px] font-bold flex items-center justify-center rounded-full px-1 shadow-sm animate-pulse border border-white">
                {alarmCount}
              </span>
            )}
          </button>
          
          <button 
            className="flex items-center gap-2.5 h-[44px] px-3 text-neutral-700 hover:bg-black/5 rounded-full transition-all"
            title="User Profile"
          >
            <div className="w-[32px] h-[32px] rounded-full bg-primary text-white flex items-center justify-center font-bold text-[14px] shadow-sm">
              A
            </div>
            <span className="text-[14px] font-semibold pr-1">Admin</span>
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          </button>
        </div>
      </div>
    </header>
  );
}
