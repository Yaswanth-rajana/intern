import React from 'react';
import { cn } from '../../utils/cn';

export function StatusBadge({ status, color, className }) {
  let colorClass = 'bg-status-good/10 text-status-good';
  let label = typeof status === 'string' ? status : (status?.label || 'Good');
  
  if (color) {
    switch (color) {
      case 'green': colorClass = 'bg-status-good/10 text-status-good'; break;
      case 'yellow': colorClass = 'bg-status-moderate/10 text-status-moderate'; break;
      case 'orange': colorClass = 'bg-status-poor/10 text-status-poor'; break;
      case 'red': colorClass = 'bg-danger/10 text-danger'; break;
      case 'blue': colorClass = 'bg-blue-500/10 text-blue-500'; break;
      case 'gray': colorClass = 'bg-neutral-500/10 text-neutral-500'; break;
      default: break;
    }
  } else {
    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : 'good';
    if (normalizedStatus.includes('critical') || normalizedStatus.includes('offline') || normalizedStatus.includes('error') || normalizedStatus.includes('hazardous') || normalizedStatus.includes('dangerous') || normalizedStatus.includes('severe') || normalizedStatus.includes('toxic') || normalizedStatus.includes('extreme')) {
      colorClass = 'bg-danger/10 text-danger';
    } else if (normalizedStatus.includes('poor') || normalizedStatus.includes('warning') || normalizedStatus.includes('unhealthy') || normalizedStatus.includes('excessive') || normalizedStatus.includes('high')) {
      colorClass = 'bg-status-poor/10 text-status-poor';
    } else if (normalizedStatus.includes('moderate') || normalizedStatus.includes('elevated') || normalizedStatus.includes('dusty') || normalizedStatus.includes('warm') || normalizedStatus.includes('humid')) {
      colorClass = 'bg-status-moderate/10 text-status-moderate';
    } else if (normalizedStatus.includes('cool')) {
      colorClass = 'bg-blue-500/10 text-blue-500';
    } else {
      colorClass = 'bg-status-good/10 text-status-good';
    }
  }

  return (
    <span className={cn("px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider whitespace-nowrap", colorClass, className)}>
      {label}
    </span>
  );
}
