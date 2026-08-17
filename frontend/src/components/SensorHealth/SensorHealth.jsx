import React, { useEffect, useState } from 'react';
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
  const sensors = useDashboardStore(state => state.sensors.latest);
  const [sensorHealth, setSensorHealth] = useState('Offline');

  useEffect(() => {
    const tick = () => {
      const lastPacketTime = useDashboardStore.getState().device.lastPacketTime;
      if (!lastPacketTime) {
        setSensorHealth('Offline');
        return;
      }
      const { avgPacketInterval } = useDashboardStore.getState().stats;
      const baseInterval = avgPacketInterval > 0 ? avgPacketInterval : 15000;
      setSensorHealth((Date.now() - lastPacketTime) < baseInterval * 3 ? 'Online' : 'Offline');
    };

    tick();
    const interval = setInterval(tick, 2000);
    return () => clearInterval(interval);
  }, []);

  const isOnline = sensorHealth === 'Online';

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
    <div className={cn("bg-white rounded-[16px] shadow-soft p-[24px] h-full flex flex-col justify-between", className)}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Heart className="w-5 h-5 text-neutral-800" />
          <h2 className="text-[16px] font-bold text-neutral-800">Sensor Health</h2>
        </div>
        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
          Hardware Status
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
        {sensorGroups.map((group, idx) => {
          const online = group.status === 'ONLINE';
          return (
            <div
              key={idx}
              className="flex flex-col justify-between p-3 rounded-xl border border-neutral-100 bg-neutral-50/70 hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-bold text-neutral-700">{group.label}</span>
                <span
                  className={cn(
                    "text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                    online
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                      : "bg-rose-50 text-rose-700 border-rose-200/80"
                  )}
                >
                  {group.status}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                {online ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                )}
                <span className="truncate">{group.metric}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
