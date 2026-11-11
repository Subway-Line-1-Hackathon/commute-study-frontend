import { MATERIAL_STATUS as M } from '../../lib/constants'
import Card from '../Card'

const LABEL = {
  [M.UPLOADING]: '업로드 중',
  [M.UPLOADED]: '분석 대기',
  [M.PROCESSING]: '분석 중',
}

function Row({ name, label }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2">
        <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-line border-t-primary" />
        <span className="truncate text-caption text-ink">{name}</span>
      </span>
      <span className="shrink-0 rounded-full bg-warning-soft px-2.5 py-1 text-label text-warning">
        {label}
      </span>
    </li>
  )
}

function FailedRow({ name, retried, onClick, onRemove }) {
  return (
    <li className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center justify-between gap-3"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-caption font-bold text-danger">✕</span>
          <span className="truncate text-caption text-ink">{name}</span>
        </span>
        <span className="shrink-0 rounded-full bg-danger-soft px-2.5 py-1 text-label text-danger">
          {retried ? '실패 · 다시 올리기 ›' : '실패 · 다시 시도 ›'}
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="목록에서 지우기"
        className="-m-1 shrink-0 p-1 text-caption text-muted"
      >
        ✕
      </button>
    </li>
  )
}

export default function ProcessingCard({
  materials,
  units,
  failed,
  onClick,
  onOpenFailed,
  onRemoveFailed,
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-caption text-muted">준비 중인 자료</h2>
        <button type="button" onClick={onClick} className="text-caption font-bold text-primary">
          단원 보기 ›
        </button>
      </div>

      <ul className="space-y-2.5">
        {failed.map((m) => (
          <FailedRow
            key={m.id}
            name={m.fileName}
            retried={m.retried}
            onClick={() => onOpenFailed(m)}
            onRemove={() => onRemoveFailed(m.id)}
          />
        ))}
        {materials.map((m) => (
          <Row key={m.id} name={m.fileName} label={LABEL[m.status]} />
        ))}
        {units.map((u) => (
          <Row key={u.id} name={u.title} label="문제 준비 중" />
        ))}
      </ul>
      <p className="mt-3 text-caption text-muted">끝나면 단원을 골라 바로 학습할 수 있어요</p>
    </Card>
  )
}
