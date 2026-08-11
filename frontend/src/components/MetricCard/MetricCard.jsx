import React from 'react';
import CountUp from 'react-countup';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { cn } from '../../utils/cn';

export function MetricCard({ icon: Icon, title, value, unit, statusObj, sparklineData, className, isToggledOff, onClick, onMouseEnter, onMouseLeave }) {
  const hexMap = {
    green: '#10b981',
    yellow: '#f59e0b',
    orange: '#f97316',
    red: '#ef4444',
    blue: '#3b82f6',
    gray: '#6b7280'
  };
  
  const activeColor = isToggledOff ? '#9ca3af' : (hexMap[statusObj?.color] || hexMap.green);

  const textColorsMap = {
    green: 'text-[#10b981]',
    yellow: 'text-[#f59e0b]',
    orange: 'text-[#f97316]',
    red: 'text-[#ef4444]',
    blue: 'text-[#3b82f6]',
    gray: 'text-[#6b7280]'
  };
  const textColor = isToggledOff ? 'text-[#9ca3af]' : textColorsMap[statusObj?.color || 'green'];

  const data = sparklineData || [
    { value: value * 0.9 },
    { value: value * 0.95 },
    { value: value * 0.98 },
    { value: value * 1.02 },
    { value: value * 0.96 },
    { value: value },
  ];

  const CountUpComponent = CountUp.default || CountUp;

  return (
    <div 
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "bg-white rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-[16px] pb-[16px] flex flex-col justify-between h-[170px] overflow-hidden cursor-pointer",
        "transition-all duration-150 hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-neutral-100/50", 
        isToggledOff && "opacity-45 border-dashed border-neutral-300 hover:translate-y-0 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      <div className="flex items-center gap-[10px] w-full">
        <div 
          className={cn(
            "w-[50px] h-[50px] flex items-center justify-center shrink-0 text-white",
            typeof Icon === 'string' ? "" : "rounded-full shadow-sm",
            isToggledOff && "grayscale opacity-50"
          )}
          style={typeof Icon === 'string' ? { backgroundColor: 'transparent' } : { backgroundColor: activeColor }}
        >
          {typeof Icon === 'string' ? (
            <img src={Icon} alt={title} className="w-full h-full object-contain" />
          ) : (
            <Icon className="w-6 h-6" strokeWidth={2.5} />
          )}
        </div>
        
        {/* Right: Remaining */}
        <div className="flex flex-col justify-center flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: activeColor }}></div>
            <span className="font-bold text-[12px] text-neutral-500 tracking-wider uppercase truncate">
              {title}
            </span>
          </div>
          
          <div className="flex items-baseline gap-1">
            <span className="text-[34px] font-bold text-neutral-800 tracking-tight leading-none font-tabular-nums">
              <CountUpComponent end={value} preserveValue={true} duration={1} decimals={value % 1 !== 0 ? 1 : 0} />
            </span>
            {unit && <span className="text-[12px] font-semibold text-neutral-400">{unit}</span>}
          </div>
          
          <div className="mt-1.5 overflow-hidden">
            <span className={cn("font-bold text-[14px] truncate whitespace-nowrap block", textColor)}>
              {statusObj?.label || 'Good'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 justify-end mt-5">
        <div className="h-[36px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={activeColor} 
                strokeWidth={3} 
                strokeLinecap="round"
                dot={false}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
