import React, { useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Brush } from 'recharts';
import { cn } from '../../utils/cn';
import { Skeleton } from '../LoadingSkeleton/LoadingSkeleton';
import { useDashboardStore } from '../../store/dashboardStore';
import { Download, CheckSquare, Square, SlidersHorizontal } from 'lucide-react';

const METRIC_CONFIG = [
  { key: 'AQI', label: 'AQI', color: '#10b981', yAxisId: 'left', unit: '', defaultVisible: true },
  { key: 'CO2', label: 'CO₂', color: '#3b82f6', yAxisId: 'right', unit: 'ppm', defaultVisible: true },
  { key: 'Temperature', label: 'Temperature', color: '#f97316', yAxisId: 'far-right', unit: '°C', defaultVisible: true },
  { key: 'Humidity', label: 'Humidity', color: '#06b6d4', yAxisId: 'far-right', unit: '%', defaultVisible: true },
  { key: 'PM2_5', label: 'PM2.5', color: '#a855f7', yAxisId: 'left', unit: 'µg/m³', defaultVisible: true },
  { key: 'VOC', label: 'VOC', color: '#14b8a6', yAxisId: 'far-right', unit: 'ppb', defaultVisible: false },
  { key: 'NOX', label: 'NOX', color: '#6b7280', yAxisId: 'far-right', unit: 'ppb', defaultVisible: false },
  { key: 'PM1_0', label: 'PM1.0', color: '#8b5cf6', yAxisId: 'left', unit: 'µg/m³', defaultVisible: false },
  { key: 'PM4_0', label: 'PM4.0', color: '#d946ef', yAxisId: 'left', unit: 'µg/m³', defaultVisible: false },
  { key: 'PM10', label: 'PM10', color: '#ec4899', yAxisId: 'left', unit: 'µg/m³', defaultVisible: false },
];

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  // Strip gap markers
  const clean = typeof timeStr === 'string' ? timeStr.replace('__gap', '') : timeStr;
  const parts = clean.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return clean;
};

// Gap threshold (ms) per filter — if two consecutive points are further apart
// than this, a null row is inserted so the line visually breaks.
const GAP_THRESHOLDS = {
  Live: 2 * 60 * 1000,      // 2 min
  '1H': 5 * 60 * 1000,     // 5 min
  '24H': 30 * 60 * 1000,   // 30 min
  '7D': 3 * 60 * 60 * 1000, // 3 hr
  '30D': 12 * 60 * 60 * 1000, // 12 hr
};

const NULL_SENSOR_VALS = Object.fromEntries(METRIC_CONFIG.map(c => [c.key, null]));

const processDataWithGaps = (data, filter) => {
  if (!data || data.length < 2) return data || [];
  const threshold = GAP_THRESHOLDS[filter] || GAP_THRESHOLDS.Live;
  const result = [];
  for (let i = 0; i < data.length; i++) {
    result.push(data[i]);
    if (i < data.length - 1) {
      const curr = data[i]._ts;
      const next = data[i + 1]._ts;
      if (curr && next && (next - curr) > threshold) {
        result.push({
          timestamp: data[i].timestamp + '__gap',
          _ts: curr + 1,
          ...NULL_SENSOR_VALS,
        });
      }
    }
  }
  return result;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-4 min-w-[240px] border border-neutral-100/50">
        <div className="text-[13px] font-bold text-neutral-500 mb-3 pb-2 border-b border-neutral-100">{label}</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {payload.map((entry, index) => {
            const config = METRIC_CONFIG.find(c => c.key === entry.dataKey);
            return (
              <div key={index} className="flex justify-between items-center gap-3">
                <span className="text-[12px] text-neutral-500 font-medium">{config?.label || entry.name}</span>
                <span className="text-[13px] font-bold tabular-nums" style={{ color: entry.color }}>
                  {entry.value !== undefined && entry.value !== null ? entry.value : '--'}
                  {config?.unit && <span className="text-[10px] ml-0.5 opacity-80">{config.unit}</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ visibleMetrics, toggleMetric }) => {
  return (
    <div className="flex flex-wrap justify-center gap-3 pt-8 pb-2">
      {METRIC_CONFIG.map((config) => {
        const isVisible = visibleMetrics[config.key];
        return (
          <button
            key={config.key}
            onClick={() => toggleMetric(config.key)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[13px] font-semibold",
              isVisible 
                ? "bg-white border-neutral-200 shadow-sm text-neutral-700" 
                : "bg-neutral-50 border-transparent text-neutral-400 hover:bg-neutral-100"
            )}
          >
            {isVisible ? (
              <CheckSquare className="w-4 h-4" style={{ color: config.color }} />
            ) : (
              <Square className="w-4 h-4 text-neutral-300" />
            )}
            {config.label}
          </button>
        );
      })}
    </div>
  );
};

const CurrentValues = ({ latestSensors, visibleMetrics }) => {
  if (!latestSensors) return null;
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {METRIC_CONFIG.map(config => {
        if (!visibleMetrics[config.key]) return null;
        const val = latestSensors[config.key];
        return (
          <div key={config.key} className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 rounded-lg border border-neutral-100">
            <span className="text-[11px] font-bold text-neutral-500">{config.label}</span>
            <span className="text-[14px] font-bold tabular-nums" style={{ color: config.color }}>
              {val !== undefined ? val : '--'}
              {config.unit && <span className="text-[11px] ml-0.5 opacity-80">{config.unit}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export function ChartsSection() {
  const [activeFilter, setActiveFilter] = useState('Live');
  const filters = ['Live', '1H', '24H', '7D', '30D'];
  
  const history = useDashboardStore(state => state.history);
  const latestSensors = useDashboardStore(state => state.sensors.latest);
  const uiState = useDashboardStore(state => state.ui.state);
  const isLoading = uiState === 'initialLoading';

  const [visibleMetrics, setVisibleMetrics] = useState(() => {
    const initialState = {};
    METRIC_CONFIG.forEach(c => {
      initialState[c.key] = c.defaultVisible;
    });
    return initialState;
  });

  const toggleMetric = useCallback((key) => {
    setVisibleMetrics(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  const exportData = (type) => {
    if (!history || history.length === 0) return;
    
    const activeKeys = METRIC_CONFIG.filter(c => visibleMetrics[c.key]).map(c => c.key);
    
    const filteredHistory = history.map(item => {
      const filtered = { timestamp: item.timestamp };
      activeKeys.forEach(k => {
        if (item[k] !== undefined) filtered[k] = item[k];
      });
      return filtered;
    });

    if (type === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredHistory, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "iaq_analytics.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } else if (type === 'csv') {
      const keys = ['timestamp', ...activeKeys];
      const csvStr = [
        keys.join(','),
        ...filteredHistory.map(item => keys.map(k => item[k] !== undefined ? item[k] : '').join(','))
      ].join('\n');
      const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvStr);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "iaq_analytics.csv");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  };

  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = React.useRef(null);

  // Close filter menu on outside click
  React.useEffect(() => {
    const handler = (e) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) {
        setFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Shared controls content (used in both inline + dropdown)
  const controlsContent = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => { setActiveFilter(f); setFilterMenuOpen(false); }}
            className={cn(
              "px-3 py-1 text-[11px] font-bold rounded-md transition-all duration-150",
              activeFilter === f ? "bg-white text-neutral-800 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => { exportData('csv'); setFilterMenuOpen(false); }}
          className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-neutral-600 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors shadow-sm"
          title="Export CSV"
        >
          <Download className="w-3 h-3" /> CSV
        </button>
        <button
          onClick={() => { exportData('json'); setFilterMenuOpen(false); }}
          className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-neutral-600 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors shadow-sm"
          title="Export JSON"
        >
          <Download className="w-3 h-3" /> JSON
        </button>
      </div>
    </div>
  );

  const filterButtons = (
    <>
      {/* md+: inline controls */}
      <div className="hidden md:flex items-center gap-3">
        {controlsContent}
      </div>

      {/* < md: funnel icon → dropdown */}
      <div className="md:hidden relative" ref={filterMenuRef}>
        <button
          onClick={() => setFilterMenuOpen(o => !o)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-bold transition-all",
            filterMenuOpen
              ? "bg-primary text-white border-primary shadow-sm"
              : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400 shadow-sm"
          )}
          title="Chart filters"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>{activeFilter}</span>
        </button>

        {filterMenuOpen && (
          <div className="absolute right-0 top-full mt-2 z-30 bg-white border border-neutral-200 rounded-xl shadow-xl p-3 min-w-[260px]">
            {controlsContent}
          </div>
        )}
      </div>
    </>
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-[16px] shadow-soft p-[24px]">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="w-48 h-8" />
          <Skeleton className="w-64 h-8" />
        </div>
        <Skeleton className="w-full h-[500px]" />
      </div>
    );
  }

  const activeMetricsList = METRIC_CONFIG.filter(c => visibleMetrics[c.key]);

  const chartData = processDataWithGaps(history, activeFilter);

  if (!history || history.length === 0) {
    return (
      <div className="bg-white rounded-[16px] shadow-soft p-[24px] flex flex-col w-full min-h-[300px] items-center justify-center gap-4">
        <div className="flex items-center justify-between w-full mb-4">
          <h3 className="text-[20px] font-bold text-neutral-800">Air Quality Analytics</h3>
          {filterButtons}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <p className="text-[15px] font-semibold text-neutral-600">No data available</p>
          <p className="text-[13px] text-neutral-400 max-w-xs">The device has not sent any readings yet. Data will appear here once the device comes online.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[16px] shadow-soft p-[24px] flex flex-col w-full h-full min-h-[600px]">
      
      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-2 gap-4">
        <h3 className="text-[20px] font-bold text-neutral-800">Air Quality Analytics</h3>
        {filterButtons}
      </div>

      <CurrentValues latestSensors={latestSensors} visibleMetrics={visibleMetrics} />

      <div className="flex-1 w-full min-h-[450px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.6} />
            
            <XAxis 
              dataKey="timestamp" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#a1a1aa', fontSize: 11 }} 
              tickFormatter={formatTime}
              dy={15} 
            />
            
            {/* Left Axis - AQI & PM */}
            <YAxis 
              yAxisId="left"
              orientation="left"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#a1a1aa', fontSize: 11 }} 
              width={40}
            />
            
            {/* Right Axis - CO2 */}
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#a1a1aa', fontSize: 11 }} 
              width={40}
            />
            
            {/* Far Right Axis - Others */}
            <YAxis 
              yAxisId="far-right"
              orientation="right"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#a1a1aa', fontSize: 11 }} 
              width={40}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e4e4e7', strokeWidth: 2, strokeDasharray: '4 4' }} />
            
            <Legend content={<CustomLegend visibleMetrics={visibleMetrics} toggleMetric={toggleMetric} />} verticalAlign="bottom" />
            
            {activeMetricsList.map((config) => (
              <Line 
                key={config.key}
                yAxisId={config.yAxisId}
                type="monotone" 
                dataKey={config.key} 
                name={config.label}
                stroke={config.color} 
                strokeWidth={3} 
                dot={{ r: 0 }} 
                activeDot={{ r: 6, strokeWidth: 0, fill: config.color }} 
                connectNulls={false}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            ))}

            <Brush 
              dataKey="timestamp" 
              height={24} 
              stroke="#e4e4e7" 
              fill="#fafafa"
              tickFormatter={() => ''}
              travellerWidth={12}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
