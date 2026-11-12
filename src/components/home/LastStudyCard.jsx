import { SESSION_STATUS as S } from '../../lib/constants'
import { withObject } from '../../lib/josa'
import Button from '../Button'
import Card from '../Card'
import AccuracyRing from './AccuracyRing'

function CardHeader({ name, dDay }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-caption text-muted">이전 학습</h2>
        {dDay && (
          <span className="shrink-0 rounded-lg bg-surface px-2.5 py-1 text-label text-primary">
            시험 {dDay}
          </span>
        )}
      </div>
      {name && <p className="mt-2 truncate text-body font-bold text-primary">{name}</p>}
    </>
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
        {total}문제 중 {answered}문제 풀었어요
      </p>
    </>
  )
}

function ResumeCard({ home, onResume, onCreate, onReview }) {
  let secondButton = (
    <Button variant="secondary" onClick={onCreate} disabled={!home.hasUnits} className="flex-1">
      다른 단원 고르기
    </Button>
  )
  if (home.reviewOnly) {
    secondButton = (
      <Button variant="secondary" onClick={onReview} className="flex-1">
        오답 복습하기
      </Button>
    )
  }

  return (
    <Card tone="primary">
      <CardHeader name={home.lastSubjectName} dDay={home.lastDDay} />
      <p className="mt-1 text-body font-bold text-ink">{home.resumable.unitTitle}</p>
      <Progress session={home.resumable} />

      <div className="mt-4 flex gap-2">
        <Button onClick={onResume} className="flex-1">
          이어서 하기
        </Button>
        {secondButton}
      </div>
    </Card>
  )
}

function DoneCard({ home, onCreate, onStartNext }) {
  const result = home.lastResult
  const next = home.nextUnit

  let resultText = `${result.scored}문제 중 ${result.correct}문제 정답`
  if (result.scored === 0) {
    resultText = `${result.answered}문제를 들었어요`
  }

  let buttons = (
    <Button onClick={onCreate} disabled={!home.hasUnits}>
      단원 골라 시작
    </Button>
  )
  if (next) {
    buttons = (
      <>
        <Button onClick={() => onStartNext(next)} className="flex-1">
          다음 단원 시작
        </Button>
        <Button variant="secondary" onClick={onCreate} className="flex-1">
          다른 단원 고르기
        </Button>
      </>
    )
  }

  return (
    <Card tone="primary">
      <CardHeader name={home.lastSubjectName} dDay={home.lastDDay} />
      <div className="mt-1 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body font-bold text-ink">{withObject(home.last.unitTitle)} 마쳤어요</p>
          <p className="mt-0.5 text-caption text-muted">{resultText}</p>
        </div>
        {result.accuracy != null && <AccuracyRing percent={result.accuracy} />}
      </div>

      {next && (
        <div className="mt-4 border-t border-primary/15 pt-3">
          <p className="text-label font-normal text-muted">다음 단원 추천</p>
          <p className="mt-0.5 truncate text-body font-bold text-ink">
            {next.number}. {next.title}
          </p>
        </div>
      )}

      <div className="mt-4 flex gap-2">{buttons}</div>
    </Card>
  )
}

function StoppedCard({ home, onCreate, onRetry }) {
  return (
    <Card tone="primary">
      <CardHeader name={home.lastSubjectName} dDay={home.lastDDay} />
      <p className="mt-1 text-body font-bold text-ink">{home.last.unitTitle}</p>
      <Progress session={home.last} />

      <div className="mt-4 flex gap-2">
        <Button onClick={onRetry} className="flex-1">
          이 단원 다시 풀기
        </Button>
        <Button variant="secondary" onClick={onCreate} className="flex-1">
          다른 단원 고르기
        </Button>
      </div>
    </Card>
  )
}

function EmptyCard({ home, onCreate }) {
  return (
    <Card tone="primary">
      <p className="text-body font-bold text-ink">첫 커리큘럼을 만들어 볼까요?</p>
      <div className="mt-4">
        <Button onClick={onCreate} disabled={!home.hasUnits}>
          단원 골라 시작
        </Button>
      </div>
    </Card>
  )
}

function ReviewOnlyCard({ home, onReview, onSettings }) {
  if (home.openWrongCount === 0) {
    return (
      <Card tone="primary">
        <p className="text-body font-bold text-ink">아직 복습할 문제가 없어요</p>
        <p className="mt-1 text-caption text-muted">
          통학 시간이 {home.commute?.studyMin}분이라 오답 복습만 할 수 있어요. 시간을 늘리면 단원
          학습을 할 수 있어요.
        </p>
        <div className="mt-4">
          <Button variant="secondary" onClick={onSettings}>
            통학 시간 바꾸기
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card tone="primary">
      <p className="text-body font-bold text-ink">틀린 문제부터 복습해 볼까요?</p>
      <p className="mt-1 text-caption text-muted">
        통학 시간이 {home.commute?.studyMin}분이라 오답 복습만 할 수 있어요.
      </p>
      <div className="mt-4">
        <Button onClick={onReview}>오답 복습하기</Button>
      </div>
    </Card>
  )
}

export default function LastStudyCard(props) {
  if (props.home.resumable) return <ResumeCard {...props} />
  if (props.home.reviewOnly) return <ReviewOnlyCard {...props} />
  if (props.home.last?.status === S.ENDED) return <StoppedCard {...props} />
  if (props.home.last) return <DoneCard {...props} />
  return <EmptyCard {...props} />
}
