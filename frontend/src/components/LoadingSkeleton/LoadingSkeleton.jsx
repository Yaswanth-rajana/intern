import React from 'react';
import { cn } from '../../utils/cn';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200/80", className)}
      {...props}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="card-level-1 p-5 flex flex-col justify-between min-h-[168px]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-2.5 h-2.5 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-full rounded-lg mt-3" />
    </div>
  );
}

export function AqiCardSkeleton() {
  return (
    <div className="card-level-2 p-6 flex flex-col justify-between h-full min-h-[340px]">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center justify-center my-4">
        <Skeleton className="w-44 h-44 rounded-full" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  );
}

