import React from 'react';
import { Heart, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDashboardStore } from '../../store/dashboardStore';

const formatSensorVal = (val) => {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') {
    return Number.isInteger(val) ? val : Number(val.toFixed(1));
  }
  return val;
};

export function SensorHealth({ className }) {
  const device = useDashboardStore(state => state.device);
  const deviceList = useDashboardStore(state => state.deviceList);
  const selectedDeviceId = useDashboardStore(state => state.selectedDeviceId);
  const sensors = useDashboardStore(state => state.sensors.latest);

  const selectedDeviceObj = deviceList.find(d => d.deviceId === selectedDeviceId) || device.info || {};
  const currentDevStatus = (selectedDeviceObj.status || device.info.status || 'ONLINE').toUpperCase();
  const isOnline = currentDevStatus === 'ONLINE' || currentDevStatus === 'WARNING';

  const aqiVal = formatSensorVal(sensors.AQI);
  const co2Val = formatSensorVal(sensors.CO2);
  const vocVal = formatSensorVal(sensors.VOC);
  const pmVal  = formatSensorVal(sensors.PM2_5 ?? sensors.PM10);

  const sensorGroups = [
    {
      label: 'AQI Sensor',
      key: 'AQI',
      status: isOnline && aqiVal !== null ? 'ONLINE' : isOnline ? 'ONLINE' : 'OFFLINE',
      metric: aqiVal !== null ? `${aqiVal} AQI` : 'Waiting for telemetry',
    },
    {
      label: 'CO₂ Sensor',
      key: 'CO2',
      status: isOnline && co2Val !== null ? 'ONLINE' : isOnline ? 'ONLINE' : 'OFFLINE',
      metric: co2Val !== null ? `${co2Val} ppm` : 'Waiting for telemetry',
    },
    {
      label: 'VOC Sensor',
      key: 'VOC',
      status: isOnline && vocVal !== null ? 'ONLINE' : isOnline ? 'ONLINE' : 'OFFLINE',
      metric: vocVal !== null ? `${vocVal} ppb` : 'Waiting for telemetry',
    },
    {
      label: 'PM Sensor',
      key: 'PM',
      status: isOnline && pmVal !== null ? 'ONLINE' : isOnline ? 'ONLINE' : 'OFFLINE',
      metric: pmVal !== null ? `${pmVal} µg/m³ (PM 2.5)` : 'Waiting for telemetry',
    },
  ];

  return (
    <div className={cn("card-level-1 p-5 sm:p-6", className)}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
            <Heart className="w-4.5 h-4.5 text-blue-600" />
          </div>
          <h2 className="text-[16px] font-extrabold text-slate-800">Sensor Diagnostic Health</h2>
        </div>
        <span className="micro-label">
          Hardware Channels
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {sensorGroups.map((group) => {
          const isGroupOnline = group.status === 'ONLINE';
          return (
            <div 
              key={group.key}
              className="p-4 rounded-xl border border-slate-200/70 bg-white shadow-2xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="micro-label">
                  {group.label}
                </span>
                {isGroupOnline ? (
                  <span className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Normal
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                    <AlertCircle className="w-3 h-3 text-rose-600" /> Offline
                  </span>
                )}
              </div>
              
              <div className="text-[14px] font-extrabold text-slate-800 tracking-tight font-tabular-nums">
                {group.metric}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

