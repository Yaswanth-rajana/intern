import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, Download, Filter, RotateCcw, ChevronLeft, 
  ChevronRight, Calendar, AlertCircle, RefreshCw, X
} from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import { fetchHistoricalReadings, exportReadingsCSV } from '../../services/api';
import { getSensorStatus } from '../../utils/sensorStatusConfig';

// Unit and title mapping
const SENSOR_LABELS = {
  AQI: { title: 'AQI', unit: 'aqi' },
  CO2: { title: 'CO₂', unit: 'ppm' },
  Temperature: { title: 'TEMP', unit: '°C' },
  Humidity: { title: 'HUMIDITY', unit: '%' },
  VOC: { title: 'VOC', unit: 'ppb' },
  NOX: { title: 'NOX', unit: 'ppb' },
  PM1_0: { title: 'PM 1.0', unit: 'µg/m³' },
  PM2_5: { title: 'PM 2.5', unit: 'µg/m³' },
  PM4_0: { title: 'PM 4.0', unit: 'µg/m³' },
  PM10: { title: 'PM 10', unit: 'µg/m³' },
};

// Date formatter helpers
const formatForDatetimeLocal = (date) => {
  if (!date) return '';
  const pad = (num) => String(num).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const formatDisplayTimeOnly = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const formatNumber = (val) => {
  if (val === undefined || val === null) return null;
  if (typeof val !== 'number') return val;
  return parseFloat(val.toFixed(2));
};

export function HistoricalRecords() {
  const deviceList = useDashboardStore(state => state.deviceList);

  // Default time range to "Last 24 Hours" as requested to prevent OOM / massive scans on startup
  const getInitialDates = () => {
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return {
      start: formatForDatetimeLocal(start),
      end: formatForDatetimeLocal(now)
    };
  };

  const initialDates = getInitialDates();

  // Filter States
  const [selectedDeviceId, setSelectedDeviceId] = useState('All');
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [activePreset, setActivePreset] = useState('24h');

  // Query Execution States
  const [readings, setReadings] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  // Active Applied Filters
  const [appliedFilters, setAppliedFilters] = useState({
    deviceId: 'All',
    startDate: initialDates.start,
    endDate: initialDates.end
  });

  // Selected Reading for Details Drawer
  const [selectedReading, setSelectedReading] = useState(null);

  // Calculate preset ranges
  const applyPreset = (presetName) => {
    setActivePreset(presetName);
    const now = new Date();
    let start = null;

    switch (presetName) {
      case '1h':
        start = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'AllTime':
      default:
        start = null;
        break;
    }

    if (start) {
      setStartDate(formatForDatetimeLocal(start));
      setEndDate(formatForDatetimeLocal(now));
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // Fetch readings from server
  const fetchReadings = React.useCallback(async (pageNumber = 1, pageLimit = pagination.limit) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        page: pageNumber,
        limit: pageLimit
      };

      if (appliedFilters.deviceId !== 'All') {
        params.deviceId = appliedFilters.deviceId;
      }
      if (appliedFilters.startDate) {
        params.startDate = new Date(appliedFilters.startDate).toISOString();
      }
      if (appliedFilters.endDate) {
        params.endDate = new Date(appliedFilters.endDate).toISOString();
      }

      const response = await fetchHistoricalReadings(params);
      setReadings(response.data || []);
      setPagination(response.pagination || {
        page: pageNumber,
        limit: pageLimit,
        total: response.data?.length || 0,
        totalPages: 1
      });
    } catch (err) {
      console.error('Failed to fetch historical readings:', err);
      setError('Unable to load historical readings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, pagination.limit]);

  // Trigger search on apply filters
  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setError('Start Date cannot be after End Date.');
      return;
    }

    setAppliedFilters({
      deviceId: selectedDeviceId,
      startDate,
      endDate
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedDeviceId('All');
    setStartDate('');
    setEndDate('');
    setActivePreset('AllTime');
    setAppliedFilters({
      deviceId: 'All',
      startDate: '',
      endDate: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle Export CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const params = {};
      if (appliedFilters.deviceId !== 'All') {
        params.deviceId = appliedFilters.deviceId;
      }
      if (appliedFilters.startDate) {
        params.startDate = new Date(appliedFilters.startDate).toISOString();
      }
      if (appliedFilters.endDate) {
        params.endDate = new Date(appliedFilters.endDate).toISOString();
      }

      const blob = await exportReadingsCSV(params);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sensor_readings_${appliedFilters.deviceId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch data whenever applied filters or page details change
  useEffect(() => {
    fetchReadings(pagination.page, pagination.limit);
  }, [appliedFilters, pagination.page, pagination.limit, fetchReadings]);

  // Determine displays in summary box
  const summaryInfo = useMemo(() => {
    let activeDevName = 'All Devices';
    if (appliedFilters.deviceId !== 'All') {
      const dev = deviceList.find(d => d.deviceId === appliedFilters.deviceId);
      activeDevName = dev ? (dev.name ? `${dev.name} (${dev.deviceId})` : dev.deviceId) : appliedFilters.deviceId;
    }

    let activePeriod = 'All Time';
    if (appliedFilters.startDate && appliedFilters.endDate) {
      const start = new Date(appliedFilters.startDate).toLocaleDateString();
      const end = new Date(appliedFilters.endDate).toLocaleDateString();
      activePeriod = `${start} - ${end}`;
    } else if (appliedFilters.startDate) {
      activePeriod = `Since ${new Date(appliedFilters.startDate).toLocaleDateString()}`;
    } else if (appliedFilters.endDate) {
      activePeriod = `Until ${new Date(appliedFilters.endDate).toLocaleDateString()}`;
    }

    const latestTimestamp = readings.length > 0 ? readings[0].timestamp : null;

    return {
      deviceName: activeDevName,
      period: activePeriod,
      latestTime: latestTimestamp ? formatDisplayTimeOnly(latestTimestamp) : 'N/A'
    };
  }, [appliedFilters, readings, deviceList]);

  // Status badge styling helper
  const getBadgeClasses = (color) => {
    const colorClasses = {
      green: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/40',
      blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/40',
      yellow: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/40',
      orange: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800/40',
      red: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/40',
      gray: 'bg-neutral-50 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'
    };
    return colorClasses[color] || colorClasses.gray;
  };

  // Render Table Cell - Only displays raw values with semibold high-contrast text
  const renderCell = (key, rawValue) => {
    const value = formatNumber(rawValue);
    if (value === undefined || value === null) {
      return <span className="text-neutral-400 font-mono">-</span>;
    }

    return (
      <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-600">
        {value}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12 relative min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 flex items-center gap-3">
            <History className="w-7 h-7 text-primary" />
            Historical Records
          </h1>
          <p className="text-sm text-neutral-500 mt-1 font-medium">
            View and analyze historical sensor readings from your IAQ devices.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleExportCSV}
            disabled={isLoading || isExporting || readings.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-neutral-200 text-neutral-700 hover:text-neutral-950 hover:bg-neutral-50 shadow-sm transition-all text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer animate-duration-150"
          >
            {isExporting ? <RefreshCw className="w-4 h-4 animate-spin text-neutral-400" /> : <Download className="w-4 h-4 text-neutral-500" />}
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <span className="text-[10px] text-neutral-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-neutral-400 shrink-0" />
            CSV limit: 10,000 records
          </span>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-extrabold text-neutral-400 uppercase tracking-widest">
          <Filter className="w-4 h-4" />
          Filter Historical Readings
        </div>

        <form onSubmit={handleApplyFilters} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Device Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-500">Device</label>
            <select
              value={selectedDeviceId}
              onChange={e => { setSelectedDeviceId(e.target.value); setActivePreset(''); }}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm font-semibold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="All">All Devices</option>
              {deviceList.map(dev => (
                <option key={dev.deviceId} value={dev.deviceId}>
                  {dev.name || dev.deviceId} ({dev.location || 'Unallocated'})
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-500">Start Date</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setActivePreset(''); }}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm font-semibold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-500">End Date</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setActivePreset(''); }}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm font-semibold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Action Buttons & Presets */}
          <div className="md:col-span-3 flex flex-col md:flex-row md:flex-nowrap md:items-center justify-between gap-4 pt-2 w-full">
            {/* Presets */}
            <div className="flex flex-row flex-wrap md:flex-nowrap items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-neutral-400 mr-2 flex items-center gap-1 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" /> Presets:
              </span>
              {[
                { name: 'AllTime', label: 'All Time' },
                { name: '1h', label: '1 Hour' },
                { name: '6h', label: '6 Hours' },
                { name: '24h', label: '24 Hours' },
                { name: '7d', label: '7 Days' },
                { name: '30d', label: '30 Days' },
              ].map(preset => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset.name)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                    activePreset === preset.name
                      ? 'bg-primary text-white shadow-sm shadow-primary/20'
                      : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:border-neutral-300 hover:bg-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Filter actions */}
            <div className="flex flex-row flex-nowrap items-center gap-2 shrink-0 ml-auto md:ml-0">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-bold text-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-dark font-bold text-xs shadow-sm shadow-primary/20 cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Summary Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: pagination.total.toLocaleString() },
          { label: 'Selected Device', value: summaryInfo.deviceName },
          { label: 'Period', value: summaryInfo.period },
          { label: 'Latest Reading', value: summaryInfo.latestTime }
        ].map((item, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest">{item.label}</span>
            <span className="text-sm font-extrabold text-neutral-800 truncate mt-1.5" title={item.value}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col">
        {/* Scrollable table container with custom scrollbar properties */}
        <div className="overflow-x-auto min-w-0 scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100 hover:scrollbar-thumb-neutral-400 transition-all border-b border-neutral-200">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-[10px] font-extrabold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
                <th className="py-4 px-4 sticky left-0 bg-neutral-50 border-r border-neutral-200 z-10 w-[180px] min-w-[180px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Timestamp</th>
                <th className="py-4 px-4 min-w-[160px]">Device ID</th>
                {Object.entries(SENSOR_LABELS).map(([key, item]) => (
                  <th key={key} className="py-4 px-4 whitespace-nowrap min-w-[95px]">
                    {item.title} <span className="text-[9px] text-neutral-400 font-normal">({item.unit})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs text-neutral-800 dark:text-neutral-200">
              {isLoading ? (
                // Skeletons
                Array.from({ length: 8 }).map((_, rIdx) => (
                  <tr key={rIdx} className="animate-pulse">
                    <td className="py-4 px-4 sticky left-0 bg-white border-r border-neutral-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div className="h-4 bg-neutral-200 rounded w-28 mx-auto" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-neutral-200 rounded w-20 mx-auto" />
                    </td>
                    {Array.from({ length: 10 }).map((_, cIdx) => (
                      <td key={cIdx} className="py-4 px-4">
                        <div className="h-4 bg-neutral-200 rounded w-16 mx-auto" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : readings.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={12} className="py-12 text-center text-sm font-semibold text-neutral-400">
                    No historical readings found for the selected filters.
                  </td>
                </tr>
              ) : (
                // Data Rows
                readings.map((reading) => (
                  <tr 
                    key={reading._id} 
                    onClick={() => setSelectedReading(reading)} 
                    className="hover:bg-neutral-50/50 transition-colors cursor-pointer"
                  >
                    {/* Timestamp stays sticky with shadow */}
                    <td className="py-3.5 px-4 sticky left-0 bg-white hover:bg-neutral-100 font-mono font-bold text-neutral-900 dark:text-neutral-600 border-r border-neutral-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-[180px] min-w-[180px] shrink-0 whitespace-nowrap">
                      {formatDisplayDate(reading.timestamp)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-neutral-600 min-w-[160px] shrink-0 whitespace-nowrap">
                      {reading.deviceId}
                    </td>
                    <td className="py-3.5 px-4 min-w-[95px]">{renderCell('AQI', reading.AQI)}</td>
                    <td className="py-3.5 px-4 min-w-[95px]">{renderCell('CO2', reading.CO2)}</td>
                    <td className="py-3.5 px-4 min-w-[95px]">{renderCell('Temperature', reading.Temperature)}</td>
                    <td className="py-3.5 px-4 min-w-[95px]">{renderCell('Humidity', reading.Humidity)}</td>
                    <td className="py-3.5 px-4 min-w-[95px]">{renderCell('VOC', reading.VOC)}</td>
                    <td className="py-3.5 px-4 min-w-[95px]">{renderCell('NOX', reading.NOX)}</td>
                    <td className="py-3.5 px-4 min-w-[95px]">{renderCell('PM1_0', reading.PM1_0)}</td>
                    <td className="py-3.5 px-4 min-w-[95px]">{renderCell('PM2_5', reading.PM2_5)}</td>
                    <td className="py-3.5 px-4 min-w-[95px]">{renderCell('PM4_0', reading.PM4_0)}</td>
                    <td className="py-3.5 px-4 min-w-[95px]">{renderCell('PM10', reading.PM10)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {readings.length > 0 && (
          <div className="p-4 bg-neutral-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            {/* Limit Selector */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium">Rows per page:</span>
              <select
                value={pagination.limit}
                onChange={e => {
                  setPagination(prev => ({
                    ...prev,
                    limit: parseInt(e.target.value, 10),
                    page: 1
                  }));
                }}
                className="px-2 py-1 bg-white border border-neutral-200 rounded-lg text-neutral-700 font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                {[25, 50, 100].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-4">
              <span className="text-neutral-500 font-semibold">
                Page <span className="text-neutral-800">{pagination.page}</span> of <span className="text-neutral-800">{pagination.totalPages || 1}</span>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1 || isLoading}
                  className="p-1.5 rounded-lg border border-neutral-200 hover:bg-white text-neutral-600 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                  className="p-1.5 rounded-lg border border-neutral-200 hover:bg-white text-neutral-600 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side Drawer for Granular Reading Details */}
      {selectedReading && (
        <>
          {/* Backdrop overlay */}
          <div 
            onClick={() => setSelectedReading(null)} 
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-50 transition-opacity duration-300"
          />

          {/* Sliding Drawer Container */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white dark:bg-neutral-900 shadow-2xl border-l border-neutral-200 dark:border-neutral-800 z-50 flex flex-col animate-slide-in duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  Reading Details
                </h3>
                <p className="text-xs text-neutral-500 mt-1">Detailed metric analysis for this recording.</p>
              </div>
              <button 
                onClick={() => setSelectedReading(null)}
                className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Metadata Box */}
              <div className="bg-neutral-50 dark:bg-neutral-800/40 rounded-xl p-4 border border-neutral-200/60 dark:border-neutral-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400 font-bold uppercase tracking-wider">Device ID</span>
                  <span className="text-neutral-800 dark:text-neutral-100 font-mono font-extrabold">{selectedReading.deviceId}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400 font-bold uppercase tracking-wider">Timestamp</span>
                  <span className="text-neutral-800 dark:text-neutral-100 font-mono font-bold">{formatDisplayDate(selectedReading.timestamp)}</span>
                </div>
                {selectedReading.receivedAt && (
                  <div className="flex justify-between items-center text-xs border-t border-neutral-200/40 dark:border-neutral-800/80 pt-2.5">
                    <span className="text-neutral-400 font-bold uppercase tracking-wider">Backend Ingest</span>
                    <span className="text-neutral-500 dark:text-neutral-400 font-mono text-[11px]">{formatDisplayDate(selectedReading.receivedAt)}</span>
                  </div>
                )}
                {(selectedReading.firmwareVersion || selectedReading.hardwareVersion) && (
                  <div className="flex justify-between items-center text-xs border-t border-neutral-200/40 dark:border-neutral-800/80 pt-2.5">
                    <span className="text-neutral-400 font-bold uppercase tracking-wider">Specs</span>
                    <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                      HW: {selectedReading.hardwareVersion || 'Unknown'} | FW: {selectedReading.firmwareVersion || 'Unknown'}
                    </span>
                  </div>
                )}
              </div>

              {/* Sensors List Header */}
              <div className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest border-b border-neutral-200 dark:border-neutral-800 pb-2">
                Sensor Snapshot
              </div>

              {/* Sensors List Grid */}
              <div className="space-y-4">
                {Object.entries(SENSOR_LABELS).map(([key, labelItem]) => {
                  const val = formatNumber(selectedReading[key]);
                  const statusObj = val !== null ? getSensorStatus(key, val) : { label: 'N/A', color: 'gray' };
                  const badgeStyle = getBadgeClasses(statusObj.color);

                  return (
                    <div key={key} className="border-b border-neutral-100 dark:border-neutral-800/40 pb-3 last:border-0 space-y-1">
                      <div className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
                        {labelItem.title}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-mono font-bold text-neutral-850 dark:text-neutral-100">
                          {val !== null ? `${val} ${labelItem.unit}` : '-'}
                        </span>
                        {val !== null && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                            <span>Status:</span>
                            <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase tracking-widest leading-none ${badgeStyle}`}>
                              {statusObj.label}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
