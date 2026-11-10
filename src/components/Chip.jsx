export default function Chip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
        selected
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-slate-300 bg-white text-slate-600 active:bg-slate-50'
      }`}
    >
      {label}
    </button>
  )
}
