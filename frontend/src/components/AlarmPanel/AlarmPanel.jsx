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
      <div className="card-level-1 p-6 flex flex-col">
        <Skeleton className="w-48 h-6 mb-6" />
        <Skeleton className="w-full h-32" />
      </div>
    );
  }

  const criticalAlarms = alarms.filter(a => a.severity === 'Critical');

  return (
    <div className="card-level-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100">
            <BellRing className="w-4.5 h-4.5 text-rose-600" />
          </div>
          <h2 className="text-[16px] font-extrabold text-slate-800">Active Alarms</h2>
          {criticalAlarms.length > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
          )}
        </div>
        <span className="micro-label">
          Live · Critical Only
        </span>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[220px]">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-50/95 backdrop-blur shadow-2xs micro-label text-slate-700 z-10">
            <tr>
              <th className="px-6 py-3 font-bold">Time</th>
              <th className="px-6 py-3 font-bold">Message</th>
              <th className="px-6 py-3 font-bold">Sensor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {criticalAlarms.map((alarm, idx) => (
              <tr
                key={alarm.id || idx}
                className="transition-all duration-200 cursor-default border-l-[3px] bg-rose-50/40 hover:bg-rose-50/70 border-l-rose-600"
              >
                <td className="px-6 py-3.5 text-[12px] font-medium text-slate-400 whitespace-nowrap tabular-nums">
                  {alarm.timestamp}
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="relative shrink-0 mt-0.5">
                      <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-rose-400 opacity-75" />
                      <AlertOctagon className="w-4 h-4 text-rose-600 relative z-10" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-extrabold text-rose-950">{alarm.message}</span>
                      <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Value: {alarm.value} · {alarm.threshold}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                    {alarm.sensor}
                  </span>
                </td>
              </tr>
            ))}

            {criticalAlarms.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-6 text-slate-400 text-xs font-semibold">
                  No critical alarms active. All environmental metrics within normal bounds.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 mt-auto">
        <p className="text-[11px] text-slate-400 font-semibold">
          Showing critical alerts only ·{' '}
          <button
            onClick={() => useDashboardStore.getState().setActiveTab('Alarms')}
            className="text-blue-600 hover:underline font-bold cursor-pointer"
          >
            View all alerts →
          </button>
        </p>
      </div>
    </div>
  );
}

