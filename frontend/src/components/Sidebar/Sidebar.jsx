import React from 'react';
import { LayoutDashboard, Server, Settings, Wind, LogOut, BellRing, X, Users, Building2, History } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDashboardStore } from '../../store/dashboardStore';
import { useAuthStore } from '../../store/authStore';

export function Sidebar({ className, isOpen, onClose }) {
  const activeTab = useDashboardStore(state => state.activeTab);
  const setActiveTab = useDashboardStore(state => state.setActiveTab);
  const activeAlarms = useDashboardStore(state => state.alarms.activeAlarms);

  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClientAdmin = user?.role === 'CLIENT_ADMIN' || user?.role === 'Admin';

  const criticalAlarmCount = activeAlarms.filter(a => a.severity === 'Critical' && a.status !== 'Resolved').length;


  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, value: 'Dashboard' },
    ...(isSuperAdmin ? [{ label: 'Clients', icon: Building2, value: 'Clients' }] : []),
    { label: 'Devices', icon: Server, value: 'Devices' },
    { label: 'Historical Records', icon: History, value: 'History' },
    { label: 'Alerts Log', icon: BellRing, value: 'Alarms' },
    ...((isSuperAdmin || isClientAdmin) ? [{ label: 'Users', icon: Users, value: 'Users' }] : []),
    { label: 'Settings', icon: Settings, value: 'Settings' },
  ];

  const handleNavClick = (value) => {
    setActiveTab(value);
    onClose?.();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "w-64 bg-[#0F172A] text-slate-300 flex flex-col h-screen fixed left-0 top-0 z-40 shadow-2xl transition-transform duration-300 select-none",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
        className
      )}>

        {/* Brand logo */}
        <div className="p-5 flex items-center justify-between text-white border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-xs">
              <Wind className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-wide text-white">AeroSense</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-grow px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.value;
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.value)}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 font-semibold text-[13px] cursor-pointer whitespace-nowrap text-left group",
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                    : "bg-transparent text-slate-300 hover:text-white hover:bg-slate-800/60"
                )}
              >
                <item.icon className={cn(
                  "w-4 h-4 shrink-0 transition-transform group-hover:scale-110", 
                  isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                )} />
                <span className="truncate">{item.label}</span>
                {item.value === 'Alarms' && criticalAlarmCount > 0 && (
                  <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {criticalAlarmCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>



        {/* AQI Scale Legend (Styled with consistent typography & dots) */}
        <div className="px-3 py-2 border-t border-slate-800/80">
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800/70">
            <h4 className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-2">AQI Scale Legend</h4>
            <div className="flex flex-col gap-1.5 text-[11px]">
              <div className="flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
                  <span className="font-semibold text-slate-400">0–50</span>
                </div>
                <span className="text-emerald-400 text-[11px] font-bold">Good</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 shadow-xs" />
                  <span className="font-semibold text-slate-400">51–100</span>
                </div>
                <span className="text-amber-400 text-[11px] font-bold">Moderate</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 shadow-xs" />
                  <span className="font-semibold text-slate-400">101–150</span>
                </div>
                <span className="text-orange-400 text-[11px] font-bold">Poor</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 shadow-xs" />
                  <span className="font-semibold text-slate-400">151+</span>
                </div>
                <span className="text-rose-400 text-[11px] font-bold">Unhealthy</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Profile & Logout */}
        <div className="p-3.5 border-t border-slate-800/90 bg-[#0B132B]">
          <div className="flex items-center gap-2.5 mb-2.5 px-1">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-[12px] uppercase shrink-0 shadow-xs">
              {user?.username?.charAt(0) || 'A'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-bold text-white truncate">{user?.username || 'User'}</span>
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded mt-0.5 w-fit",
                user?.role === 'SUPER_ADMIN'
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              )}>
                {user?.role || 'Guest'}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs rounded-lg transition-all border border-slate-800 hover:border-slate-700 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

      </aside>
    </>
  );
}

