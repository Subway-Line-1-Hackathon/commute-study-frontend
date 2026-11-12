import { useSwipe } from '../hooks/useSwipe'

const THRESHOLD = 90 // 이만큼(px) 밀면 답으로 인정

// 왼쪽으로 밀면 O, 오른쪽으로 밀면 X (아래 O/X 버튼 배치와 같은 방향)
export default function SwipeCard({ disabled, onSwipe, children }) {
  // strength: 0~1. 많이 밀수록 O/X 도장이 진하게 보인다
  const { dx, dragging, strength, handlers } = useSwipe({
    threshold: THRESHOLD,
    disabled,
    onLeft: () => onSwipe('O'),
    onRight: () => onSwipe('X'),
  })

  return (
    <div
      {...handlers}
      className={`relative select-none ${disabled ? '' : 'cursor-grab'}`}
      style={{
        touchAction: 'pan-y', // 세로 스크롤은 브라우저가, 가로 드래그는 이 컴포넌트가 처리
        // 민 만큼 카드를 옆으로 옮기고 살짝 기울인다
        transform: `translateX(${dx}px) rotate(${dx / 25}deg)`,
        transition: dragging ? 'none' : 'transform 0.2s',
      }}
    >
      {children}
      {/* 민 방향의 답을 카드 전체에 반투명하게 덮어 보여준다 (문제 글자·화살표 안내와 겹쳐 헷갈리지 않게) */}
      {dx !== 0 && (
        <div
          className={`pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl ${
            dx < 0 ? 'bg-green-50/90 text-green-600' : 'bg-red-50/90 text-red-500'
          }`}
          style={{ opacity: strength }}
        >
          <span className="text-6xl font-black">{dx < 0 ? 'O' : 'X'}</span>
        </div>
      )}
    </div>
  )
}
