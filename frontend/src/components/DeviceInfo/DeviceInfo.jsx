import React, { useEffect, useState, useRef } from 'react';
import { ChevronDown, MapPin, HardDrive, Wifi, Cpu, Clock, Server } from 'lucide-react';
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

  const [status, setStatus] = useState('offline');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      const lastPacketTime = useDashboardStore.getState().device.lastPacketTime;
      const avgInterval = useDashboardStore.getState().stats.avgPacketInterval;
      const base = avgInterval > 0 ? avgInterval : 15000;
      if (!lastPacketTime) { setStatus('offline'); return; }
      const age = Date.now() - lastPacketTime;
      if (age < base * 2.5) setStatus('online');
      else if (age < base * 5) setStatus('warning');
      else setStatus('offline');
    };
    tick();
    const interval = setInterval(tick, 2000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading || !device.info.deviceId) {
    return (
      <div className="bg-white rounded-[16px] shadow-soft p-[24px] col-span-full flex flex-row items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  const lastUpdatedStr = device.lastPacketTime ? new Date(device.lastPacketTime).toLocaleTimeString() : '--:--:--';

  return (
    <div className="bg-white rounded-[16px] shadow-soft p-[20px] px-[24px] col-span-full flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
      
      <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 xl:gap-8 w-full xl:divide-x xl:divide-neutral-200">
        
        {/* Selected Device Dropdown */}
        <div className="flex flex-col gap-1 pr-6 w-full xl:w-auto shrink-0 relative" ref={dropdownRef}>
          <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Selected Device</span>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 hover:bg-neutral-50 px-2 py-1 -ml-2 rounded transition-colors group relative"
          >
            <span className="font-bold text-[15px] text-neutral-800 group-hover:text-primary transition-colors">
              {device.info.deviceId}
            </span>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-[280px] bg-white border border-neutral-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto py-2">
                {deviceList.map(d => (
                  <button
                    key={d.deviceId}
                    onClick={() => {
                      selectDevice(d.deviceId);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors ${d.deviceId === selectedDeviceId ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${
                          d.status === 'Online' ? 'bg-status-good shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 
                          d.status === 'Warning' ? 'bg-status-warning shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-danger'
                        }`}></span>
                        <span className={`font-semibold text-[14px] leading-none ${
                          d.deviceId === selectedDeviceId ? 'text-primary' : 'text-neutral-700'
                        }`}>
                          {d.deviceId}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-500 font-medium pl-[18px]">
                        {d.location || d.firmwareVersion}
                      </span>
                    </div>
                    <span className="text-[12px] font-semibold text-neutral-400 capitalize">
                      {d.status}
                    </span>
                  </button>
                ))}
                {deviceList.length === 0 && (
                  <div className="px-4 py-3 text-[13px] text-neutral-500 text-center">
                    No devices available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info Metrics — horizontally scrollable on mobile */}
        <div className="overflow-x-auto w-full xl:pl-8">
          <div className="flex gap-6 xl:gap-10 min-w-max xl:min-w-0 xl:grid xl:grid-cols-5">
          
          <div className="flex items-center gap-3">
            <MapPin className="w-[22px] h-[22px] text-neutral-400" />
            <div className="flex flex-col">
              <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Location</span>
              <span className="font-semibold text-[13px] text-neutral-700 truncate">{device.info.location || 'Unknown'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="w-[22px] h-[22px] text-neutral-400" />
            <div className="flex flex-col">
              <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Last Update</span>
              <span className="font-semibold text-[13px] text-neutral-700 tabular-nums truncate">{lastUpdatedStr}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Wifi className="w-[22px] h-[22px] text-neutral-400" />
            <div className="flex flex-col">
              <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Status</span>
              <StatusBadge status={status} className="mt-0.5" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Cpu className="w-[22px] h-[22px] text-neutral-400" />
            <div className="flex flex-col">
              <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Firmware</span>
              <span className="font-semibold text-[13px] text-neutral-700 truncate">{device.info.firmwareVersion || 'Unknown'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <HardDrive className="w-[22px] h-[22px] text-neutral-400" />
            <div className="flex flex-col">
              <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Packets</span>
              <span className="font-semibold text-[13px] text-neutral-700 truncate">{device.totalPackets.toLocaleString()}</span>
            </div>
          </div>

          </div>
        </div>
      </div>

      <button
        onClick={() => setActiveTab('Devices')}
        className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-50 text-neutral-700 font-bold text-[13px] rounded-xl transition-all border border-neutral-200 shadow-sm hover:shadow whitespace-nowrap"
      >
        <Server className="w-[18px] h-[18px]" />
        View Devices
      </button>

    </div>
  );
}
