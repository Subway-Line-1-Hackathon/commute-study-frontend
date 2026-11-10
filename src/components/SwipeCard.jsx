import { useRef, useState } from 'react'

const THRESHOLD = 90 // 이만큼(px) 밀면 답으로 인정

// 왼쪽으로 밀면 O, 오른쪽으로 밀면 X (아래 O/X 버튼 배치와 같은 방향)
export default function SwipeCard({ disabled, onSwipe, children }) {
  const [dx, setDx] = useState(0)
  const startX = useRef(null)
  const [dragging, setDragging] = useState(false)

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
  const handleUp = () => {
    if (startX.current === null) return
    startX.current = null
    setDragging(false)
    if (Math.abs(dx) >= THRESHOLD) onSwipe(dx < 0 ? 'O' : 'X')
    setDx(0)
  }

  const strength = Math.min(Math.abs(dx) / THRESHOLD, 1)

  return (
    <div
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      className={`relative select-none ${disabled ? '' : 'cursor-grab'}`}
      style={{
        touchAction: 'pan-y',
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
