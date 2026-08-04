import React from 'react';
import ReactSpeedometer from "react-d3-speedometer";
import { cn } from '../../utils/cn';
import { Skeleton } from '../LoadingSkeleton/LoadingSkeleton';

export function GaugeCard({ title, value, unit, maxValue = 100, isLoading = false, className }) {
  if (isLoading) {
    return (
      <div className={cn("bg-white rounded-[16px] shadow-soft p-[24px] flex flex-col items-center justify-center min-h-[190px]", className)}>
        <Skeleton className="w-[120px] h-[80px]" />
        <Skeleton className="w-20 h-4 mt-4" />
      </div>
    );
  }

  const segmentColors = [
    "#10b981", // good
    "#f59e0b", // moderate
    "#f97316", // poor
    "#ef4444", // critical
  ];

  return (
    <div className={cn("bg-white rounded-[16px] shadow-soft px-[24px] pb-[24px] pt-[32px] flex flex-col items-center min-h-[190px] min-w-0 transition-all duration-150 hover:shadow-lg justify-between", className)}>
      <h3 className="font-semibold text-[14px] text-neutral-600 mb-6 w-full text-center tracking-wide break-words">{title}</h3>
      <div className="flex-1 flex items-center justify-center w-full">
        {/* Increased height to prevent clipping the bottom of the value text */}
        <div style={{ width: "100%", height: "115px", maxWidth: "160px" }} className="flex justify-center -mt-2">
          <ReactSpeedometer
            value={value}
            minValue={0}
            maxValue={maxValue}
            segments={4}
            segmentColors={segmentColors}
            ringWidth={12}
            needleColor="#3f3f46"
            needleTransitionDuration={2000}
            needleTransition="easeElastic"
            textColor="#52525b"
            fluidWidth={true}
            valueFormat={"d"}
            currentValueText={`${value} ${unit}`}
            valueTextFontSize="22px"
            labelFontSize="9px"
            paddingHorizontal={0}
            paddingVertical={0}
            needleHeightRatio={0.7}
          />
        </div>
      </div>
    </div>
  );
}
