import React from 'react';
import CountUp from 'react-countup';
import { cn } from '../../utils/cn';

export function AqiCard({ value, statusObj, className }) {
  const colorMap = {
    green:     { fill: '#10B981', glow: 'rgba(16, 185, 129, 0.35)', pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    yellow:    { fill: '#F59E0B', glow: 'rgba(245, 158, 11, 0.35)', pill: 'bg-amber-50 text-amber-700 border border-amber-200' },
    orange:    { fill: '#F97316', glow: 'rgba(249, 115, 22, 0.35)', pill: 'bg-orange-50 text-orange-700 border border-orange-200' },
    red:       { fill: '#EF4444', glow: 'rgba(239, 68, 68, 0.4)', pill: 'bg-rose-50 text-rose-700 border border-rose-200' },
    hazardous: { fill: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.4)', pill: 'bg-purple-50 text-purple-700 border border-purple-200' },
    gray:      { fill: '#64748B', glow: 'rgba(100, 116, 139, 0.2)', pill: 'bg-slate-100 text-slate-700 border border-slate-200' }
  };

  const descMap = {
    Excellent: 'Air quality is considered satisfactory, posing minimal risk.',
    Good: 'Air quality is good and acceptable for daily activities.',
    Moderate: 'Air quality is acceptable; sensitive groups should take precautions.',
    Elevated: 'Air quality is slightly degraded. Moderate concern for sensitive groups.',
    Unhealthy: 'Air quality may cause health effects for sensitive groups.',
    Hazardous: 'Air quality is hazardous. Serious health warnings for all individuals.',
  };

  const activeTheme = colorMap[statusObj?.color] || colorMap.green;
  const statusLabel = statusObj?.label || 'Good';
  const description = descMap[statusLabel] || 'Indoor air quality status monitored in real-time.';

  const CountUpComponent = CountUp.default || CountUp;
  const numericVal = typeof value === 'number' && !isNaN(value) ? value : (parseFloat(value) || 0);

  // 270° radial arc gauge parameters
  // SVG size: 210x210, Center: (105, 105), Radius: 78
  // Total circumference = 2 * PI * 78 = 490.09
  // 270° Arc Length = 0.75 * 490.09 = 367.57
  const r = 78;
  const arcLength = 367.57;
  const totalCircumference = 490.09;
  
  // AQI range: 0 to 300 (standard AQI upper threshold for unhealthy/hazardous)
  const maxAqi = 300;
  const fillPercentage = Math.min(1, Math.max(0, numericVal / maxAqi));
  const filledLength = fillPercentage * arcLength;
  const dashOffset = arcLength - filledLength;

  return (
    <div 
      className={cn(
        "card-level-2 p-5 sm:p-6 flex flex-col justify-between h-full min-h-[340px] select-none relative overflow-hidden transition-all duration-300",
        statusObj?.color === 'red' || statusObj?.color === 'hazardous'
          ? "bg-gradient-to-b from-rose-50/40 to-white border-rose-200/90 shadow-lg"
          : "bg-white",
        className
      )}
    >
      {/* Level 2 Card Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span 
            className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" 
            style={{ backgroundColor: activeTheme.fill }}
          />
          <span className="micro-label">
            Air Quality Index
          </span>
        </div>

        <span className={cn("px-3 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider shadow-2xs", activeTheme.pill)}>
          {statusLabel}
        </span>
      </div>

      {/* Circle Gauge Container (~200px) */}
      <div className="flex-1 flex flex-col items-center justify-center my-3 relative">
        <div className="relative w-[200px] h-[200px] flex items-center justify-center">
          <svg 
            className="w-full h-full" 
            viewBox="0 0 200 200"
            style={{ filter: `drop-shadow(0 8px 20px ${activeTheme.glow})` }}
          >
            {/* Solid Status-Colored Disc with Thin White Ring Border */}
            <circle
              cx="100"
              cy="100"
              r="90"
              fill={activeTheme.fill}
              stroke="rgba(255, 255, 255, 0.85)"
              strokeWidth="3.5"
              className="transition-all duration-500 ease-out"
            />
          </svg>

          {/* Centered White Typography & Stats inside Solid Colored Disc */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 select-none pointer-events-none text-white">
            <span className="text-[16px] sm:text-[18px] font-extrabold tracking-wide drop-shadow-xs">
              {statusLabel}
            </span>

            <span className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight font-tabular-nums my-1 leading-none drop-shadow-xs">
              <CountUpComponent end={numericVal} preserveValue={true} duration={1} decimals={numericVal % 1 !== 0 ? 1 : 0} />
            </span>

            <span className="text-[13px] font-extrabold uppercase tracking-widest text-white/90 drop-shadow-xs">
              AQI
            </span>
          </div>
        </div>
      </div>

      {/* Footer Status Description */}
      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/60 text-center">
        <p className="text-xs font-medium text-slate-600 leading-snug">
          {description}
        </p>
      </div>
    </div>
  );
}

