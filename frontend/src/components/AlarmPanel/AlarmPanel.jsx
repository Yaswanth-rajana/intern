import React from 'react';
import { BellRing } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Skeleton } from '../LoadingSkeleton/LoadingSkeleton';
import { useDashboardStore } from '../../store/dashboardStore';

export function AlarmPanel() {
  const uiState = useDashboardStore(state => state.ui.state);
  const alarms = useDashboardStore(state => state.alarms.activeAlarms);
  const isLoading = uiState === 'initialLoading';

  if (isLoading) {
    return (
      <div className="bg-white rounded-[16px] shadow-soft p-[24px] flex flex-col h-full min-h-[300px]">
        <Skeleton className="w-48 h-6 mb-6" />
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[16px] shadow-soft flex flex-col h-full overflow-hidden min-h-[300px]">
      <div className="p-[24px] border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BellRing className="w-5 h-5 text-neutral-800" />
          <h2 className="text-[16px] font-bold text-neutral-800">Active Alarms</h2>
        </div>
        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest tabular-nums">Live</span>
      </div>

      <div className="flex-1 overflow-auto max-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-neutral-50/95 backdrop-blur shadow-sm text-[11px] font-bold text-neutral-500 uppercase tracking-wider z-10">
            <tr>
              <th className="px-6 py-4 font-semibold">Time</th>
              <th className="px-6 py-4 font-semibold">Message</th>
              <th className="px-6 py-4 font-semibold">Severity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {alarms.map((alarm, idx) => (
              <tr key={alarm.id || idx} className="hover:bg-neutral-50 transition-colors group cursor-default">
                <td className="px-6 py-4 text-[13px] font-medium text-neutral-500 whitespace-nowrap tabular-nums group-hover:text-neutral-700">{alarm.timestamp}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-neutral-800">{alarm.message}</span>
                    <span className="text-[12px] text-neutral-500 font-medium mt-0.5">{alarm.sensor} - {alarm.threshold}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                    alarm.severity === 'Critical' ? "bg-danger/10 text-danger" :
                    alarm.severity === 'Warning' ? "bg-status-poor/10 text-status-poor" :
                    alarm.severity === 'Info' ? "bg-status-good/10 text-status-good" :
                    "bg-primary/10 text-primary"
                  )}>
                    {alarm.severity}
                  </span>
                </td>
              </tr>
            ))}
            {alarms.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-8 text-neutral-400 text-sm font-medium">No active alarms.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
