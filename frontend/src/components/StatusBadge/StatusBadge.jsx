import React from 'react';
import { cn } from '../../utils/cn';

export function StatusBadge({ status, color, className }) {
  let colorClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
  let rawStatus = typeof status === 'string' ? status : (status?.label || 'ONLINE');
  let label = rawStatus;

  const normalizedStatus = rawStatus.toLowerCase().trim();

  if (normalizedStatus === 'unknown' || normalizedStatus === 'connection status unknown' || !status) {
    label = 'Connection status unknown';
    colorClass = 'bg-slate-100 text-slate-600 border border-slate-200/90';
  } else if (color) {
    switch (color) {
      case 'green': colorClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'; break;
      case 'yellow': colorClass = 'bg-amber-50 text-amber-700 border border-amber-200/80'; break;
      case 'orange': colorClass = 'bg-orange-50 text-orange-700 border border-orange-200/80'; break;
      case 'red': colorClass = 'bg-rose-50 text-rose-700 border border-rose-200/80 shadow-xs'; break;
      case 'blue': colorClass = 'bg-blue-50 text-blue-700 border border-blue-200/80'; break;
      case 'gray': colorClass = 'bg-slate-100 text-slate-600 border border-slate-200/90'; break;
      default: break;
    }
  } else {
    if (normalizedStatus === 'offline' || normalizedStatus.includes('critical') || normalizedStatus.includes('error') || normalizedStatus.includes('hazardous') || normalizedStatus.includes('dangerous') || normalizedStatus.includes('severe') || normalizedStatus.includes('toxic') || normalizedStatus.includes('extreme')) {
      colorClass = 'bg-rose-50 text-rose-700 border border-rose-200/80 shadow-xs';
    } else if (normalizedStatus.includes('poor') || normalizedStatus.includes('warning') || normalizedStatus.includes('unhealthy') || normalizedStatus.includes('excessive') || normalizedStatus.includes('high')) {
      colorClass = 'bg-orange-50 text-orange-700 border border-orange-200/80';
    } else if (normalizedStatus.includes('moderate') || normalizedStatus.includes('elevated') || normalizedStatus.includes('dusty') || normalizedStatus.includes('warm') || normalizedStatus.includes('humid')) {
      colorClass = 'bg-amber-50 text-amber-700 border border-amber-200/80';
    } else if (normalizedStatus.includes('online') || normalizedStatus.includes('good') || normalizedStatus.includes('normal')) {
      colorClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
    } else {
      colorClass = 'bg-slate-100 text-slate-600 border border-slate-200/90';
    }
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shadow-2xs transition-colors", colorClass, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      <span>{label}</span>
    </span>
  );
}

