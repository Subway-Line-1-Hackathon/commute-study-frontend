export default function SegmentedToggle({ options, value, onChange }) {
  return (
    <div className="flex rounded-xl bg-slate-100 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
            value === opt.value ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
