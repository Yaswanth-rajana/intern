import React, { useState } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useAuthStore } from '../../store/authStore';
import { 
  ShieldAlert, Check, X, Edit3, Settings as SettingsIcon, 
  AlertTriangle, ShieldCheck, Activity 
} from 'lucide-react';
import { SENSOR_CONFIG } from '../../utils/sensorStatusConfig';
import { DiagnosticsPanel } from '../../components/DiagnosticsPanel/DiagnosticsPanel';
import { SystemStatus } from '../../components/DeviceOperations/SystemStatus';

const SENSOR_META = {
  AQI: { title: 'AQI', desc: 'Overall Air Quality Index. Integrates multiple particulate and gaseous pollutants.' },
  CO2: { title: 'Carbon Dioxide (CO₂)', desc: 'Concentration of CO₂ in the space. Indicator of ventilation effectiveness.' },
  VOC: { title: 'Volatile Organic Compounds', desc: 'Total concentration of chemical vapors and organic gases.' },
  PM1_0: { title: 'Particulate Matter (PM 1.0)', desc: 'Ultrafine suspended dust particles with a diameter under 1.0 micron.' },
  PM2_5: { title: 'Particulate Matter (PM 2.5)', desc: 'Fine dust particles under 2.5 microns, easily inhaled into lungs.' },
  PM4_0: { title: 'Particulate Matter (PM 4.0)', desc: 'Suspended coarse particulate matter under 4.0 microns.' },
  PM10: { title: 'Particulate Matter (PM 10)', desc: 'Coarse inhalable particles such as dust, pollen, and mold spores.' },
  Temperature: { title: 'Temperature', desc: 'Ambient temperature level. Affects general occupant comfort.' },
  Humidity: { title: 'Relative Humidity', desc: 'Moisture content in the air. Recommended level is 30% to 60%.' },
  NOX: { title: 'Nitrogen Oxides (NOx)', desc: 'Concentration of nitric oxide and nitrogen dioxide from combustion sources.' }
};

export function Settings() {
  const thresholds = useDashboardStore(state => state.thresholds);
  const updateThreshold = useDashboardStore(state => state.updateThreshold);
  const user = useAuthStore(state => state.user);
  
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClientAdmin = user?.role === 'CLIENT_ADMIN' || user?.role === 'Admin';
  const canEdit = isSuperAdmin || isClientAdmin;

  const [editingKey, setEditingKey] = useState(null);
  const [warningVal, setWarningVal] = useState('');
  const [criticalVal, setCriticalVal] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleEdit = (sensorKey, currentWarning, currentCritical) => {
    setEditingKey(sensorKey);
    setWarningVal(currentWarning.toString());
    setCriticalVal(currentCritical.toString());
  };

  const handleSave = async (sensorKey) => {
    const wLimit = parseFloat(warningVal);
    const cLimit = parseFloat(criticalVal);

    if (isNaN(wLimit) || isNaN(cLimit)) {
      alert('Please enter valid numeric values');
      return;
    }

    if (wLimit >= cLimit) {
      alert('Warning limit should be strictly lower than critical limit');
      return;
    }

    setIsSaving(true);
    const success = await updateThreshold(sensorKey, wLimit, cLimit);
    setIsSaving(false);

    if (success) {
      setEditingKey(null);
      setSuccessMsg(`Successfully updated thresholds for ${sensorKey}`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      alert('Failed to update threshold');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
          <SettingsIcon className="w-4 h-4" />
          <span>System Configuration & Diagnostics</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          Settings
        </h1>
        <p className="text-neutral-500 text-sm mt-1">
          Manage alert thresholds and inspect technical communication diagnostics.
        </p>
      </div>

      {/* Section 1: Alert Threshold Configurations */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-800">Alert Threshold Configurations</h2>
          <p className="text-neutral-500 text-xs mt-0.5">
            Configure organization-specific warning and critical limits for all monitored air quality parameters.
          </p>
        </div>

        {successMsg && (
          <div className="bg-success/10 border border-success/20 text-success p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            {successMsg}
          </div>
        )}

        <div className="bg-white rounded-[16px] shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="px-6 py-5 font-semibold w-1/3">Parameter</th>
                  <th className="px-6 py-5 font-semibold">Unit</th>
                  <th className="px-6 py-5 font-semibold text-amber-600">Warning Limit</th>
                  <th className="px-6 py-5 font-semibold text-rose-600">Critical Limit</th>
                  <th className="px-6 py-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {Object.keys(SENSOR_META).map((key) => {
                  const meta = SENSOR_META[key];
                  const dbThreshold = thresholds.find(t => t.sensorKey === key);
                  
                  const defaultWarn = SENSOR_CONFIG[key]?.thresholds[1]?.max || 50;
                  const defaultCrit = SENSOR_CONFIG[key]?.thresholds[3]?.max || 150;

                  const warnLimit = dbThreshold ? dbThreshold.warningLimit : defaultWarn;
                  const critLimit = dbThreshold ? dbThreshold.criticalLimit : defaultCrit;

                  const isEditing = editingKey === key;
                  const unit = SENSOR_CONFIG[key]?.unit || 'N/A';

                  return (
                    <tr key={key} className="hover:bg-neutral-50/50 transition-colors">
                      
                      {/* Parameter Details */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <span className="text-[14px] font-bold text-neutral-800">{meta.title}</span>
                          <span className="text-[11px] text-neutral-400 font-medium leading-relaxed">{meta.desc}</span>
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="px-6 py-5">
                        <span className="px-2 py-1 bg-neutral-100 rounded text-neutral-500 font-bold text-[11px] uppercase tracking-wider">
                          {unit}
                        </span>
                      </td>

                      {/* Warning Limit */}
                      <td className="px-6 py-5">
                        {isEditing ? (
                          <input
                            type="number"
                            value={warningVal}
                            onChange={(e) => setWarningVal(e.target.value)}
                            className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-[13px] font-semibold text-neutral-800 outline-none focus:border-amber-400 focus:bg-white transition-all w-24"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-700 font-bold text-[14px] tabular-nums">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            {warnLimit}
                          </div>
                        )}
                      </td>

                      {/* Critical Limit */}
                      <td className="px-6 py-5">
                        {isEditing ? (
                          <input
                            type="number"
                            value={criticalVal}
                            onChange={(e) => setCriticalVal(e.target.value)}
                            className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-[13px] font-semibold text-neutral-800 outline-none focus:border-rose-400 focus:bg-white transition-all w-24"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 text-rose-700 font-bold text-[14px] tabular-nums">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            {critLimit}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSave(key)}
                              disabled={isSaving}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors border border-emerald-200 cursor-pointer"
                              title="Save Thresholds"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingKey(null)}
                              className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            {canEdit ? (
                              <button
                                onClick={() => handleEdit(key, warnLimit, critLimit)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[12px] rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Configure
                              </button>
                            ) : (
                              <span className="text-[11px] text-neutral-400 font-medium inline-flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-neutral-400" /> Read-Only
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 2: Diagnostics & System Status */}
      <div className="space-y-4 pt-6 border-t border-neutral-200">
        <div>
          <div className="flex items-center gap-2 text-neutral-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Diagnostics & System Status</span>
          </div>
          <h2 className="text-lg font-bold text-neutral-800">System Telemetry & Network Diagnostics</h2>
          <p className="text-neutral-500 text-xs mt-0.5">
            Real-time operational status, broker connections, WebSocket connectivity, packet latency, and MQTT telemetry.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <SystemStatus />
          <div className="xl:col-span-2">
            <DiagnosticsPanel />
          </div>
        </div>
      </div>

    </div>
  );
}

// Export as ThresholdsManager as well for backwards compatibility
export { Settings as ThresholdsManager };
