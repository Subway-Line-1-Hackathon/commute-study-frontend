import Button from '../Button'
import Card from '../Card'

function getMode(home) {
  if (!home.hasUnits && home.isProcessing) return 'processing'
  if (home.resumable) return 'resume'
  if (home.last) return 'done'
  return 'empty'
}

function SubjectLine({ name, dDay }) {
  if (!name) return null

  return (
    <p className="text-caption font-bold text-primary">
      {name}
      {dDay && ` · ${dDay}`}
    </p>
  )
}

function Progress({ session }) {
  const answered = session.answers.length
  const total = session.questions.length
  if (total === 0) return null

  return (
    <>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(answered / total) * 100}%` }}
        />
      </div>
      <p className="mt-1 text-caption text-muted">
        {answered}/{total}문제까지 풀었어요
      </p>
    </>
  )
}

function StartButton({ home, mode, onCreate, onReview }) {
  if (home.reviewOnly) {
    return (
      <Button onClick={onReview} className="flex-1">
        오답 복습하기
      </Button>
    )
  }

  let variant = 'primary'
  if (mode === 'resume') {
    variant = 'secondary'
  }

  return (
    <Button variant={variant} onClick={onCreate} disabled={!home.hasUnits} className="flex-1">
      커리큘럼 만들기
    </Button>
  )
}

export default function LastStudyCard({ home, onResume, onCreate, onReview }) {
  const mode = getMode(home)

  if (mode === 'processing') {
    return (
      <Card tone="primary">
        <p className="text-caption text-ink">
          자료를 분석하고 있어요. 끝나면 학습을 시작할 수 있어요.
        </p>
      </Card>
    )
  }

  let message = '첫 커리큘럼을 만들어 볼까요?'
  if (mode === 'resume') {
    message = home.resumable.unitTitle
  }
  if (mode === 'done') {
    message = `${home.last.unitTitle}을(를) 마쳤어요`
  }

  return (
    <Card tone="primary">
      <SubjectLine name={home.lastSubjectName} dDay={home.lastDDay} />
      <p className="mt-1 text-body font-bold text-ink">{message}</p>

      {mode === 'resume' && <Progress session={home.resumable} />}

      <div className="mt-4 flex gap-2">
        {mode === 'resume' && (
          <Button onClick={onResume} className="flex-1">
            이어서 하기
          </Button>
        )}
        <StartButton home={home} mode={mode} onCreate={onCreate} onReview={onReview} />
      </div>
    </Card>
  )
}
