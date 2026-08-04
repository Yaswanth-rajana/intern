import { useEffect, useState } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { disconnectSocket, connectSocket } from '../services/socket';

export const useKeyboardShortcuts = () => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case 'r':
          e.preventDefault();
          disconnectSocket();
          setTimeout(() => connectSocket(), 500);
          break;
        case 'l':
          e.preventDefault();
          useDashboardStore.setState((state) => ({ alarms: { activeAlarms: [] } }));
          break;
        case 'h':
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts(prev => !prev);
          break;
        case 'escape':
          if (showShortcuts) {
            setShowShortcuts(false);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShortcuts]);

  return { showShortcuts, setShowShortcuts };
};
