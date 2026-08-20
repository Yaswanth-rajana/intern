import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileSpreadsheet, 
  Calendar, 
  Building2, 
  Server, 
  Download, 
  RefreshCw, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  Layers,
  Clock,
  Search,
  Filter,
  AlertCircle,
  Globe
} from 'lucide-react';
import { 
  fetchDeviceActivityReport, 
  downloadDeviceActivityReport, 
  fetchTenants, 
  fetchDevices 
} from '../../services/api';
import { cn } from '../../utils/cn';

// Utility to get today's date formatted as YYYY-MM-DD in Asia/Kolkata (IST)
const getTodayDateStringInTimeZone = (timeZone = 'Asia/Kolkata') => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const map = {};
  parts.forEach(p => { map[p.type] = p.value; });
  return `${map.year}-${map.month}-${map.day}`;
};

// Formatter to convert YYYY-MM-DD to "20 Aug 2026"
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(n => parseInt(n, 10));
  if (!year || !month || !day) return dateStr;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

// Formatter for duration
const formatDurationDisplay = (totalSec) => {
  if (totalSec === undefined || totalSec === null || isNaN(totalSec)) return '0s';
  const secs = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

// Generate list of recent dates for the Daily Reports history section
const getRecentDatesList = (count = 7, timeZone = 'Asia/Kolkata') => {
  const dates = [];
  const today = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(d);
    const map = {};
    parts.forEach(p => { map[p.type] = p.value; });
    dates.push(`${map.year}-${map.month}-${map.day}`);
  }
  return dates;
};

export function DeviceActivityReports() {
  const todayStr = useMemo(() => getTodayDateStringInTimeZone('Asia/Kolkata'), []);

  // Filter States
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedTenantId, setSelectedTenantId] = useState('All');
  const [selectedDeviceId, setSelectedDeviceId] = useState('All');

  // Metadata Dropdown States
  const [tenantsList, setTenantsList] = useState([]);
  const [allDevicesList, setAllDevicesList] = useState([]);

  // Report Data States
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [historyExportingDate, setHistoryExportingDate] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const recentDates = useMemo(() => getRecentDatesList(7, 'Asia/Kolkata'), []);

  // Load dropdown options (tenants and devices)
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [tenRes, devRes] = await Promise.all([
          fetchTenants(),
          fetchDevices()
        ]);
        setTenantsList(tenRes?.tenants || []);
        setAllDevicesList(devRes || []);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    loadDropdownData();
  }, []);

  // Devices available in dropdown based on selected tenant filter
  const filteredDeviceOptions = useMemo(() => {
    if (selectedTenantId === 'All') {
      return allDevicesList;
    }
    return allDevicesList.filter(d => d.tenantId && String(d.tenantId) === String(selectedTenantId));
  }, [allDevicesList, selectedTenantId]);

  // Handle tenant change: update tenant & reset device if no longer valid
  const handleTenantChange = (newTenantId) => {
    setSelectedTenantId(newTenantId);
    if (newTenantId !== 'All') {
      const validForTenant = allDevicesList.some(
        d => d.deviceId === selectedDeviceId && String(d.tenantId) === String(newTenantId)
      );
      if (!validForTenant) {
        setSelectedDeviceId('All');
      }
    }
  };

  // Fetch Report Data
  const loadReport = useCallback(async (isRefresh = false) => {
    if (isRefresh) setFetching(true);
    else setLoading(true);
    setErrorMsg('');

    try {
      const params = { date: selectedDate };
      if (selectedTenantId !== 'All') params.tenantId = selectedTenantId;
      if (selectedDeviceId !== 'All') params.deviceId = selectedDeviceId;

      const data = await fetchDeviceActivityReport(params);
      setReportData(data);
    } catch (err) {
      console.error('Failed to load device activity report:', err);
      setErrorMsg(err.response?.data?.error || 'Unable to load device activity report.');
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [selectedDate, selectedTenantId, selectedDeviceId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedDate(todayStr);
    setSelectedTenantId('All');
    setSelectedDeviceId('All');
  };

  // Download Daily Report CSV for current view
  const handleDownloadReport = async (targetDate = selectedDate) => {
    const isHistory = targetDate !== selectedDate;
    if (isHistory) setHistoryExportingDate(targetDate);
    else setExporting(true);

    try {
      const params = { date: targetDate };
      if (!isHistory) {
        if (selectedTenantId !== 'All') params.tenantId = selectedTenantId;
        if (selectedDeviceId !== 'All') params.deviceId = selectedDeviceId;
      }

      const blob = await downloadDeviceActivityReport(params);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `device-activity-report-${targetDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download report:', err);
      alert('Unable to generate the report CSV. Please try again.');
    } finally {
      if (isHistory) setHistoryExportingDate(null);
      else setExporting(false);
    }
  };

  // Flatten period records across all devices for table rendering
  const tableRows = useMemo(() => {
    if (!reportData?.devices) return [];
    const rows = [];

    reportData.devices.forEach(dev => {
      (dev.periods || []).forEach((period, idx) => {
        rows.push({
          rowId: `${dev.deviceId}_${idx}`,
          date: reportData.date,
          tenantName: dev.tenantName || 'Unassigned',
          deviceId: dev.deviceId,
          deviceName: dev.deviceName || dev.deviceId,
          status: period.status,
          startTimeDisplay: period.startTimeDisplay || '-',
          endTimeDisplay: period.endTimeDisplay || '-',
          durationSeconds: period.durationSeconds,
          readingCount: period.readingCount,
          firstReadingDisplay: period.firstReadingDisplay || '-',
          lastReadingDisplay: period.lastReadingDisplay || '-',
        });
      });
    });

    return rows;
  }, [reportData]);

  const summary = reportData?.summary || {
    totalDevices: 0,
    activeDevices: 0,
    inactiveDevices: 0,
    totalReadings: 0,
    activePeriods: 0,
  };

  const displayTimeZone = reportData?.timeZone || 'Asia/Kolkata';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                Device Activity Reports
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600">
                <Globe className="w-3 h-3 text-primary" />
                Timezone: {displayTimeZone} (IST)
              </span>
            </div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
              Track daily device telemetry activity and download verification reports.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadReport(true)}
            disabled={fetching || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200 rounded-xl font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={cn("w-4 h-4", fetching && "animate-spin")} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => handleDownloadReport(selectedDate)}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold text-xs shadow-md shadow-primary/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Generating CSV...' : 'Download Daily Report'}</span>
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-neutral-800 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span>Report Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* DATE */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <Calendar className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* TENANT */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Tenant
            </label>
            <div className="relative">
              <select
                value={selectedTenantId}
                onChange={(e) => handleTenantChange(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
              >
                <option value="All">All Tenants</option>
                {tenantsList.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <Building2 className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* DEVICE */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Device
            </label>
            <div className="relative">
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
              >
                <option value="All">All Devices</option>
                {filteredDeviceOptions.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.name ? `${d.name} (${d.deviceId})` : d.deviceId}
                  </option>
                ))}
              </select>
              <Server className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Filter Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-700/50">
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={() => loadReport()}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-white text-white dark:text-neutral-900 rounded-xl font-semibold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>View Report</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* TOTAL DEVICES */}
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Devices</span>
            <Server className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">
            {loading ? '-' : summary.totalDevices}
          </span>
        </div>

        {/* ACTIVE DEVICES */}
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Active Devices</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {loading ? '-' : summary.activeDevices}
          </span>
        </div>

        {/* INACTIVE DEVICES */}
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Inactive Devices</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
            {loading ? '-' : summary.inactiveDevices}
          </span>
        </div>

        {/* TOTAL READINGS */}
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Readings</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">
            {loading ? '-' : summary.totalReadings.toLocaleString()}
          </span>
        </div>

        {/* ACTIVE PERIODS */}
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Active Periods</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <span className="text-2xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
            {loading ? '-' : summary.activePeriods}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-700/80 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              Daily Device Activity Timeline
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Showing active and inactive periods for {formatDateDisplay(selectedDate)} in {displayTimeZone} (IST)
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-lg">
            {tableRows.length} interval records
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <span className="text-xs font-semibold text-neutral-400">Calculating activity timeline...</span>
          </div>
        ) : tableRows.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            No telemetry activity found for the selected date and filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 uppercase font-extrabold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Tenant</th>
                  <th className="py-3.5 px-4">Device</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Start Time (IST)</th>
                  <th className="py-3.5 px-4">End Time (IST)</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4 text-right">Readings</th>
                  <th className="py-3.5 px-4">First Reading (IST)</th>
                  <th className="py-3.5 px-4">Last Reading (IST)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
                {tableRows.map((row) => (
                  <tr 
                    key={row.rowId}
                    className="hover:bg-neutral-50/80 dark:hover:bg-neutral-700/30 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      {formatDateDisplay(row.date)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                      {row.tenantName}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-900 dark:text-white">{row.deviceName}</span>
                        <span className="text-[10px] font-mono text-neutral-400">{row.deviceId}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {row.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                          INACTIVE
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                      {row.startTimeDisplay}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                      {row.endTimeDisplay}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                      {formatDurationDisplay(row.durationSeconds)}
                    </td>
                    <td className="py-3.5 px-4 font-bold tabular-nums text-right text-neutral-900 dark:text-white whitespace-nowrap">
                      {row.readingCount}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                      {row.firstReadingDisplay}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                      {row.lastReadingDisplay}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Daily Reports History Section */}
      <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Previous Daily Reports
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Download complete daily activity report CSVs for previous dates.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {recentDates.map((histDate) => {
            const isCurrentExporting = historyExportingDate === histDate;
            return (
              <div 
                key={histDate}
                className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60 flex items-center justify-between gap-3"
              >
                <div>
                  <span className="block text-xs font-bold text-neutral-900 dark:text-white">
                    {formatDateDisplay(histDate)}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium">Daily Report CSV</span>
                </div>

                <button
                  onClick={() => handleDownloadReport(histDate)}
                  disabled={isCurrentExporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-bold text-[11px] transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Download className={cn("w-3.5 h-3.5", isCurrentExporting && "animate-spin")} />
                  <span>{isCurrentExporting ? 'CSV...' : 'Download CSV'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DeviceActivityReports;
