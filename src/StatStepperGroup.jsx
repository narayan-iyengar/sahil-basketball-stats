// Updated StatStepperGroup.jsx to handle single stats
import React from "react";
import StatStepper from "./StatStepper";

export default function StatStepperGroup({ 
  label, 
  madeValue, 
  attValue, 
  onStatChange, 
  madeKey, 
  attKey, 
  singleStat = false 
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <h4 className="text-md font-bold text-center mb-3 text-gray-900 dark:text-white">{label}</h4>
      <div className="flex justify-center items-center gap-4">
        {singleStat ? (
          // Single stat - just show one stepper centered
          <StatStepper 
            label="Total" 
            value={madeValue || 0} 
            onIncrement={() => onStatChange(madeKey, 1)} 
            onDecrement={() => onStatChange(madeKey, -1)} 
          />
        ) : (
          // Made/Attempted pair
          <>
            <StatStepper 
              label="Made" 
              value={madeValue || 0} 
              onIncrement={() => onStatChange(madeKey, 1)} 
              onDecrement={() => onStatChange(madeKey, -1)} 
            />
            <StatStepper 
              label="Attempted" 
              value={attValue || 0} 
              onIncrement={() => onStatChange(attKey, 1)} 
              onDecrement={() => onStatChange(attKey, -1)} 
            />
          </>
        )}
      </div>
    </div>
  );
}