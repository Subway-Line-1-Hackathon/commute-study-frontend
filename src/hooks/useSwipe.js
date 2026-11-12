import { useRef, useState } from 'react'

export function useSwipe({ threshold = 80, disabled = false, onLeft, onRight }) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(null)

  const onPointerDown = (e) => {
    if (disabled) return
    startX.current = e.clientX
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e) => {
    if (startX.current === null) return
    setDx(e.clientX - startX.current)
  }

  const onPointerUp = () => {
    if (startX.current === null) return
    startX.current = null
    setDragging(false)
    if (dx <= -threshold) onLeft?.()
    if (dx >= threshold) onRight?.()
    setDx(0)
  }

  return {
    dx,
    dragging,
    strength: Math.min(Math.abs(dx) / threshold, 1),
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  }
}
