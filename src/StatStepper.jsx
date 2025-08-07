import React from "react";
import SaveStatusIndicator from "./SaveStatusIndicator";

export default function StatStepper({ label, value, onIncrement, onDecrement, saveStatus }) {
  return (
    <div className="flex flex-col items-center">
      <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center">
        {label}
        <div className="w-4 h-4 ml-1">
          <SaveStatusIndicator status={saveStatus} />
        </div>
      </label>
      <div className="flex items-center justify-center gap-3">
        <button type="button" onClick={onDecrement} className="bg-red-500 hover:bg-red-600 w-8 h-8 rounded-full text-xl font-bold flex items-center justify-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed" disabled={value <= 0}>-</button>
        <span className="font-mono w-10 text-center text-2xl">{value}</span>
        <button type="button" onClick={onIncrement} className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-full text-xl font-bold flex items-center justify-center shadow-md">+</button>
      </div>
    </div>
  );
}

