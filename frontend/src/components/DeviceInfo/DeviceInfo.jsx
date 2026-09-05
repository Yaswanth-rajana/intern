import React, { useEffect, useState, useRef } from 'react';
import { ChevronDown, MapPin, Wifi, Cpu, Clock, Server } from 'lucide-react';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import { Skeleton } from '../LoadingSkeleton/LoadingSkeleton';
import { useDashboardStore } from '../../store/dashboardStore';

export function DeviceInfo() {
  const uiState = useDashboardStore(state => state.ui.state);
  const device = useDashboardStore(state => state.device);
  const deviceList = useDashboardStore(state => state.deviceList);
  const selectedDeviceId = useDashboardStore(state => state.selectedDeviceId);
  const selectDevice = useDashboardStore(state => state.selectDevice);
  
  const isLoading = uiState === 'initialLoading';
  const setActiveTab = useDashboardStore(state => state.setActiveTab);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="card-level-1 p-5 col-span-full flex flex-row items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  if (deviceList.length === 0 || !device.info.deviceId) {
    return (
      <div className="card-level-1 p-5 px-6 col-span-full flex flex-col sm:flex-row items-center justify-between gap-4 border-amber-200/90 bg-amber-50/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-slate-800">No Devices Assigned</h4>
            <p className="text-xs font-medium text-slate-500">Your account does not have access to any devices yet. Please ask your administrator to assign devices.</p>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('Devices')}
          className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-200 shadow-2xs whitespace-nowrap cursor-pointer"
        >
          <Server className="w-3.5 h-3.5" />
          View Devices Directory
        </button>
      </div>
    );
  }

  const selectedDeviceObj = deviceList.find(d => d.deviceId === selectedDeviceId) || device.info || {};
  const rawStatusStr = selectedDeviceObj.status || device.info.status;
  const currentStatus = rawStatusStr ? String(rawStatusStr).toUpperCase() : 'UNKNOWN';

  const formatLastUpdate = (timeMs) => {
    if (!timeMs) return 'Waiting for telemetry';
    const date = new Date(timeMs);
    if (isNaN(date.getTime())) return 'Waiting for telemetry';
    
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 0 || diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };


  const lastPacketTime = device.lastPacketTime || (selectedDeviceObj.lastTelemetryAt ? new Date(selectedDeviceObj.lastTelemetryAt).getTime() : (selectedDeviceObj.lastSeenAt ? new Date(selectedDeviceObj.lastSeenAt).getTime() : null));
  const lastUpdatedStr = formatLastUpdate(lastPacketTime);

  return (
    <div className="card-level-1 p-4 sm:p-5 px-5 sm:px-6 col-span-full flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
      
      <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 xl:gap-6 w-full">
        
        {/* Selected Device Dropdown */}
        <div className="flex flex-col gap-1 pr-4 xl:pr-6 w-full xl:w-auto shrink-0 relative border-b xl:border-b-0 xl:border-r border-slate-200/80 pb-3 xl:pb-0" ref={dropdownRef}>
          <span className="micro-label">Selected Device</span>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 hover:bg-slate-100/70 px-2 py-1 -ml-2 rounded-lg transition-colors group relative cursor-pointer"
          >
            <span className="font-extrabold text-[15px] text-slate-800 group-hover:text-blue-600 transition-colors">
              {device.info.deviceId}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-[280px] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto py-1.5">
                {deviceList.map(d => {
                  const dStatus = (d.status || 'UNKNOWN').toUpperCase();
                  return (
                    <button
                      key={d.deviceId}
                      onClick={() => {
                        selectDevice(d.deviceId);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors ${d.deviceId === selectedDeviceId ? 'bg-blue-50/50 font-bold' : ''}`}
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            dStatus === 'ONLINE' ? 'bg-emerald-500 shadow-xs' : 
                            dStatus === 'OFFLINE' ? 'bg-rose-500 shadow-xs' : 'bg-slate-400'
                          }`} />
                          <span className={`font-extrabold text-[13px] leading-none ${
                            d.deviceId === selectedDeviceId ? 'text-blue-600' : 'text-slate-700'
                          }`}>
                            {d.deviceId}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium pl-4">
                          {d.location || d.firmwareVersion || 'No location set'}
                        </span>
                      </div>
                      <StatusBadge status={dStatus} className="text-[9px] px-2 py-0.2" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Info Metrics — 4 items: Location, Last Telemetry, Status, Firmware */}
        <div className="overflow-x-auto w-full">
          <div className="flex gap-4 xl:gap-0 min-w-max xl:min-w-0 xl:grid xl:grid-cols-4 xl:divide-x xl:divide-slate-200/80">
          
            <div className="flex items-center gap-3 xl:px-4">
              <MapPin className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              <div className="flex flex-col">
                <span className="micro-label">Location</span>
                <span className="font-bold text-[13px] text-slate-800 truncate">{device.info.location || 'Unassigned'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 xl:px-4">
              <Clock className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              <div className="flex flex-col">
                <span className="micro-label">Last Telemetry</span>
                <span className="font-bold text-[13px] text-slate-800 tabular-nums truncate">{lastUpdatedStr}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 xl:px-4">
              <Wifi className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              <div className="flex flex-col">
                <span className="micro-label">Status</span>
                <StatusBadge status={currentStatus} className="mt-0.5" />
              </div>
            </div>

            <div className="flex items-center gap-3 xl:px-4">
              <Cpu className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              <div className="flex flex-col">
                <span className="micro-label">Firmware</span>
                <span className="font-bold text-[13px] text-slate-800 truncate">{device.info.firmwareVersion || 'v1.4.2-prod'}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Enterprise Action Button */}
      <div className="flex items-center gap-2.5 shrink-0 pt-2 xl:pt-0 w-full xl:w-auto justify-end border-t xl:border-t-0 border-slate-200/80">
        <button
          onClick={() => setActiveTab('Devices')}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-xs rounded-xl transition-all border border-slate-200/90 shadow-2xs hover:shadow-xs whitespace-nowrap cursor-pointer"
        >
          <Server className="w-3.5 h-3.5 text-blue-600" />
          <span>View Devices</span>
        </button>
      </div>

    </div>
  );
}


