import React from 'react';

export function DeviceOperations() {
  const operations = [
    { label: 'MQTT Connection', value: 'Connected', status: '🟢' },
    { label: 'Device Status', value: 'Online', status: '🟢' },
    { label: 'Last Message', value: '2 sec ago', status: '🟢' },
    { label: 'Signal Quality', value: 'Excellent', status: '🟢' },
    { label: 'Backend API', value: 'Running', status: '🟢' },
  ];

  return (
    <div className="card-container min-h-[220px]">
      <h2 className="text-[16px] font-bold text-neutral-800 mb-6">Device Operations</h2>
      <div className="flex flex-col gap-5 flex-1 justify-center">
        {operations.map((op, idx) => (
          <div key={idx} className="flex items-center justify-between border-b border-neutral-100 pb-2 last:border-0 last:pb-0">
            <div className="flex items-center gap-3">
              <span className="text-[12px] leading-none">{op.status}</span>
              <span className="text-[14px] font-medium text-neutral-600">{op.label}</span>
            </div>
            <span className="text-[14px] font-bold text-neutral-800">{op.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
