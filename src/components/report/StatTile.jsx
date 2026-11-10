export default function StatTile({ label, value }) {
  return (
    <div className="flex-1 rounded-xl border border-line bg-surface p-3">
      <p className="text-caption text-muted">{label}</p>
      <p className="mt-1 text-question text-ink">{value}</p>
    </div>
  )
}
