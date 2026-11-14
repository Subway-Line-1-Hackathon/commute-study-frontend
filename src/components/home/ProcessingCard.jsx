import { MATERIAL_STATUS as M } from '../../lib/constants'
import Card from '../Card'
import Tag from '../Tag'
import XIcon from '../XIcon'

const LABEL = {
  [M.UPLOADING]: '업로드 중',
  [M.UPLOADED]: '분석 대기',
  [M.PROCESSING]: '분석 중',
  [M.READY]: '문제 준비 중',
}

function Row({ name, label, ready = false }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2">
        {ready ? (
          <span className="shrink-0 text-success" aria-hidden="true">
            ✓
          </span>
        ) : (
          <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-line border-t-primary" />
        )}
        <span className="truncate text-caption text-ink">{name}</span>
      </span>
      <Tag tone={ready ? 'success' : 'warning'} size="sm" pill className="shrink-0">
        {label}
      </Tag>
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
        <Tag tone="danger" size="sm" pill className="shrink-0">
          {retried ? '실패 · 다시 올리기 ›' : '실패 · 다시 시도 ›'}
        </Tag>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${name} 지우기`}
        className="-m-1 shrink-0 p-1 text-muted"
      >
        <XIcon />
      </button>
    </li>
  )
}

export default function ProcessingCard({
  materials,
  units,
  failed,
  ready,
  onClick,
  onOpenFailed,
  onRemoveFailed,
  onDismissReady,
}) {
  const waiting = materials.length > 0 || units.length > 0

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-caption text-muted">학습 자료</h2>
        <div className="-my-2 flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClick}
            className="h-9 text-caption font-bold text-primary"
          >
            단원 보기 ›
          </button>
          {ready.length > 0 && (
            <button
              type="button"
              onClick={onDismissReady}
              aria-label="학습 준비 완료 안내 닫기"
              className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
            >
              <XIcon />
            </button>
          )}
        </div>
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
        {ready.map((material) => (
          <Row key={`ready-${material.key}`} name={material.title} label="완료" ready />
        ))}
      </ul>
      {waiting && (
        <p className="mt-3 text-caption text-muted">끝나면 단원을 골라 바로 학습할 수 있어요</p>
      )}
    </Card>
  )
}
