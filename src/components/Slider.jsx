export function Slider({ label, value, onChange, min = 0, max = 2, step = 0.01, defaultValue, unit }) {
  const defaultVal = defaultValue ?? (unit === '%' || unit === 'px' ? min : (min + max) / 2)
  const isSigned = min < 0

  let displayValue
  if (unit === 'px') {
    displayValue = `${Math.round(value)}px`
  } else if (unit === 'deg') {
    displayValue = `${Math.round(value)}°`
  } else if (unit === '%') {
    displayValue = `${Math.round(value)}%`
  } else if (isSigned) {
    displayValue = `${value >= 0 ? '+' : ''}${(value * 100).toFixed(0)}`
  } else {
    displayValue = `${(value * 100).toFixed(0)}%`
  }
  const showReset = value !== defaultVal

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="flex items-center">
          <span className="text-zinc-300 tabular-nums">{displayValue}</span>
          {showReset && (
            <button
              type="button"
              onClick={() => onChange(defaultVal)}
              className="text-zinc-500 hover:text-indigo-400 text-xs ml-1"
              title="Reset"
            >
              ↺
            </button>
          )}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
      />
    </div>
  )
}
