import React, { useEffect } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Header } from './components/Header/Header';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { ConnectionStatus } from './components/ConnectionStatus/ConnectionStatus';
import { useDashboardStore } from './store/dashboardStore';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import { usePageVisibility } from './hooks/usePageVisibility';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const initialize = useDashboardStore(state => state.initialize);
  const system = useDashboardStore(state => state.system);
  const device = useDashboardStore(state => state.device);
  const alarms = useDashboardStore(state => state.alarms.activeAlarms);

  usePageVisibility();
  const { showShortcuts, setShowShortcuts } = useKeyboardShortcuts();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const isConnected = system.socket.status === 'Connected';

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <div className="flex h-screen bg-neutral-100 overflow-hidden font-sans text-neutral-800">
          <Sidebar />
          <div className="flex-1 flex flex-col ml-64 overflow-hidden">
            <Header 
              isConnected={isConnected} 
              lastPacketTime={device.lastPacketTime} 
              alarmCount={alarms.length} 
            />
            <main className="flex-1 overflow-y-auto p-8">
              <Dashboard />
              <ConnectionStatus />
            </main>
          </div>

          {showShortcuts && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 w-96">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
                  <button onClick={() => setShowShortcuts(false)} className="text-neutral-500 hover:text-neutral-800">&times;</button>
                </div>
                <ul className="space-y-3">
                  <li className="flex justify-between"><kbd className="bg-neutral-200 px-2 py-1 rounded">R</kbd> <span>Reconnect MQTT</span></li>
                  <li className="flex justify-between"><kbd className="bg-neutral-200 px-2 py-1 rounded">L</kbd> <span>Clear Alarms</span></li>
                  <li className="flex justify-between"><kbd className="bg-neutral-200 px-2 py-1 rounded">H</kbd> <span>Go Home</span></li>
                  <li className="flex justify-between"><kbd className="bg-neutral-200 px-2 py-1 rounded">?</kbd> <span>Show Shortcuts</span></li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
