import React from "react";
import StatStepper from "./StatStepper";

export default function StatStepperGroup({ label, madeValue, attValue, onStatChange, madeKey, attKey }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <h4 className="text-md font-bold text-center mb-3">{label}</h4>
      <div className="flex justify-around items-center">
        <StatStepper label="Made" value={madeValue} onIncrement={() => onStatChange(madeKey, 1)} onDecrement={() => onStatChange(madeKey, -1)} />
        <StatStepper label="Att." value={attValue} onIncrement={() => onStatChange(attKey, 1)} onDecrement={() => onStatChange(attKey, -1)} />
      </div>
    </div>
  );
}