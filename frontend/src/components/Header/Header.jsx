import React, { useState, useEffect, useRef } from 'react';
import { Bell, ChevronDown, LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

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
  let lastPacketText = 'Waiting...';
  if (timeSinceLastPacket !== null) {
    if (timeSinceLastPacket === 0) lastPacketText = 'Just now';
    else if (timeSinceLastPacket < 60) lastPacketText = `${timeSinceLastPacket} sec ago`;
    else lastPacketText = `${Math.floor(timeSinceLastPacket / 60)} min ago`;
  }
  const lastMessageTimeFormatted = lastPacketTime ? new Date(lastPacketTime).toLocaleTimeString() : '--:--:--';

  return (
    <header className="bg-white border-b border-black/[0.08] px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm gap-3">

      {/* Left: Hamburger (mobile) + Title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — only on mobile/tablet */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-[16px] sm:text-[20px] lg:text-[28px] font-bold text-[#1F2937] tracking-normal leading-tight truncate">
          Air Quality Monitoring
          <span className="hidden sm:inline"> Platform</span>
        </h1>
      </div>

      {/* Right: Status + Actions */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">

        {/* MQTT live status */}
        <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-black/[0.08]" title="MQTT Status">
          <div className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-black/5 transition-colors cursor-default">
            {isConnected ? (
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-good opacity-60" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-status-good" />
              </div>
            ) : (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-danger" />
            )}
          </div>
          <div className="flex flex-col cursor-default">
            <span className="text-[14px] font-semibold text-neutral-800 leading-tight">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
            <span className="text-[11px] text-neutral-500 font-medium whitespace-nowrap">
              {isConnected ? `Last Packet: ${lastPacketText}` : 'Offline'}
            </span>
          </div>
        </div>

        {/* Timestamps — only lg+ */}
        <div className="hidden lg:flex items-center gap-6 pr-4 border-r border-black/[0.08]">
          <div className="flex flex-col cursor-default">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Last Update</span>
            <span className="text-[14px] font-semibold text-neutral-800 tabular-nums leading-tight">{lastMessageTimeFormatted}</span>
          </div>
          <div className="flex flex-col cursor-default">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Current Time</span>
            <span className="text-[14px] font-semibold text-neutral-800 tabular-nums leading-tight">{time.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Bell */}
        <button
          onClick={onNotificationClick}
          className="w-10 h-10 flex items-center justify-center text-neutral-500 hover:text-neutral-800 hover:bg-black/5 rounded-full transition-all relative"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {alarmCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] bg-danger text-white text-[9px] font-bold flex items-center justify-center rounded-full px-1 shadow-sm animate-pulse border border-white">
              {alarmCount}
            </span>
          )}
        </button>

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 h-10 px-2 sm:px-3 text-neutral-700 hover:bg-black/5 rounded-full transition-all outline-none"
            title="User Profile"
          >
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[13px] shadow-sm uppercase">
              {user?.username?.charAt(0) || 'U'}
            </div>
            <span className="hidden sm:block text-[13px] font-semibold pr-1 capitalize">{user?.username || 'User'}</span>
            <ChevronDown className={`hidden sm:block w-4 h-4 text-neutral-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-44 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-50">
              <div className="px-4 py-2 border-b border-neutral-100 flex flex-col">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Role</span>
                <span className="text-[13px] font-bold text-neutral-850 mt-0.5">{user?.role || 'Guest'}</span>
              </div>
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2.5 text-[13px] text-danger hover:bg-danger/5 font-bold flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
