// 리포트 화면의 숫자 칸 하나 (이름 + 값)
export default function StatTile({ label, value }) {
  return (
    <div className="flex-1 rounded-card border border-line bg-surface p-3">
      <p className="text-caption text-muted">{label}</p>
      <p className="mt-1 text-question text-ink">{value}</p>
    </div>
  )
}
