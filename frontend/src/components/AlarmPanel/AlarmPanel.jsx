import React from 'react';
import { BellRing, AlertOctagon } from 'lucide-react';
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

  const criticalAlarms = alarms.filter(a => a.severity === 'Critical');

  return (
    <div className="bg-white rounded-[16px] shadow-soft flex flex-col h-full overflow-hidden min-h-[300px]">
      {/* Header */}
      <div className="p-[24px] border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BellRing className="w-5 h-5 text-neutral-800" />
          <h2 className="text-[16px] font-bold text-neutral-800">Active Alarms</h2>
          {criticalAlarms.length > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
          )}
        </div>
        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
          Live · Critical Only
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto max-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-neutral-50/95 backdrop-blur shadow-sm text-[11px] font-bold text-neutral-500 uppercase tracking-wider z-10">
            <tr>
              <th className="px-6 py-4 font-semibold">Time</th>
              <th className="px-6 py-4 font-semibold">Message</th>
              <th className="px-6 py-4 font-semibold">Sensor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {criticalAlarms.map((alarm, idx) => (
              <tr
                key={alarm.id || idx}
                className="transition-all duration-200 cursor-default border-l-[3px] bg-rose-50/35 hover:bg-rose-50/60 border-l-rose-600"
              >
                <td className="px-6 py-4 text-[12px] font-medium text-neutral-400 whitespace-nowrap tabular-nums">
                  {alarm.timestamp}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-start gap-2.5">
                    <div className="relative shrink-0 mt-0.5">
                      <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-rose-400 opacity-75" />
                      <AlertOctagon className="w-4 h-4 text-rose-600 relative z-10" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-rose-950">{alarm.message}</span>
                      <span className="text-[11px] text-neutral-500 font-medium mt-0.5">
                        Value: {alarm.value} · {alarm.threshold}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-700">
                    {alarm.sensor}
                  </span>
                </td>
              </tr>
            ))}

            {criticalAlarms.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-10 text-neutral-400 text-sm font-semibold">
                  No critical alarms active.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-neutral-100 bg-neutral-50/50">
        <p className="text-[11px] text-neutral-400 font-semibold">
          Showing critical alerts only ·{' '}
          <button
            onClick={() => useDashboardStore.getState().setActiveTab('Alarms')}
            className="text-primary hover:underline font-bold"
          >
            View all alerts →
          </button>
        </p>
      </div>
    </div>
  );
}
