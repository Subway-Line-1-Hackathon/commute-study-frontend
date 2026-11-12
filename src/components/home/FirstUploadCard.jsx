export default function FirstUploadCard({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-primary/40 bg-surface px-4 py-10"
    >
      <span className="text-question text-primary">첫 자료 올리기</span>
      <span className="text-caption text-muted">
        강의 자료를 올리면 통학 시간에 맞춘 학습을 만들어 드려요
      </span>
    </button>
  )
}
