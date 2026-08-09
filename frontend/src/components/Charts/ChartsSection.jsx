import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceArea, Brush 
} from 'recharts';
import { cn } from '../../utils/cn';
import { Skeleton } from '../LoadingSkeleton/LoadingSkeleton';
import { useDashboardStore } from '../../store/dashboardStore';
import { Download, CheckSquare, Square, LayoutGrid, Layers } from 'lucide-react';

// Curated high-contrast palette with distinct colors and dash styles for accessibility/colorblindness
const METRIC_CONFIG = [
  { key: 'AQI', label: 'AQI', color: '#10B981', yAxisId: 'left', unit: '', defaultVisible: true, strokeDasharray: '0' },
  { key: 'CO2', label: 'CO₂', color: '#EF4444', yAxisId: 'right', unit: 'ppm', defaultVisible: true, strokeDasharray: '0' },
  { key: 'VOC', label: 'VOC', color: '#F59E0B', yAxisId: 'right', unit: 'ppb', defaultVisible: false, strokeDasharray: '5 5' },
  { key: 'Temperature', label: 'Temperature', color: '#3B82F6', yAxisId: 'far-right', unit: '°C', defaultVisible: true, strokeDasharray: '0' },
  { key: 'Humidity', label: 'Humidity', color: '#14B8A6', yAxisId: 'far-right', unit: '%', defaultVisible: true, strokeDasharray: '5 5' },
  { key: 'PM2_5', label: 'PM2.5', color: '#8B5CF6', yAxisId: 'left', unit: 'µg/m³', defaultVisible: true, strokeDasharray: '0' },
  { key: 'NOX', label: 'NOx', color: '#6B7280', yAxisId: 'right', unit: 'ppb', defaultVisible: false, strokeDasharray: '2 2' },
  { key: 'PM1_0', label: 'PM1.0', color: '#06B6D4', yAxisId: 'left', unit: 'µg/m³', defaultVisible: false, strokeDasharray: '5 5' },
  { key: 'PM4_0', label: 'PM4.0', color: '#D946EF', yAxisId: 'left', unit: 'µg/m³', defaultVisible: false, strokeDasharray: '2 2' },
  { key: 'PM10', label: 'PM10', color: '#EC4899', yAxisId: 'left', unit: 'µg/m³', defaultVisible: false, strokeDasharray: '8 3 2 3' },
];

const AXIS_THEME = {
  left: { color: '#8B5CF6', label: 'AQI/PM', bg: 'bg-[#8b5cf6]/5', border: 'border-[#8b5cf6]/25', text: 'text-[#8b5cf6]' },
  right: { color: '#EF4444', label: 'Gases', bg: 'bg-[#ef4444]/5', border: 'border-[#ef4444]/25', text: 'text-[#ef4444]' },
  'far-right': { color: '#3B82F6', label: 'Temp/Hum', bg: 'bg-[#3b82f6]/5', border: 'border-[#3b82f6]/25', text: 'text-[#3b82f6]' }
};

const formatXAxisTick = (val, range) => {
  if (!val) return '';
  const date = new Date(val);
  if (isNaN(date.getTime())) {
    return String(val);
  }
  
  if (range === 'live' || range === '1h') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } else if (range === '24h') {
    const datePart = date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
    const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${datePart} ${timePart}`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

const NULL_SENSOR_VALS = Object.fromEntries(METRIC_CONFIG.map(c => [c.key, null]));

/**
 * Calculates start/end boundaries and detects/injects null values at intervals exceeding the dynamic threshold.
 */
const processDataWithGapsAndDetect = (data, range) => {
  const nowTimeMs = Date.now();
  let gapThresholdMs = 60 * 1000; // default 1 min
  let rangeDurationMs = 25 * 60 * 1000;
  if (range === '1h') {
    gapThresholdMs = 120 * 1000; // 2 min
    rangeDurationMs = 1 * 60 * 60 * 1000;
  } else if (range === '24h') {
    gapThresholdMs = 600 * 1000; // 10 min
    rangeDurationMs = 24 * 60 * 60 * 1000;
  } else if (range === '7d') {
    gapThresholdMs = 4 * 60 * 60 * 1000; // 4 hours
    rangeDurationMs = 7 * 24 * 60 * 60 * 1000;
  } else if (range === '30d') {
    gapThresholdMs = 24 * 60 * 60 * 1000; // 24 hours
    rangeDurationMs = 30 * 24 * 60 * 60 * 1000;
  }

  const queryStartMs = nowTimeMs - rangeDurationMs;
  const queryEndMs = nowTimeMs;

  // Filter input data to keep only points falling strictly within the selected range window
  const sorted = [...(data || [])]
    .filter(p => p._ts && p._ts >= queryStartMs && p._ts <= queryEndMs)
    .sort((a, b) => a._ts - b._ts);

  if (sorted.length === 0) {
    return {
      chartData: [],
      gaps: [],
      queryStartMs,
      queryEndMs
    };
  }

  const chartData = [];
  const gaps = [];

  const firstPointTs = sorted[0]._ts;
  const lastPointTs = sorted[sorted.length - 1]._ts;

  // 1. Gap from start of range to first data point
  if (firstPointTs - queryStartMs > gapThresholdMs) {
    gaps.push({
      start: queryStartMs,
      end: firstPointTs
    });
  }

  // 2. Loop through real points to find consecutive gap points
  for (let i = 0; i < sorted.length; i++) {
    chartData.push(sorted[i]);
    if (i < sorted.length - 1) {
      const curr = sorted[i]._ts;
      const next = sorted[i + 1]._ts;
      if (curr && next && (next - curr) > gapThresholdMs) {
        gaps.push({
          start: curr,
          end: next
        });
        
        // Split line rendering using null point
        chartData.push({
          _ts: curr + 1,
          ...NULL_SENSOR_VALS,
        });
      }
    }
  }

  // 3. Gap from last data point to end of range
  if (queryEndMs - lastPointTs > gapThresholdMs) {
    gaps.push({
      start: lastPointTs,
      end: queryEndMs
    });
  }

  return { chartData, gaps, queryStartMs, queryEndMs };
};

const CustomTooltip = ({ active, payload, label, range }) => {
  if (active && payload && payload.length) {
    const formattedLabel = formatXAxisTick(label, range);
    return (
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-3 md:p-4 min-w-[200px] md:min-w-[250px] border border-neutral-100/50">
        <div className="text-[12px] md:text-[13px] font-bold text-neutral-500 mb-2 md:mb-3 pb-1.5 md:pb-2 border-b border-neutral-100">{formattedLabel}</div>
        <div className="grid grid-cols-2 gap-x-4 md:gap-x-6 gap-y-2 md:gap-y-3">
          {payload.map((entry, index) => {
            const config = METRIC_CONFIG.find(c => c.key === entry.dataKey);
            if (!config) return null;
            return (
              <div key={index} className="flex justify-between items-center gap-2">
                <span className="text-[10px] md:text-[12px] text-neutral-500 font-semibold flex items-center gap-1 md:gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: config.color }}></span>
                  {config.label}
                </span>
                <span className="text-[11px] md:text-[13px] font-bold tabular-nums" style={{ color: config.color }}>
                  {entry.value !== undefined && entry.value !== null ? entry.value : '--'}
                  {config.unit && <span className="text-[9px] md:text-[10px] ml-0.5 opacity-80">{config.unit}</span>}
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

const CustomLegend = ({ visibleMetrics, toggleMetric, hoveredMetricKey, setHoveredMetric, isMobile }) => {
  return (
    <div className="flex flex-wrap justify-center gap-2 md:gap-3 pt-4 md:pt-6 pb-2">
      {METRIC_CONFIG.map((config) => {
        const isVisible = visibleMetrics[config.key];
        const isAnyHovered = hoveredMetricKey !== null;
        const isCurrentHovered = hoveredMetricKey === config.key;
        const theme = AXIS_THEME[config.yAxisId];
        
        return (
          <button
            key={config.key}
            onClick={() => toggleMetric(config.key)}
            onMouseEnter={() => !isMobile && setHoveredMetric(config.key)}
            onMouseLeave={() => !isMobile && setHoveredMetric(null)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg border transition-all text-[10px] md:text-[12px] font-bold shadow-sm",
              isVisible 
                ? cn("bg-white", theme.bg, theme.border, theme.text) 
                : "bg-neutral-50 border-transparent text-neutral-400 hover:bg-neutral-100",
              isAnyHovered && !isCurrentHovered && "opacity-40"
            )}
          >
            {isVisible ? (
              <CheckSquare className="w-3.5 h-3.5 text-current shrink-0" />
            ) : (
              <Square className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
            )}
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export function ChartsSection() {
  const [viewMode, setViewMode] = useState('combined'); // 'combined' | 'grid'
  const [isMobile, setIsMobile] = useState(false);

  // Resize listener to adapt chart axis layouts on smaller devices
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const history = useDashboardStore(state => state.history);
  const latestSensors = useDashboardStore(state => state.sensors.latest);
  const uiState = useDashboardStore(state => state.ui.state);
  const visibleMetrics = useDashboardStore(state => state.visibleMetrics);
  const toggleMetric = useDashboardStore(state => state.toggleMetric);
  const hoveredMetricKey = useDashboardStore(state => state.hoveredMetricKey);
  const setHoveredMetric = useDashboardStore(state => state.setHoveredMetric);
  const timeRange = useDashboardStore(state => state.timeRange);
  const setTimeRange = useDashboardStore(state => state.setTimeRange);
  const isHistoryLoading = useDashboardStore(state => state.isHistoryLoading);
  const historyError = useDashboardStore(state => state.historyError);
  const selectedDeviceId = useDashboardStore(state => state.selectedDeviceId);
  
  const isLoading = uiState === 'initialLoading';
  const filters = [
    { label: 'Live', value: 'live' },
    { label: '1H', value: '1h' },
    { label: '24H', value: '24h' },
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
  ];

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
      downloadAnchorNode.setAttribute("download", `iaq_analytics_${timeRange}.json`);
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
      downloadAnchorNode.setAttribute("download", `iaq_analytics_${timeRange}.csv`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  };

  const controlsContent = (
    <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full xl:w-auto">
      {/* Combined / Grid View Toggle */}
      <div className="flex items-center gap-0.5 md:gap-1 bg-neutral-100 p-0.5 md:p-1 rounded-lg">
        <button
          onClick={() => setViewMode('combined')}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1 md:px-3 md:py-1.5 text-[10px] md:text-[11px] font-bold rounded-md transition-all duration-150",
            viewMode === 'combined' ? "bg-white text-neutral-800 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
          )}
        >
          <Layers className="w-3 md:w-3.5 h-3 md:h-3.5 shrink-0" />
          <span>Combined</span>
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1 md:px-3 md:py-1.5 text-[10px] md:text-[11px] font-bold rounded-md transition-all duration-150",
            viewMode === 'grid' ? "bg-white text-neutral-800 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
          )}
        >
          <LayoutGrid className="w-3 md:w-3.5 h-3 md:h-3.5 shrink-0" />
          <span>Grid</span>
        </button>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center gap-0.5 md:gap-1 bg-neutral-100 p-0.5 md:p-1 rounded-lg">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setTimeRange(f.value)}
            disabled={isHistoryLoading}
            className={cn(
              "px-2 py-1 md:px-3 md:py-1 text-[10px] md:text-[11px] font-bold rounded-md transition-all duration-150",
              timeRange === f.value ? "bg-white text-neutral-800 shadow-sm" : "text-neutral-500 hover:text-neutral-700",
              isHistoryLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* CSV / JSON Exports */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => exportData('csv')}
          className="flex items-center gap-1 px-2.5 py-1 md:px-3 md:py-1.5 text-[10px] md:text-[11px] font-bold text-neutral-600 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors shadow-sm"
        >
          <Download className="w-3 md:w-3.5 h-3 md:h-3.5 shrink-0" /> CSV
        </button>
        <button
          onClick={() => exportData('json')}
          className="flex items-center gap-1 px-2.5 py-1 md:px-3 md:py-1.5 text-[10px] md:text-[11px] font-bold text-neutral-600 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors shadow-sm"
        >
          <Download className="w-3 md:w-3.5 h-3 md:h-3.5 shrink-0" /> JSON
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-[16px] shadow-soft p-4 md:p-[24px]">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="w-48 h-8" />
          <Skeleton className="w-64 h-8" />
        </div>
        <Skeleton className="w-full h-[300px] md:h-[500px]" />
      </div>
    );
  }

  const isEmptyHistory = !history || history.length === 0;

  // Gap detection and boundary mapping
  const { chartData, gaps, queryStartMs, queryEndMs } = processDataWithGapsAndDetect(history || [], timeRange);
  const activeMetricsList = METRIC_CONFIG.filter(c => visibleMetrics[c.key]);

  // If there's no data, construct boundary points to render empty axes grid
  const dataForChart = isEmptyHistory 
    ? [
        { _ts: queryStartMs, ...NULL_SENSOR_VALS },
        { _ts: queryEndMs, ...NULL_SENSOR_VALS }
      ]
    : chartData;

  // Diagnostics printed in the console
  console.log("DIAGNOSTIC - chartData length:", chartData?.length, "gaps detected:", gaps, "range:", timeRange);

  if (!selectedDeviceId) {
    return (
      <div className="bg-white rounded-[16px] shadow-soft p-4 md:p-[24px] flex flex-col w-full min-h-[300px] items-center justify-center gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between w-full mb-4 gap-4">
          <h3 className="text-[20px] font-bold text-neutral-800">Air Quality Analytics</h3>
          {controlsContent}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <p className="text-[15px] font-semibold text-neutral-600">No device selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[16px] shadow-soft p-4 md:p-[24px] flex flex-col w-full h-full min-h-[500px] md:min-h-[600px]">
      
      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 gap-4">
        <h3 className="text-[18px] md:text-[20px] font-bold text-neutral-800">Air Quality Analytics</h3>
        {controlsContent}
      </div>

      {viewMode === 'combined' ? (
        /* ==================== COMBINED CHART VIEW ==================== */
        <div className="flex-1 flex flex-col relative">
          <div className="w-full h-[300px] md:h-[450px] relative">
            {/* Transparent glassmorphism loading overlay */}
            {isHistoryLoading && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-xl transition-all duration-200">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-neutral-200 border-t-purple-600 rounded-full animate-spin"></div>
                  <span className="text-[11px] md:text-[12px] font-bold text-neutral-500">Loading historical data...</span>
                </div>
              </div>
            )}

            {/* Error state card with retry option */}
            {historyError ? (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-neutral-50 border border-neutral-200/50 rounded-2xl p-4 md:p-6 text-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-[13px] md:text-[14px] text-neutral-800">Failed to load historical data</h4>
                  <p className="text-[11px] md:text-[12px] text-neutral-400 max-w-xs">{historyError}</p>
                </div>
                <button
                  onClick={() => setTimeRange(timeRange)}
                  className="px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-[12px] font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                >
                  Retry Connection
                </button>
              </div>
            ) : null}

            {/* Centered Empty State Message Overlay (preserves axes and grid beneath it) */}
            {isEmptyHistory && !isHistoryLoading && !historyError && (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-neutral-50/15 backdrop-blur-[0.5px] rounded-2xl p-6 text-center gap-3 pointer-events-none">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 shadow-sm border border-neutral-200/30">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="font-bold text-[13px] md:text-[14px] text-neutral-700">No data available for this time range</h4>
                <p className="text-[11px] md:text-[12px] text-neutral-400 max-w-xs">There are no recorded readings for this device in the selected time window.</p>
              </div>
            )}

            {!historyError && (
              <ResponsiveContainer width="100%" height="100%">
                {/* Responsive margin adjustment to maximize space on mobile */}
                <LineChart 
                  data={dataForChart} 
                  margin={isMobile 
                    ? { top: 10, right: 15, left: -25, bottom: 10 } 
                    : { top: 20, right: 150, left: 20, bottom: 20 }
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.6} />
                  
                  <XAxis 
                    dataKey="_ts" 
                    type="number"
                    domain={[queryStartMs, queryEndMs]}
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#a1a1aa', fontSize: isMobile ? 9 : 11 }} 
                    tickFormatter={(val) => formatXAxisTick(val, timeRange)}
                    minTickGap={isMobile ? 50 : 80} // Declutter x-axis ticks
                    dy={10} 
                  />
                  
                  {/* Left Y-Axis: Particulates & Index */}
                  <YAxis 
                    yAxisId="left"
                    orientation="left"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#8B5CF6', fontSize: isMobile ? 8 : 10, fontWeight: 'bold' }} 
                    width={isMobile ? 35 : 60}
                    label={isMobile ? undefined : { 
                      value: 'Particulates & AQI (µg/m³, Index)', 
                      angle: -90, 
                      position: 'insideLeft', 
                      offset: 10,
                      style: { textAnchor: 'middle', fill: '#8B5CF6', fontSize: 10, fontWeight: 'bold' } 
                    }}
                  />
                  
                  {/* Right Y-Axis: Gases (Primary Right Axis, hidden on mobile for space) */}
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    hide={isMobile}
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#EF4444', fontSize: 10, fontWeight: 'bold' }} 
                    width={60}
                    label={{ 
                      value: 'Gases (ppm, ppb)', 
                      angle: 90, 
                      position: 'insideRight', 
                      offset: -50,
                      style: { textAnchor: 'middle', fill: '#EF4444', fontSize: 10, fontWeight: 'bold' } 
                    }}
                  />
                  
                  {/* Far Right Y-Axis: Temp & Humidity (Secondary Right Axis, hidden on mobile for space) */}
                  <YAxis 
                    yAxisId="far-right"
                    orientation="right"
                    hide={isMobile}
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#3B82F6', fontSize: 10, fontWeight: 'bold' }} 
                    width={60}
                    label={{ 
                      value: 'Temp & Humidity (°C, %)', 
                      angle: 90, 
                      position: 'insideRight', 
                      offset: -100,
                      style: { textAnchor: 'middle', fill: '#3B82F6', fontSize: 10, fontWeight: 'bold' } 
                    }}
                  />

                  {/* Shaded Area Visualizer for data gaps (rendered before line to sit underneath) */}
                  {gaps.map((gap, index) => (
                    <ReferenceArea
                      key={`gap-${index}`}
                      x1={gap.start}
                      x2={gap.end}
                      yAxisId="left"
                      fill="#94a3b8"
                      fillOpacity={0.15}
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      strokeOpacity={0.4}
                      label={{ 
                        value: 'No data', 
                        fill: '#94a3b8', 
                        fontSize: isMobile ? 9 : 11, 
                        fontWeight: '600', 
                        position: 'center' 
                      }}
                    />
                  ))}

                  <Tooltip 
                    content={<CustomTooltip range={timeRange} />} 
                    wrapperStyle={{ zIndex: 1000 }} // Sits cleanly on top of other canvas layers
                    cursor={{ stroke: '#e4e4e7', strokeWidth: 1.5, strokeDasharray: '4 4' }} 
                  />
                  
                  {activeMetricsList.map((config) => {
                    const isAnyHovered = hoveredMetricKey !== null;
                    const isCurrentHovered = hoveredMetricKey === config.key;
                    const opacity = isAnyHovered ? (isCurrentHovered ? 1.0 : 0.15) : 0.85;
                    const strokeWidth = isAnyHovered ? (isCurrentHovered ? 4.5 : 1.5) : (isMobile ? 2 : 3);

                    return (
                      <Line 
                        key={config.key}
                        yAxisId={config.yAxisId}
                        type="monotone" 
                        dataKey={config.key} 
                        name={config.label}
                        stroke={config.color} 
                        strokeDasharray={config.strokeDasharray}
                        strokeWidth={strokeWidth} 
                        strokeOpacity={opacity}
                        dot={false}
                        activeDot={{ r: isMobile ? 4 : 6, strokeWidth: 0, fill: config.color, strokeOpacity: opacity }} 
                        connectNulls={false}
                        isAnimationActive={true}
                        animationDuration={1000}
                      />
                    );
                  })}

                  {/* Brush hidden on mobile devices as it is hard to slide with touch targets */}
                  {!isMobile && (
                    <Brush 
                      key={timeRange}
                      dataKey="_ts" 
                      height={24} 
                      stroke="#e4e4e7" 
                      fill="#fafafa"
                      tickFormatter={() => ''}
                      travellerWidth={12}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Synced Interactive Legend */}
          <CustomLegend 
            visibleMetrics={visibleMetrics} 
            toggleMetric={toggleMetric} 
            hoveredMetricKey={hoveredMetricKey}
            setHoveredMetric={setHoveredMetric}
            isMobile={isMobile}
          />
        </div>
      ) : (
        /* ==================== GRID OF SPARKLINE CHARTS ==================== */
        <div className="relative flex-1">
          {/* Transparent glassmorphism loading overlay */}
          {isHistoryLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-xl transition-all duration-200 min-h-[350px]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-neutral-200 border-t-purple-600 rounded-full animate-spin"></div>
                <span className="text-[11px] md:text-[12px] font-bold text-neutral-500">Loading historical data...</span>
              </div>
            </div>
          )}

          {/* Error state card with retry option */}
          {historyError ? (
            <div className="flex flex-col items-center justify-center bg-neutral-50 border border-neutral-200/50 rounded-2xl p-6 md:p-8 text-center gap-3 md:gap-4 min-h-[350px]">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="font-bold text-[13px] md:text-[14px] text-neutral-800">Failed to load historical data</h4>
                <p className="text-[11px] md:text-[12px] text-neutral-400 max-w-xs">{historyError}</p>
              </div>
              <button
                onClick={() => setTimeRange(timeRange)}
                className="px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-[12px] font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
              >
                Retry Connection
              </button>
            </div>
          ) : null}

          {/* Centered Empty State Message Overlay (preserves axes and grid beneath it) */}
          {isEmptyHistory && !isHistoryLoading && !historyError && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-neutral-50/15 backdrop-blur-[0.5px] rounded-2xl p-8 text-center gap-3 min-h-[350px] pointer-events-none">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 shadow-sm border border-neutral-200/30">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="font-bold text-[13px] md:text-[14px] text-neutral-700">No data available for this time range</h4>
              <p className="text-[11px] md:text-[12px] text-neutral-400 max-w-xs">There are no recorded readings for this device in the selected time window.</p>
            </div>
          )}

          {!historyError && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[16px] md:gap-[20px]">
              {activeMetricsList.map((config) => {
                const isAnyHovered = hoveredMetricKey !== null;
                const isCurrentHovered = hoveredMetricKey === config.key;
                
                return (
                  <div 
                    key={config.key} 
                    onMouseEnter={() => !isMobile && setHoveredMetric(config.key)}
                    onMouseLeave={() => !isMobile && setHoveredMetric(null)}
                    className={cn(
                      "bg-neutral-50/50 rounded-2xl border border-neutral-100 p-4 md:p-5 flex flex-col justify-between transition-all duration-200 h-[240px] md:h-[280px]",
                      isAnyHovered && !isCurrentHovered && "opacity-50 blur-[0.5px]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: config.color }}
                        ></span>
                        <span className="font-bold text-[13px] md:text-[14px] text-neutral-800 tracking-wide">
                          {config.label}
                        </span>
                      </div>
                      {latestSensors[config.key] !== undefined && (
                        <div className="flex items-baseline gap-0.5">
                          <span className="font-bold text-[18px] md:text-[20px] text-neutral-800 tracking-tight">
                            {latestSensors[config.key]}
                          </span>
                          {config.unit && (
                            <span className="text-[10px] md:text-[11px] font-semibold text-neutral-400">
                              {config.unit}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 w-full min-h-[140px] md:min-h-[170px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={dataForChart} 
                          syncId="iaq-grid-sync" // Sync hover cursors, dots, and tooltips globally in the grid
                          margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.6} />
                          
                          <XAxis 
                            dataKey="_ts" 
                            type="number"
                            domain={[queryStartMs, queryEndMs]}
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#a1a1aa', fontSize: isMobile ? 8 : 9 }} 
                            tickFormatter={(val) => formatXAxisTick(val, timeRange)}
                            minTickGap={isMobile ? 45 : 60}
                          />
                          
                          <YAxis 
                            domain={['auto', 'auto']} // Autoscale to highlight shape comparisons
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#a1a1aa', fontSize: isMobile ? 8 : 9 }}
                            width={isMobile ? 25 : 30}
                          />
                          
                          <Tooltip 
                            content={<CustomTooltip range={timeRange} />} 
                            wrapperStyle={{ zIndex: 1000 }}
                          />
                          
                          {/* Gap rendering on small multiples (rendered before line to sit underneath) */}
                          {gaps.map((gap, index) => (
                            <ReferenceArea
                              key={`gap-grid-${index}`}
                              x1={gap.start}
                              x2={gap.end}
                              fill="#94a3b8"
                              fillOpacity={0.15}
                              stroke="#94a3b8"
                              strokeDasharray="4 4"
                              strokeOpacity={0.4}
                              label={{ 
                                value: 'No data', 
                                fill: '#94a3b8', 
                                fontSize: isMobile ? 9 : 11, 
                                fontWeight: '600', 
                                position: 'center' 
                              }}
                            />
                          ))}
                          
                          <Line
                            type="monotone"
                            dataKey={config.key}
                            stroke={config.color}
                            strokeDasharray={config.strokeDasharray}
                            strokeWidth={isMobile ? 2 : 3}
                            dot={false}
                            activeDot={{ r: isMobile ? 3 : 5, strokeWidth: 0, fill: config.color }}
                            connectNulls={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
