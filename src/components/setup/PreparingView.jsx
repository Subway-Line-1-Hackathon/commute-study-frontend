export default function PreparingView() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-primary" />
      <p className="mt-6 text-question text-ink">문제를 준비하고 있어요</p>
      <p className="mt-2 text-caption text-muted">
        문제가 모자라면 새로 만들어서 최대 1분 정도 걸릴 수 있어요.
      </p>
    </div>
  )
}
