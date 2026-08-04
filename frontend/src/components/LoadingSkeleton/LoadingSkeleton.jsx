import React from 'react';
import { cn } from '../../utils/cn';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-neutral-200", className)}
      {...props}
    />
  )
}

export function MetricCardSkeleton() {
  return (
    <div className="card-container gap-4 justify-between h-[120px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-4 w-8" />
      </div>
    </div>
  );
}
