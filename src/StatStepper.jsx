export default function StatStepper({ label, value, onIncrement, onDecrement }) {
  return (
    <div className="flex flex-col items-center space-y-2">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center leading-tight min-h-[32px] flex items-center">
        {label}
      </label>
      <div className="flex items-center justify-center gap-2">
        <button 
          type="button" 
          onClick={onDecrement} 
          className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-md text-lg font-bold flex items-center justify-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95" 
          disabled={value <= 0}
        >
          −
        </button>
        <span className="font-mono w-10 text-center text-lg font-bold text-gray-900 dark:text-white">
          {value}
        </span>
        <button 
          type="button" 
          onClick={onIncrement} 
          className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-md text-lg font-bold flex items-center justify-center shadow-md transition-all active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}