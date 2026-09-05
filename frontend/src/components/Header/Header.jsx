import React, { useState, useEffect, useRef } from 'react';
import { Bell, ChevronDown, LogOut, Menu, Building2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

export function Header({ isConnected = true, lastPacketTime = null, alarmCount = 0, onMenuClick, onNotificationClick }) {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const clickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeSinceLastPacket = lastPacketTime ? Math.floor((time.getTime() - lastPacketTime) / 1000) : null;
  let lastPacketText = 'waiting for telemetry';
  if (timeSinceLastPacket !== null) {
    if (timeSinceLastPacket < 10) lastPacketText = 'synced just now';
    else if (timeSinceLastPacket < 60) lastPacketText = `synced ${timeSinceLastPacket}s ago`;
    else if (timeSinceLastPacket < 3600) lastPacketText = `synced ${Math.floor(timeSinceLastPacket / 60)}m ago`;
    else if (timeSinceLastPacket < 86400) lastPacketText = `synced ${Math.floor(timeSinceLastPacket / 3600)}h ago`;
    else lastPacketText = `synced ${Math.floor(timeSinceLastPacket / 86400)}d ago`;
  }


  return (
    <header className="bg-white border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-20 shadow-2xs gap-4">

      {/* Left: Hamburger (mobile) + Section Header */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors shrink-0 cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="section-header text-[18px] sm:text-[22px] lg:text-[24px] tracking-tight leading-tight truncate">
          Air Quality Monitoring Platform
        </h1>
      </div>

      {/* Right: Consolidated Status Pill + Bell + Multi-Tenant Org Switcher + Muted Clock */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">

        {/* Consolidate Live / Last Packet into single compact status pill */}
        <div 
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-bold transition-all shadow-2xs",
            isConnected 
              ? "bg-emerald-50/80 text-emerald-800 border-emerald-200/80" 
              : "bg-rose-50/80 text-rose-800 border-rose-200/80"
          )}
          title="Connection & Synchronization Status"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className={cn("relative inline-flex rounded-full h-2 w-2", isConnected ? "bg-emerald-500" : "bg-rose-500")} />
          </span>
          <span className="font-extrabold tracking-wide">{isConnected ? 'Live' : 'Disconnected'}</span>
          <span className="text-slate-300">·</span>
          <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
            {isConnected ? lastPacketText : 'Offline'}
          </span>
        </div>

        {/* Deprioritized raw clock in quiet corner element */}
        <div className="hidden xl:flex flex-col text-right cursor-default px-2">
          <span className="text-[11px] font-mono font-medium text-slate-400 tabular-nums">
            {time.toLocaleTimeString()}
          </span>
        </div>

        {/* Notification Bell with Badge */}
        <button
          onClick={onNotificationClick}
          className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 rounded-full transition-all relative cursor-pointer border border-transparent hover:border-slate-200/60"
          title="Active Alerts"
        >
          <Bell className="w-4.5 h-4.5" />
          {alarmCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-rose-600 text-white text-[9.5px] font-black flex items-center justify-center rounded-full px-1 shadow-xs border-2 border-white">
              {alarmCount}
            </span>
          )}
        </button>

        {/* Enterprise Multi-Tenant / User Switcher */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 h-9 pl-1.5 pr-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full transition-all outline-none cursor-pointer shadow-2xs"
            title="Account & Organization Switcher"
          >
            <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-[11px] shadow-xs uppercase">
              {user?.username?.charAt(0) || 'A'}
            </div>
            
            <div className="hidden sm:flex flex-col text-left leading-tight pr-1">
              <span className="text-[12px] font-extrabold text-slate-800 capitalize truncate max-w-[110px]">
                {user?.username || 'Enterprise Admin'}
              </span>
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                AeroSense Org
              </span>
            </div>

            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Organization</span>
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <span className="text-[13px] font-bold text-slate-900">AeroSense Enterprise</span>
                <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded w-fit mt-0.5">
                  Role: {user?.role || 'CLIENT_ADMIN'}
                </span>
              </div>

              <button
                onClick={logout}
                className="w-full text-left px-4 py-2.5 text-[12px] text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}


