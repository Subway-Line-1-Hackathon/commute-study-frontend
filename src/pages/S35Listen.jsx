import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal'
import SegmentedToggle from '../components/SegmentedToggle'
import TimerBadge from '../components/TimerBadge'
import { useWakeLock } from '../hooks/useWakeLock'
import { PHASE, ROUTES, SESSION_STATUS as S } from '../lib/constants'
import { createSpeaker, isSpeechSupported } from '../lib/speaker'
import { getSessionRoute, useSessionStore } from '../store/useSessionStore'

// S35 개념 듣기: 요약 대본을 문단별로 TTS로 읽어 준다
// 개념 시간이 다 되거나 '건너뛰기'를 누르면 문제 풀이(S40)로 넘어간다

// 재생 속도 선택지
const RATE_OPTIONS = [
  { value: 0.8, label: '0.8x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
]

export default function S35Listen() {
  const navigate = useNavigate()
  const cur = useSessionStore((s) => s.current)
  const skipListening = useSessionStore((s) => s.skipListening)
  const endSession = useSessionStore((s) => s.endSession)

  // 지금 문단 번호. 이어 듣기면 저장된 위치부터 시작
  const [index, setIndex] = useState(() => useSessionStore.getState().current?.listenIndex ?? 0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [finished, setFinished] = useState(false) // 마지막 문단까지 다 들었는지
  const [confirm, setConfirm] = useState(null) // 'skip' | 'end' | null

  // 음성 플레이어는 화면이 처음 그려질 때 한 번만 만든다 (useState 초기화 함수는 한 번만 실행됨)
  // 문단이 바뀔 때마다 화면 번호와 스토어(이어 듣기 위치)를 갱신한다
  const [speaker] = useState(() => {
    const sp = createSpeaker({
      onIndex: (i) => {
        setIndex(i)
        useSessionStore.getState().setListenIndex(i)
      },
      onFinish: () => {
        setPlaying(false)
        setFinished(true)
      },
    })
    const current = useSessionStore.getState().current
    sp.load(current?.script ?? [], current?.listenIndex ?? 0)
    return sp
  })

  const running = cur?.status === S.IN_PROGRESS && cur?.phase === PHASE.LISTEN
  useWakeLock(running) // 듣는 동안 화면 꺼짐 방지

  // 1초마다 개념 시간 감소. 0이 되면 스토어가 문제 풀이 단계로 바꾼다
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => useSessionStore.getState().tick(), 1000)
    return () => clearInterval(id)
  }, [running])

  // 화면을 떠나면 음성을 멈춘다
  useEffect(() => () => speaker.stop(), [speaker])

  // 세션이 없거나 듣기 단계가 아니면 맞는 화면으로 보낸다 (시간이 다 돼서 QUIZ로 바뀐 경우 포함)
  if (!cur) return <Navigate to={ROUTES.HOME} replace />
  if (cur.phase !== PHASE.LISTEN || cur.status === S.COMPLETED || cur.status === S.ENDED) {
    return <Navigate to={getSessionRoute(cur)} replace />
  }

  const script = cur.script
  const seg = script[index]
  const supported = isSpeechSupported()

  // 재생/일시정지. 다 들은 상태에서 누르면 처음부터 다시
  const togglePlay = () => {
    if (playing) {
      speaker.pause()
      setPlaying(false)
      return
    }
    if (finished) {
      speaker.seek(0)
      setFinished(false)
    }
    speaker.play()
    setPlaying(true)
  }

  const changeRate = (value) => {
    setRate(value)
    speaker.setRate(value)
  }

  // 건너뛰기: 남은 개념 시간을 문제 시간에 더하고 문제 풀이로
  const handleSkip = () => {
    speaker.stop()
    setConfirm(null)
    skipListening()
    navigate(ROUTES.PLAYER, { replace: true })
  }

  // 학습 종료: 세션을 끝내고 홈으로
  const handleEnd = () => {
    speaker.stop()
    setConfirm(null)
    endSession('QUIT')
    navigate(ROUTES.HOME, { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 px-5 py-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setConfirm('end')}
          className="py-2 text-sm text-slate-500 active:text-slate-800"
        >
          ‹ 학습 종료
        </button>
        <TimerBadge seconds={cur.conceptRemainingSec} />
      </div>

      <p className="mt-2 text-sm text-slate-500">개념 듣기</p>
      <h1 className="text-2xl font-bold text-slate-900">{cur.unitTitle}</h1>

      {!supported && (
        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          이 브라우저는 음성 읽기를 지원하지 않아요. 자막을 보면서 문단을 넘겨 주세요.
        </div>
      )}

      <main className="mt-6 flex-1">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex justify-between text-xs text-slate-400">
            <span>
              문단 {index + 1} / {script.length}
            </span>
            {seg?.sourcePage != null && <span>자료 {seg.sourcePage}쪽</span>}
          </div>
          <p className="mt-4 text-lg leading-relaxed text-slate-900">{seg?.text}</p>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${((index + 1) / Math.max(script.length, 1)) * 100}%` }}
          />
        </div>

        {finished && (
          <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">
            준비한 내용을 모두 들었어요. 바로 문제를 풀거나 처음부터 다시 들을 수 있어요.
          </p>
        )}

        <div className="mt-8 flex items-center justify-center gap-6">
          <button
            onClick={() => speaker.seek(index - 1)}
            disabled={index === 0}
            className="h-12 w-12 rounded-full bg-white text-lg text-slate-600 shadow-sm disabled:opacity-30"
          >
            ⏮
          </button>
          <button
            onClick={togglePlay}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-3xl text-white shadow-lg active:bg-blue-700"
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button
            onClick={() => speaker.seek(index + 1)}
            disabled={index >= script.length - 1}
            className="h-12 w-12 rounded-full bg-white text-lg text-slate-600 shadow-sm disabled:opacity-30"
          >
            ⏭
          </button>
        </div>

        <div className="mt-8">
          <p className="mb-2 text-xs text-slate-500">재생 속도</p>
          <SegmentedToggle options={RATE_OPTIONS} value={rate} onChange={changeRate} />
        </div>
      </main>

      <div className="pt-6">
        <button
          onClick={() => setConfirm('skip')}
          className="w-full rounded-xl border border-slate-300 bg-white py-3.5 font-semibold text-slate-700 active:bg-slate-50"
        >
          문제 풀기로 건너뛰기
        </button>
      </div>

      {confirm === 'skip' && (
        <ConfirmModal
          title="문제 풀이로 넘어갈까요?"
          message="남은 개념 듣기 시간은 문제 풀이 시간에 더해져요."
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
    </div>
  )
}
