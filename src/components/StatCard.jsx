export default function StatCard({ label, value, tone = 'default' }) {
  const toneClass = {
    default: 'text-slate-900',
    good: 'text-green-600',
    bad: 'text-red-500',
  }[tone]

  return (
    <div className="flex-1 rounded-xl bg-white p-3 text-center shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${toneClass}`}>{value}</p>
    </div>
  )
}
