import React from 'react';
import { Thermometer, Droplets, Box, Boxes, Layers, Hexagon } from 'lucide-react';
import { motion } from 'framer-motion';
import { DeviceInfo } from '../../components/DeviceInfo/DeviceInfo';
import { MetricCard } from '../../components/MetricCard/MetricCard';
import { ChartsSection } from '../../components/Charts/ChartsSection';
import { AlarmPanel } from '../../components/AlarmPanel/AlarmPanel';
import { SensorHealth } from '../../components/SensorHealth/SensorHealth';
import { MetricCardSkeleton } from '../../components/LoadingSkeleton/LoadingSkeleton';
import { getSensorStatus } from '../../utils/sensorStatusConfig';
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

      {/* Chart - full width */}
      <ChartsSection />

      {/* Sensor Health + Active Alarms - side-by-side on desktop */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-[20px]">
        <SensorHealth />
        <AlarmPanel />
      </div>
      
    </motion.div>
  );
}
