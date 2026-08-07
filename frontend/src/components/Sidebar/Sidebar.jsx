import React, { useState } from 'react';
import { LayoutDashboard, Server, Settings, Wind, LogOut, BellRing, X, Menu } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDashboardStore } from '../../store/dashboardStore';
import { useAuthStore } from '../../store/authStore';

export function Sidebar({ className, isOpen, onClose }) {
  const activeTab = useDashboardStore(state => state.activeTab);
  const setActiveTab = useDashboardStore(state => state.setActiveTab);

  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, value: 'Dashboard' },
    { label: 'Alerts Log', icon: BellRing, value: 'Alarms' },
    { label: 'Devices', icon: Server, value: 'Devices' },
    { label: 'Settings', icon: Settings, value: 'Settings' },
  ];

  const handleNavClick = (value) => {
    setActiveTab(value);
    onClose?.(); // close sidebar on mobile after navigation
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "w-64 bg-neutral-900 text-neutral-300 flex flex-col h-screen fixed left-0 top-0 z-40 shadow-lg transition-transform duration-300",
        // On mobile: slide in/out. On desktop (lg+): always visible
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
        className
      )}>

        {/* Brand logo */}
        <div className="p-[24px] flex items-center justify-between text-white border-b border-neutral-800/80">
          <div className="flex items-center gap-3">
            <Wind className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold tracking-wide">AeroSense</span>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-grow px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.value;
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.value)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm",
                  isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "hover:bg-neutral-800/50 hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* AQI Guide */}
        <div className="px-4 py-2 border-t border-neutral-800/40">
          <div className="bg-[#1e2332] rounded-xl p-3.5 text-[11px] border border-white/5">
            <h4 className="text-white/60 font-bold mb-2 uppercase tracking-widest text-[9px]">AQI Levels</h4>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[10px]">
              <div className="flex justify-between items-center text-status-good"><span className="font-semibold tabular-nums">0-50</span><span>Good</span></div>
              <div className="flex justify-between items-center text-status-moderate"><span className="font-semibold tabular-nums">51-100</span><span>Mod</span></div>
              <div className="flex justify-between items-center text-status-poor"><span className="font-semibold tabular-nums">101-150</span><span>Poor</span></div>
              <div className="flex justify-between items-center text-[#ef4444]"><span className="font-semibold tabular-nums">151-200</span><span>Unhealth</span></div>
            </div>
          </div>
        </div>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-neutral-800/80 bg-neutral-950/20">
          <div className="flex items-center gap-3 mb-3.5 px-1">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-[14px] uppercase shrink-0">
              {user?.username?.charAt(0) || 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-bold text-white truncate">{user?.username || 'User'}</span>
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-0.5 w-fit",
                user?.role === 'Admin' ? "bg-primary/20 text-primary-light" : "bg-neutral-800 text-neutral-400"
              )}>
                {user?.role || 'Guest'}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 hover:bg-neutral-800 text-neutral-400 hover:text-white font-bold text-xs rounded-xl transition-all border border-neutral-800 hover:border-neutral-700"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

      </aside>
    </>
  );
}
