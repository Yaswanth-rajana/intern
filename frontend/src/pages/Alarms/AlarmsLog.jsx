import React, { useState, useMemo } from 'react';
import {
  BellRing, AlertOctagon, AlertTriangle, CheckCircle2,
  Filter, Search, X, ChevronDown, ShieldCheck
} from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';

const SENSOR_LABELS = {
  AQI: 'AQI',
  CO2: 'Carbon Dioxide (CO₂)',
  VOC: 'VOC',
  Temperature: 'Temperature',
  Humidity: 'Humidity',
  PM1_0: 'PM 1.0',
  PM2_5: 'PM 2.5',
  PM4_0: 'PM 4.0',
  PM10: 'PM 10',
  NOX: 'NOX',
};

function SeverityBadge({ severity }) {
  if (severity === 'Critical') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-rose-600 text-white shadow-sm shadow-rose-600/20">
        <AlertOctagon className="w-3 h-3" />
        Critical
      </span>
    );
  }
  if (severity === 'Warning') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-300">
        <AlertTriangle className="w-3 h-3" />
        Warning
      </span>
    );
  }
  // Resolved / Info
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="w-3 h-3" />
      Resolved
    </span>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all ${
        active
          ? 'bg-primary text-white shadow-sm shadow-primary/20'
          : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-400'
      }`}
    >
      {label}
    </button>
  );
}

export function AlarmsLog() {
  const alarmLog     = useDashboardStore(state => state.alarms.alarmLog);
  const resolveAlarm = useDashboardStore(state => state.resolveAlarm);

  const [searchText,         setSearchText]         = useState('');
  const [selectedSeverity,   setSelectedSeverity]   = useState('All');
  const [selectedSensor,     setSelectedSensor]     = useState('All');
  const [sensorDropdownOpen, setSensorDropdownOpen] = useState(false);

  // Severity counts
  const criticalCount = alarmLog.filter(a => a.severity === 'Critical').length;
  const warningCount  = alarmLog.filter(a => a.severity === 'Warning').length;
  const resolvedCount = alarmLog.filter(a => a.status === 'Resolved' || a.severity === 'Info').length;

  // Unique sensors in log
  const sensorsInLog = useMemo(() => {
    const seen = new Set(alarmLog.map(a => a.sensor).filter(Boolean));
    return Array.from(seen).sort();
  }, [alarmLog]);

  // Filtered log
  const filtered = useMemo(() => {
    return alarmLog.filter(alarm => {
      if (selectedSeverity === 'Critical' && alarm.severity !== 'Critical')           return false;
      if (selectedSeverity === 'Warning'  && alarm.severity !== 'Warning')            return false;
      if (selectedSeverity === 'Resolved' && alarm.status !== 'Resolved' && alarm.severity !== 'Info') return false;
      if (selectedSensor !== 'All'        && alarm.sensor !== selectedSensor)         return false;
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        if (!alarm.message?.toLowerCase().includes(q) && !alarm.sensor?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [alarmLog, selectedSeverity, selectedSensor, searchText]);

  const clearFilters = () => {
    setSearchText('');
    setSelectedSeverity('All');
    setSelectedSensor('All');
  };

  const hasFilters = searchText || selectedSeverity !== 'All' || selectedSensor !== 'All';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 flex items-center gap-3">
            <BellRing className="w-7 h-7 text-primary" />
            Alerts Log
          </h1>
          <p className="text-sm text-neutral-500 mt-1 font-medium">
            Complete history of all sensor alerts — filter by severity or sensor parameter.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[12px] font-bold text-neutral-500 bg-white border border-neutral-200 rounded-xl px-4 py-2 shadow-sm">
          <span className="text-rose-600">{criticalCount} Critical</span>
          <span className="text-neutral-300">|</span>
          <span className="text-amber-600">{warningCount} Warning</span>
          <span className="text-neutral-300">|</span>
          <span className="text-emerald-600">{resolvedCount} Resolved</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search by message or sensor..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-neutral-50"
            />
          </div>

          {/* Sensor dropdown */}
          <div className="relative">
            <button
              onClick={() => setSensorDropdownOpen(o => !o)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-600 bg-neutral-50 hover:border-neutral-300 hover:bg-white transition-all min-w-[160px] justify-between"
            >
              <span className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-neutral-400" />
                {selectedSensor === 'All' ? 'All Sensors' : (SENSOR_LABELS[selectedSensor] || selectedSensor)}
              </span>
              <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${sensorDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {sensorDropdownOpen && (
              <div className="absolute top-full mt-1.5 left-0 bg-white rounded-xl border border-neutral-200 shadow-lg z-20 py-1 min-w-[200px]">
                {['All', ...sensorsInLog].map(s => (
                  <button
                    key={s}
                    onClick={() => { setSelectedSensor(s); setSensorDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-[13px] font-semibold hover:bg-neutral-50 transition-colors ${
                      selectedSensor === s ? 'text-primary bg-primary/5' : 'text-neutral-700'
                    }`}
                  >
                    {s === 'All' ? 'All Sensors' : (SENSOR_LABELS[s] || s)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-all"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

        {/* Severity chips */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mr-1">Severity:</span>
          {[
            { key: 'All',      label: `All (${alarmLog.length})` },
            { key: 'Critical', label: `Critical (${criticalCount})` },
            { key: 'Warning',  label: `Warning (${warningCount})` },
            { key: 'Resolved', label: `Resolved (${resolvedCount})` },
          ].map(({ key, label }) => (
            <FilterChip
              key={key}
              label={label}
              active={selectedSeverity === key}
              onClick={() => setSelectedSeverity(key)}
            />
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <span className="text-[13px] font-bold text-neutral-600">
            {filtered.length} {filtered.length === 1 ? 'alert' : 'alerts'} found
          </span>
          {filtered.length !== alarmLog.length && (
            <span className="text-[11px] text-neutral-400 font-semibold">
              Filtered from {alarmLog.length} total
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <BellRing className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
            <p className="text-neutral-500 font-bold text-sm">No alerts match your filters.</p>
            <button onClick={clearFilters} className="mt-2 text-primary text-[13px] font-bold hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filtered.map((alarm, idx) => {
              const isCritical = alarm.severity === 'Critical';
              const isWarning  = alarm.severity === 'Warning';
              const isResolved = alarm.status === 'Resolved' || alarm.severity === 'Info';
              const isActive   = !isResolved;

              return (
                <div
                  key={alarm.id || idx}
                  className={`flex items-start gap-4 px-6 py-4 transition-colors border-l-[3px] ${
                    isResolved
                      ? 'bg-neutral-50/30 hover:bg-neutral-50/60 border-l-emerald-400 opacity-70'
                      : isCritical
                        ? 'bg-rose-50/20 hover:bg-rose-50/40 border-l-rose-600'
                        : 'bg-amber-50/10 hover:bg-amber-50/30 border-l-amber-500'
                  }`}
                >
                  {/* Icon */}
                  <div className="shrink-0 mt-1">
                    {isResolved ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : isCritical ? (
                      <div className="relative">
                        <span className="animate-ping absolute inline-flex h-5 w-5 rounded-full bg-rose-400 opacity-60" />
                        <AlertOctagon className="w-5 h-5 text-rose-600 relative z-10" />
                      </div>
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    )}
                  </div>

                  {/* Message */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-bold leading-snug ${
                      isResolved ? 'text-neutral-400 line-through' : isCritical ? 'text-rose-900' : 'text-neutral-800'
                    }`}>
                      {alarm.message}
                    </p>
                    <p className="text-[12px] text-neutral-400 font-medium mt-0.5">
                      {alarm.threshold}
                      {isResolved && alarm.resolvedAt && (
                        <span className="ml-2 text-emerald-500 font-semibold">· Resolved at {alarm.resolvedAt}</span>
                      )}
                    </p>
                  </div>

                  {/* Right side: badge + sensor + resolve btn */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <SeverityBadge severity={isResolved ? 'Resolved' : alarm.severity} />
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      isCritical && !isResolved ? 'bg-rose-100 text-rose-700' :
                      isWarning  && !isResolved ? 'bg-amber-100 text-amber-700' :
                                                  'bg-neutral-100 text-neutral-500'
                    }`}>
                      {SENSOR_LABELS[alarm.sensor] || alarm.sensor}
                    </span>

                    {/* Manual Resolve button — on all active alarms */}
                    {isActive && (
                      <button
                        onClick={() => resolveAlarm(alarm.id)}
                        className="mt-1 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-neutral-500 bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-700 border border-neutral-200 hover:border-emerald-300 transition-all"
                        title="Mark as Resolved"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Resolve
                      </button>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="shrink-0 text-right">
                    <p className="text-[12px] font-semibold text-neutral-400 tabular-nums">{alarm.timestamp}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-neutral-50 rounded-xl border border-neutral-200 px-5 py-3.5 flex items-center gap-6 flex-wrap text-[12px] text-neutral-500 font-semibold">
        <span className="font-bold text-neutral-600">How alerts resolve:</span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span><strong>Auto</strong> — sensor value returns to normal range</span>
        </span>
        <span className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span><strong>Manual</strong> — click the Resolve button to acknowledge</span>
        </span>
      </div>
    </div>
  );
}
