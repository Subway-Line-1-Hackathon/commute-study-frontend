import { useRef, useState } from 'react'

const THRESHOLD = 90 // 이만큼(px) 밀면 답으로 인정

// 왼쪽으로 밀면 O, 오른쪽으로 밀면 X (아래 O/X 버튼 배치와 같은 방향)
export default function SwipeCard({ disabled, onSwipe, children }) {
  const [dx, setDx] = useState(0) // 손가락이 처음 위치에서 가로로 움직인 거리(px). 음수면 왼쪽
  const startX = useRef(null) // 누르기 시작한 x좌표 (누르고 있지 않으면 null)
  const [dragging, setDragging] = useState(false) // 끄는 중에는 애니메이션을 꺼서 손가락을 바로 따라오게

  // 누르기 시작. setPointerCapture로 손가락이 카드 밖으로 나가도 이벤트를 계속 받는다
  const handleDown = (e) => {
    if (disabled) return
    startX.current = e.clientX
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const handleMove = (e) => {
    if (startX.current === null) return
    setDx(e.clientX - startX.current)
  }
  // 손을 뗌: 충분히 밀었으면 답 제출, 아니면 제자리로 돌아간다
  const handleUp = () => {
    if (startX.current === null) return
    startX.current = null
    setDragging(false)
    if (Math.abs(dx) >= THRESHOLD) onSwipe(dx < 0 ? 'O' : 'X')
    setDx(0)
  }

  // 0~1. 많이 밀수록 O/X 도장이 진하게 보인다
  const strength = Math.min(Math.abs(dx) / THRESHOLD, 1)

  return (
    <div
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      className={`relative select-none ${disabled ? '' : 'cursor-grab'}`}
      style={{
        touchAction: 'pan-y', // 세로 스크롤은 브라우저가, 가로 드래그는 이 컴포넌트가 처리
        // 민 만큼 카드를 옆으로 옮기고 살짝 기울인다
        transform: `translateX(${dx}px) rotate(${dx / 25}deg)`,
        transition: dragging ? 'none' : 'transform 0.2s',
      }}
    >
      {children}
      {dx !== 0 && (
        <span
          className={`pointer-events-none absolute top-4 rounded-lg border-4 px-3 py-1 text-3xl font-black ${
            dx < 0
              ? 'right-4 rotate-12 border-green-500 text-green-500'
              : 'left-4 -rotate-12 border-red-500 text-red-500'
          }`}
          style={{ opacity: strength }}
        >
          {dx < 0 ? 'O' : 'X'}
        </span>
      )}
    </div>
  )
}
