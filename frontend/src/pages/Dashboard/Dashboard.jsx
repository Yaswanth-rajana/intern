import React from 'react';
import { Gauge, Wind, Thermometer, Droplets, Cloud, Atom, Box, Boxes, Layers, Hexagon } from 'lucide-react';
import { motion } from 'framer-motion';
import { DeviceInfo } from '../../components/DeviceInfo/DeviceInfo';
import { MetricCard } from '../../components/MetricCard/MetricCard';
import { GaugeCard } from '../../components/GaugeCard/GaugeCard';
import { ChartsSection } from '../../components/Charts/ChartsSection';
import { AlarmPanel } from '../../components/AlarmPanel/AlarmPanel';
import { SystemStatus } from '../../components/DeviceOperations/SystemStatus';
import { DiagnosticsPanel } from '../../components/DiagnosticsPanel/DiagnosticsPanel';
import { MetricCardSkeleton } from '../../components/LoadingSkeleton/LoadingSkeleton';
import { getSensorStatus, SENSOR_CONFIG } from '../../utils/sensorStatusConfig';
import { useDashboardStore } from '../../store/dashboardStore';

export function Dashboard() {
  const uiState = useDashboardStore(state => state.ui.state);
  const sensors = useDashboardStore(state => state.sensors.latest);
  const isLoading = uiState === 'initialLoading';

  const metricsConfig = [
    { key: 'AQI', title: 'AQI', icon: 'https://static.vecteezy.com/system/resources/previews/029/896/071/non_2x/air-quality-index-educational-scheme-with-excessive-quantities-of-substances-or-gases-in-environment-stock-illustration-vector.jpg', value: sensors.AQI, unit: 'AQI' },
    { key: 'CO2', title: 'CO₂', icon: 'https://img.icons8.com/?size=100&id=vV31Gs-S8TM0&format=png&color=40C057', value: sensors.CO2, unit: 'ppm' },
    { key: 'VOC', title: 'VOC', icon: 'https://image.shutterstock.com/image-vector/voc-free-symbol-vector-design-260nw-2560355997.jpg', value: sensors.VOC, unit: 'ppb' },
    { key: 'PM1_0', title: 'PM 1.0', icon: Box, value: sensors.PM1_0, unit: 'µg/m³' },
    { key: 'PM2_5', title: 'PM 2.5', icon: Layers, value: sensors.PM2_5, unit: 'µg/m³' },
    { key: 'PM4_0', title: 'PM 4.0', icon: Boxes, value: sensors.PM4_0, unit: 'µg/m³' },
    { key: 'PM10', title: 'PM 10', icon: Hexagon, value: sensors.PM10, unit: 'µg/m³' },
    { key: 'NOX', title: 'NOx', icon: 'https://image.shutterstock.com/image-vector/nox-road-sign-on-white-260nw-1545439145.jpg', value: sensors.NOX, unit: 'ppb' },
    { key: 'Temperature', title: 'Temperature', icon: Thermometer, value: sensors.Temperature, unit: '°C' },
    { key: 'Humidity', title: 'Humidity', icon: Droplets, value: sensors.Humidity, unit: '%' },
  ];

  const gaugesConfig = [
    // Row 1
    { title: 'AQI', value: sensors.AQI, unit: SENSOR_CONFIG.AQI.unit, max: SENSOR_CONFIG.AQI.max },
    { title: 'CO2', value: sensors.CO2, unit: SENSOR_CONFIG.CO2.unit, max: SENSOR_CONFIG.CO2.max },
    { title: 'VOC', value: sensors.VOC, unit: SENSOR_CONFIG.VOC.unit, max: SENSOR_CONFIG.VOC.max },
    { title: 'PM 2.5', value: sensors.PM2_5, unit: SENSOR_CONFIG.PM2_5.unit, max: SENSOR_CONFIG.PM2_5.max },
    // Row 2
    { title: 'Temperature', value: sensors.Temperature, unit: SENSOR_CONFIG.Temperature.unit, max: SENSOR_CONFIG.Temperature.max },
    { title: 'Humidity', value: sensors.Humidity, unit: SENSOR_CONFIG.Humidity.unit, max: SENSOR_CONFIG.Humidity.max },
    { title: 'NOX', value: sensors.NOX || 20, unit: SENSOR_CONFIG.NOX.unit, max: SENSOR_CONFIG.NOX.max },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-12"
    >
      <DeviceInfo />
      
      {/* Metric Cards (Responsive Grid: 1 col Mobile, 3 cols Tablet, 5 cols Laptop & Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-[20px]">
        {isLoading 
          ? Array.from({ length: 10 }).map((_, i) => <MetricCardSkeleton key={i} />)
          : metricsConfig.map((metric, i) => (
              <motion.div 
                key={metric.key} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <MetricCard 
                  title={metric.title}
                  icon={metric.icon}
                  value={metric.value}
                  unit={metric.unit}
                  statusObj={getSensorStatus(metric.key, metric.value)}
                />
              </motion.div>
            ))
        }
      </div>

      {/* Gauge Cards - full width */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-[20px] mt-6">
        {gaugesConfig.map((gauge) => (
          <GaugeCard
            key={gauge.title}
            title={gauge.title}
            value={gauge.value}
            unit={gauge.unit}
            maxValue={gauge.max}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Chart - full width */}
      <ChartsSection />

      {/* Status + Alarms - below chart */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-[20px]">
        <SystemStatus />
        <AlarmPanel />
      </div>

      <DiagnosticsPanel className="mt-6" />
      
    </motion.div>
  );
}
