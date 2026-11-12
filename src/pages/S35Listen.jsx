import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import ConfirmModal from '../components/ConfirmModal'
import NoteDeck from '../components/listen/NoteDeck'
import PlayerControls from '../components/listen/PlayerControls'
import SegmentedToggle from '../components/SegmentedToggle'
import { useWakeLock } from '../hooks/useWakeLock'
import Screen from '../layouts/Screen'
import { PHASE, ROUTES, SESSION_STATUS as S } from '../lib/constants'
import { createSpeaker, isSpeechSupported } from '../lib/speaker'
import { getSessionRoute, useSessionStore } from '../store/useSessionStore'

// S35 개념 듣기: 요약 대본을 문단별로 TTS로 읽어 준다
// '건너뛰기'나 다 들은 뒤 '문제 풀러 가기'를 누르면 문제 풀이(S40)로 넘어간다

const RATE_OPTIONS = [
  { value: 0.8, label: '0.8x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
]

const AUTO_NEXT_SEC = 3

export default function S35Listen() {
  const navigate = useNavigate()
  const cur = useSessionStore((s) => s.current)
  const skipListening = useSessionStore((s) => s.skipListening)
  const endSession = useSessionStore((s) => s.endSession)

  const [index, setIndex] = useState(() => useSessionStore.getState().current?.listenIndex ?? 0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [finished, setFinished] = useState(false)
  const [confirm, setConfirm] = useState(null) // 'skip' | 'end' | null
  const [countdown, setCountdown] = useState(null) // 다 들은 뒤 문제로 넘어가기까지 남은 초

  // 음성 플레이어는 화면이 처음 그려질 때 한 번만 만든다
  const [speaker] = useState(() => {
    const sp = createSpeaker({
      onIndex: (i) => {
        setIndex(i)
        useSessionStore.getState().setListenIndex(i)
      },
      onFinish: () => {
        setPlaying(false)
        setFinished(true)
        setCountdown(AUTO_NEXT_SEC)
      },
    })
    const current = useSessionStore.getState().current
    sp.load(current?.script ?? [], current?.listenIndex ?? 0)
    return sp
  })

  const running = cur?.status === S.IN_PROGRESS && cur?.phase === PHASE.LISTEN
  useWakeLock(running)

  useEffect(() => () => speaker.stop(), [speaker])

  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      speaker.stop()
      useSessionStore.getState().skipListening()
      navigate(ROUTES.PLAYER, { replace: true })
      return
    }
    const id = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown, speaker, navigate])

  if (!cur) return <Navigate to={ROUTES.HOME} replace />
  if (cur.phase !== PHASE.LISTEN || cur.status === S.COMPLETED || cur.status === S.ENDED) {
    return <Navigate to={getSessionRoute(cur)} replace />
  }

  const script = cur.script
  const supported = isSpeechSupported()

  const togglePlay = () => {
    if (playing) {
      speaker.pause()
      setPlaying(false)
      return
    }
    if (finished) {
      speaker.seek(0)
      setFinished(false)
      setCountdown(null)
    }
    speaker.play()
    setPlaying(true)
  }

  const goTo = (i) => {
    setFinished(false)
    setCountdown(null)
    speaker.seek(i)
  }

  const changeRate = (value) => {
    setRate(value)
    speaker.setRate(value)
  }

  const handleSkip = () => {
    speaker.stop()
    setConfirm(null)
    skipListening()
    navigate(ROUTES.PLAYER, { replace: true })
  }

  const handleEnd = () => {
    speaker.stop()
    setConfirm(null)
    endSession('QUIT')
    navigate(ROUTES.HOME, { replace: true })
  }

  let bottomCta = (
    <Button variant="secondary" onClick={() => setConfirm('skip')}>
      문제 풀기로 건너뛰기
    </Button>
  )
  if (finished) {
    bottomCta = <Button onClick={handleSkip}>문제 풀러 가기</Button>
  }

  return (
    <Screen back={() => setConfirm('end')} bottomCta={bottomCta}>
      <p className="text-caption text-muted">개념 듣기</p>
      <h1 className="mt-1 text-title text-ink">{cur.unitTitle}</h1>

      {!supported && (
        <p className="mt-4 rounded-xl bg-warning-soft p-3 text-caption text-warning">
          이 브라우저는 음성 읽기를 지원하지 않아요. 카드를 넘기면서 읽어 주세요.
        </p>
      )}

      <div className="mt-6">
        <NoteDeck script={script} index={index} playing={playing} onChange={goTo} />
      </div>

      {finished && countdown !== null && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-success-soft p-3 text-caption text-success">
          <p>요약 노트를 모두 들었어요. {countdown}초 뒤 문제로 넘어가요.</p>
          <button
            type="button"
            onClick={() => setCountdown(null)}
            className="shrink-0 font-bold underline"
          >
            취소
          </button>
        </div>
      )}

      {finished && countdown === null && (
        <p className="mt-4 rounded-xl bg-success-soft p-3 text-caption text-success">
          요약 노트를 모두 들었어요. 바로 문제를 풀거나 처음부터 다시 들을 수 있어요.
        </p>
      )}

      <div className="mt-4">
        <PlayerControls
          playing={playing}
          index={index}
          total={script.length}
          onPrev={() => goTo(index - 1)}
          onToggle={togglePlay}
          onNext={() => goTo(index + 1)}
        />
      </div>

      <div className="mt-2">
        <p className="mb-2 text-caption text-muted">재생 속도</p>
        <SegmentedToggle options={RATE_OPTIONS} value={rate} onChange={changeRate} />
      </div>

      {confirm === 'skip' && (
        <ConfirmModal
          title="문제풀기로 넘어갈까요?"
          confirmLabel="넘어가기"
          cancelLabel="계속 듣기"
          onConfirm={handleSkip}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm === 'end' && (
        <ConfirmModal
          title="학습을 종료할까요?"
          message="종료하면 이어서 할 수 없어요."
          confirmLabel="종료하기"
          cancelLabel="계속 듣기"
          onConfirm={handleEnd}
          onCancel={() => setConfirm(null)}
        />
      )}
    </Screen>
  )
}
