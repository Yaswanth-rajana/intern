import React from 'react';
import { Thermometer, Droplets, Box, Boxes, Layers, Hexagon, Wind, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { DeviceInfo } from '../../components/DeviceInfo/DeviceInfo';
import { AqiCard } from '../../components/MetricCard/AqiCard';
import { MetricCard } from '../../components/MetricCard/MetricCard';
import { ChartsSection } from '../../components/Charts/ChartsSection';
import { AlarmPanel } from '../../components/AlarmPanel/AlarmPanel';
import { SensorHealth } from '../../components/SensorHealth/SensorHealth';
import { MetricCardSkeleton, AqiCardSkeleton } from '../../components/LoadingSkeleton/LoadingSkeleton';
import { getSensorStatus } from '../../utils/sensorStatusConfig';
import { useDashboardStore } from '../../store/dashboardStore';


export function Dashboard() {
  const uiState = useDashboardStore(state => state.ui.state);
  const sensors = useDashboardStore(state => state.sensors.latest);
  const history = useDashboardStore(state => state.history);
  const isLoading = uiState === 'initialLoading';

  // Extract last 15-20 historical points for mini sparkline rendering per metric key
  const getSparklineData = (metricKey) => {
    if (!Array.isArray(history) || history.length === 0) return [];
    return history
      .slice(-20)
      .map(item => item[metricKey])
      .filter(val => val !== null && val !== undefined && !isNaN(val));
  };

  // 2-column x 2-row grid next to AQI card
  const topGridMetrics = [
    { key: 'CO2', title: 'CO₂', icon: Wind, value: sensors.CO2, unit: 'ppm' },
    { key: 'VOC', title: 'VOC', icon: Flame, value: sensors.VOC, unit: 'ppb' },
    { key: 'Temperature', title: 'Temperature', icon: Thermometer, value: sensors.Temperature, unit: '°C' },
    { key: 'Humidity', title: 'Humidity', icon: Droplets, value: sensors.Humidity, unit: '%' },
  ];

  // Horizontal 4-card row below top section: PM 1.0, PM 2.5, PM 4.0, PM 10
  const bottomRowMetrics = [
    { key: 'PM1_0', title: 'PM 1.0', icon: Box, value: sensors.PM1_0, unit: 'µg/m³' },
    { key: 'PM2_5', title: 'PM 2.5', icon: Layers, value: sensors.PM2_5, unit: 'µg/m³' },
    { key: 'PM4_0', title: 'PM 4.0', icon: Boxes, value: sensors.PM4_0, unit: 'µg/m³' },
    { key: 'PM10', title: 'PM 10', icon: Hexagon, value: sensors.PM10, unit: 'µg/m³' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-12"
    >
      <DeviceInfo />
      
      {/* Metric Cards Main Container */}
      <div className="space-y-4 md:space-y-5">
        {/* Top Section: Left AQI Card + Right 2x2 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5 items-stretch">
          {/* Left AQI Card */}
          <div className="lg:col-span-5 xl:col-span-5 flex flex-col">
            {isLoading ? (
              <AqiCardSkeleton />
            ) : (
              <motion.div 
                className="h-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <AqiCard 
                  value={sensors.AQI}
                  statusObj={getSensorStatus('AQI', sensors.AQI)}
                />
              </motion.div>
            )}
          </div>

          {/* Right 2-column x 2-row Grid: CO2, VOC, Temp, Humidity */}
          <div className="lg:col-span-7 xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {isLoading 
              ? Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
              : topGridMetrics.map((metric, i) => (
                  <motion.div 
                    key={metric.key} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                  >
                    <MetricCard 
                      title={metric.title}
                      icon={metric.icon}
                      value={metric.value}
                      unit={metric.unit}
                      statusObj={getSensorStatus(metric.key, metric.value)}
                      sparklineData={getSparklineData(metric.key)}
                    />
                  </motion.div>
                ))
            }
          </div>
        </div>

        {/* Bottom Horizontal Row: 4 Equal Cards (PM1.0, PM2.5, PM4.0, PM10) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {isLoading 
            ? Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
            : bottomRowMetrics.map((metric, i) => (
                <motion.div 
                  key={metric.key} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                >
                  <MetricCard 
                    title={metric.title}
                    icon={metric.icon}
                    value={metric.value}
                    unit={metric.unit}
                    statusObj={getSensorStatus(metric.key, metric.value)}
                    sparklineData={getSparklineData(metric.key)}
                  />
                </motion.div>
              ))
          }
        </div>
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

