import React from 'react';
import CountUp from 'react-countup';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { cn } from '../../utils/cn';

export function MetricCard({ icon: Icon, title, value, unit, statusObj, sparklineData, className }) {
  const numericVal = typeof value === 'number' && !isNaN(value) ? value : (parseFloat(value) || 0);

  // Sparkline color follows color discipline: neutral by default, escalating only when abnormal
  const sparklineColorMap = {
    green: '#64748B',  // Neutral slate/gray for normal in-range readings
    blue:  '#64748B',  // Neutral slate/gray
    yellow:'#F59E0B',  // Amber for moderate
    orange:'#F97316',  // Orange for poor
    red:   '#EF4444',  // Red for unhealthy/danger
    gray:  '#94A3B8'   // Muted gray
  };

  const statusColor = statusObj?.color || 'green';
  const sparklineColor = sparklineColorMap[statusColor] || '#64748B';

  const statusTextMap = {
    green: 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
    blue: 'text-blue-700 bg-blue-50 border-blue-200/80',
    yellow: 'text-amber-700 bg-amber-50 border-amber-200/80',
    orange: 'text-orange-700 bg-orange-50 border-orange-200/80',
    red: 'text-rose-700 bg-rose-50 border-rose-200/80',
    gray: 'text-slate-600 bg-slate-100 border-slate-200/80'
  };
  const statusPillStyle = statusTextMap[statusColor] || statusTextMap.green;

  // Alert visual wash treatment: red-tinted background wash when status is poor or unhealthy
  const cardWashClass = statusColor === 'red'
    ? 'bg-rose-50/70 border-rose-200/90 shadow-rose-100/50'
    : statusColor === 'orange' || statusColor === 'yellow'
      ? 'bg-amber-50/30 border-amber-200/80'
      : 'bg-white border-slate-200/80';

  // Format real sparkline data
  let data = [];
  if (Array.isArray(sparklineData) && sparklineData.length > 0) {
    data = sparklineData.map((item, idx) => ({
      index: idx,
      value: typeof item === 'number' ? item : (item?.value ?? item?.val ?? numericVal)
    }));
  } else {
    // If single point or empty, render flat baseline line
    data = [
      { index: 0, value: numericVal },
      { index: 1, value: numericVal }
    ];
  }

  // Calculate real trend delta ONLY when sufficient historical data points exist (minimum 5 points)
  let trendDeltaStr = null;
  let isPositiveTrend = true;
  if (Array.isArray(sparklineData) && sparklineData.length >= 5) {
    const firstVal = typeof sparklineData[0] === 'number' ? sparklineData[0] : sparklineData[0]?.value;
    const lastVal = typeof sparklineData[sparklineData.length - 1] === 'number' ? sparklineData[sparklineData.length - 1] : sparklineData[sparklineData.length - 1]?.value;
    
    if (typeof firstVal === 'number' && typeof lastVal === 'number' && firstVal !== 0) {
      const pctChange = ((lastVal - firstVal) / Math.abs(firstVal)) * 100;
      if (Math.abs(pctChange) >= 0.5) {
        isPositiveTrend = pctChange > 0;
        trendDeltaStr = `${isPositiveTrend ? '↑' : '↓'} ${Math.abs(pctChange).toFixed(1)}%`;
      }
    }
  }

  const CountUpComponent = CountUp.default || CountUp;

  return (
    <div 
      className={cn(
        "card-level-1 p-4 sm:p-5 flex flex-col justify-between min-h-[168px] select-none relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5",
        cardWashClass,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Title, Value, Status */}
        <div className="flex flex-col min-w-0 flex-1">
          {/* Micro-label style title */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="micro-label truncate">
              {title}
            </span>
          </div>

          {/* Main Value & Unit */}
          <div className="flex items-baseline gap-1.5 my-0.5">
            <span className="data-value text-[36px] sm:text-[40px] leading-none">
              <CountUpComponent end={numericVal} preserveValue={true} duration={1} decimals={numericVal % 1 !== 0 ? 1 : 0} />
            </span>
            {unit && <span className="unit-label">{unit}</span>}
          </div>

          {/* Status Label Pill & Optional Real Trend Delta */}
          <div className="flex items-center gap-2 mt-2">
            <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border", statusPillStyle)}>
              {statusObj?.label || 'Good'}
            </span>

            {/* Render real trend delta ONLY if sufficient historical comparison data exists */}
            {trendDeltaStr && (
              <span className={cn(
                "text-[10px] font-bold tracking-tight px-1.5 py-0.5 rounded",
                isPositiveTrend ? "text-amber-700 bg-amber-50" : "text-emerald-700 bg-emerald-50"
              )}>
                {trendDeltaStr}
              </span>
            )}
          </div>
        </div>

        {/* Icon Container */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-100/80 border border-slate-200/60 text-slate-600 shadow-2xs">
          {typeof Icon === 'string' ? (
            <img src={Icon} alt={title} className="w-4 h-4 object-contain" />
          ) : Icon ? (
            <Icon className="w-4 h-4 text-slate-600" strokeWidth={2.2} />
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-400" />
          )}
        </div>
      </div>

      {/* Mini Sparkline at bottom */}
      <div className="h-8 w-full mt-3 pt-1 border-t border-slate-200/30">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={sparklineColor} 
              strokeWidth={2} 
              strokeLinecap="round"
              dot={false}
              isAnimationActive={true}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

