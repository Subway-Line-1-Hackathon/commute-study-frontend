import { MATERIAL_STATUS as M } from '../lib/constants'

// 업로드한 자료 한 개를 보여주는 카드 (파일명, 크기, 상태 뱃지, 진행 막대, 실패 시 다시 시도)

// 상태별 뱃지 문구와 색
const BADGE = {
  [M.UPLOADING]: { label: '업로드 중', cls: 'bg-background text-muted' },
  [M.UPLOADED]: { label: '분석 대기', cls: 'bg-warning-soft text-warning' },
  [M.PROCESSING]: { label: '분석 중', cls: 'bg-warning-soft text-warning' },
  [M.READY]: { label: '준비 완료', cls: 'bg-success-soft text-success' },
  [M.FAILED]: { label: '실패', cls: 'bg-danger-soft text-danger' },
  [M.EXPIRED]: { label: '보관 만료', cls: 'bg-background text-muted' },
}

// 바이트를 "1.2MB" / "340KB" 형태로
function formatSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  }
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

export default function MaterialCard({ material, onRetry, onRemove }) {
  const { status } = material
  const badge = BADGE[status]

  let badgeLabel = badge.label
  // 서버 업로드는 진행률을 알 수 없어서 %를 빼고 막대만 움직인다
  const knownProgress = material.progress != null
  if (status === M.UPLOADING && knownProgress) {
    badgeLabel = `${badge.label} ${material.progress}%`
  }

  let info = formatSize(material.fileSize)
  if (material.pageCount > 1) {
    info = `사진 ${material.pageCount}장 · ${info}`
  }

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-body font-bold text-ink">{material.fileName}</p>
          <p className="mt-0.5 text-caption text-muted">{info}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-label ${badge.cls}`}>
          {badgeLabel}
        </span>
      </div>

      {status === M.UPLOADING && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background">
          <div
            className={`h-full rounded-full bg-primary transition-all ${knownProgress ? '' : 'animate-pulse'}`}
            style={{ width: `${knownProgress ? material.progress : 100}%` }}
          />
        </div>
      )}

      {(status === M.UPLOADED || status === M.PROCESSING) && (
        <p className="mt-3 flex items-center gap-2 text-caption text-muted">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-line border-t-primary" />
          단원 나누고 요약본 만드는 중이에요
        </p>
      )}

      {status === M.READY && <p className="mt-3 text-caption text-muted">학습할 준비가 됐어요</p>}

      {status === M.EXPIRED && (
        <p className="mt-3 text-caption text-muted">보관 기간이 지나 원본 자료가 정리됐어요</p>
      )}

      {status === M.FAILED && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-caption text-danger">
            {/* 재시도까지 실패했으면 고정 문구, 아니면 서버가 준 실패 이유 */}
            {material.retried && !material.uploadFailed
              ? '다시 시도해도 처리하지 못했어요. 다른 파일로 올려 주세요.'
              : material.errorMessage}
          </p>
          <div className="flex shrink-0 gap-2">
            {/* 재시도는 1번만 가능 */}
            {!material.retried && (
              <button
                type="button"
                onClick={() => onRetry(material.id)}
                className="rounded-lg border border-line bg-surface px-3 py-1.5 text-caption font-bold text-ink"
              >
                다시 시도
              </button>
            )}
            <button
              type="button"
              onClick={() => onRemove(material.id)}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-caption text-muted"
            >
              지우기
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
