import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Header } from './components/Header/Header';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { SuperAdminDashboard } from './pages/Dashboard/SuperAdminDashboard';
import { DevicesManager } from './pages/Devices/DevicesManager';
import { SuperAdminDevicesManager } from './pages/Devices/SuperAdminDevicesManager';
import { ClientsManager } from './pages/Clients/ClientsManager';
import { Settings } from './pages/Settings/Settings';
import { AlarmsLog } from './pages/Alarms/AlarmsLog';
import { UsersManager } from './pages/Users/UsersManager';
import { HistoricalRecords } from './pages/HistoricalRecords/HistoricalRecords';
import { Login } from './pages/Login/Login';
import { ConnectionStatus } from './components/ConnectionStatus/ConnectionStatus';
import { useDashboardStore } from './store/dashboardStore';
import { useAuthStore } from './store/authStore';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import { usePageVisibility } from './hooks/usePageVisibility';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const initialize = useDashboardStore(state => state.initialize);
  const system     = useDashboardStore(state => state.system);
  const device     = useDashboardStore(state => state.device);
  const alarms     = useDashboardStore(state => state.alarms.activeAlarms);
  const activeTab  = useDashboardStore(state => state.activeTab);
  const setActiveTab = useDashboardStore(state => state.setActiveTab);

  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isCheckingAuth  = useAuthStore(state => state.isCheckingAuth);
  const checkAuth       = useAuthStore(state => state.checkAuth);
  const user            = useAuthStore(state => state.user);
  const isSuperAdmin    = user?.role === 'SUPER_ADMIN';

  // Sidebar open/close state (collapsed by default on mobile)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  usePageVisibility();
  const { showShortcuts, setShowShortcuts } = useKeyboardShortcuts();

  // 1. Verify stored session exactly once on initial application mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 2. Initialize dashboard resources only after authentication is confirmed
  useEffect(() => {
    if (isAuthenticated && !isCheckingAuth) {
      initialize();
    }
  }, [initialize, isAuthenticated, isCheckingAuth]);

  // 3. Show checking screen while checking stored token validity with backend
  if (isCheckingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F5F8] gap-4">
        <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-primary border-t-transparent shadow-sm"></div>
        <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest animate-pulse">Restoring Session...</span>
      </div>
    );
  }

  if (!isAuthenticated) return <Login />;

  const isConnected = system.socket.status === 'Connected';
  const criticalAlarmCount = alarms.filter(a => a.severity === 'Critical' && a.status !== 'Resolved').length;

  const renderContent = () => {
    switch (activeTab) {
      case 'Clients':        return isSuperAdmin ? <ClientsManager /> : <Dashboard />;
      case 'Users':          return <UsersManager />;
      case 'Devices':        return isSuperAdmin ? <SuperAdminDevicesManager /> : <DevicesManager />;
      case 'Settings':       return <Settings />;
      case 'Alarms':         return <AlarmsLog />;
      case 'History':        return <HistoricalRecords />;
      case 'Dashboard':
      default:               return isSuperAdmin ? <SuperAdminDashboard /> : <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-[#F3F5F8] overflow-hidden font-sans text-[#172033]">

          {/* Sidebar: always mounted, open/closed via prop */}
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main content: on lg+ leave space for fixed sidebar */}
          <div className="flex-1 flex flex-col lg:ml-64 overflow-hidden min-w-0">
            <Header
              isConnected={isConnected}
              lastPacketTime={device.lastPacketTime}
              alarmCount={criticalAlarmCount}
              onMenuClick={() => setSidebarOpen(true)}
              onNotificationClick={() => setActiveTab('Alarms')}
            />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between min-h-0">
              <div className="flex-1">
                {renderContent()}
              </div>
              <ConnectionStatus />
            </main>
          </div>

          {/* Keyboard shortcuts modal */}
          {showShortcuts && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
                  <button onClick={() => setShowShortcuts(false)} className="text-neutral-500 hover:text-neutral-800">&times;</button>
                </div>
                <ul className="space-y-3">
                  <li className="flex justify-between"><kbd className="bg-neutral-200 px-2 py-1 rounded">R</kbd> <span>Reconnect MQTT</span></li>
                  <li className="flex justify-between"><kbd className="bg-neutral-200 px-2 py-1 rounded">L</kbd> <span>Clear Alarms</span></li>
                  <li className="flex justify-between"><kbd className="bg-neutral-200 px-2 py-1 rounded">H</kbd> <span>Go Home</span></li>
                  <li className="flex justify-between"><kbd className="bg-neutral-200 px-2 py-1 rounded font-mono">?</kbd> <span>Show Shortcuts</span></li>
                </ul>
              </div>
            </div>
          )}
        </div>
    </ErrorBoundary>
  );
}

export default App;
