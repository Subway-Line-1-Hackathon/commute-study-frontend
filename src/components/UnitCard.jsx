// 단원 하나의 진도 카드 (제목, 상태 문구, 진행 막대, 학습하기/복습하기 버튼)
// progress: { percent, label } | null
export default function UnitCard({ unit, progress, disabled, onStart }) {
  const percent = progress?.percent ?? 0
  let status = '아직 시작하지 않았어요'
  if (unit.questionStatus === 'PREPARING') status = '문제를 준비하고 있어요'
  else if (progress) status = progress.label

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate font-medium text-slate-900">{unit.title}</h4>
          <p className="mt-1 text-xs text-slate-500">{status}</p>
        </div>
        <button
          onClick={onStart}
          disabled={disabled}
          className="shrink-0 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white active:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400"
        >
          {progress ? '복습하기' : '학습하기'}
        </button>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-right text-xs text-slate-400">{percent}%</p>
    </div>
  )
}
