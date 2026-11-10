// 정답률 추이 꺾은선 그래프 (라이브러리 없이 SVG로 직접 그림)
// trend: [{ label: '월', accuracy: 0~100 }]
// SVG 좌표는 아래로 갈수록 y가 커지므로, 정답률이 높을수록 y가 작아지게(위로) 계산한다

// 그래프 크기와 여백 (viewBox 단위라 실제 화면에서는 폭에 맞게 늘어난다)
const WIDTH = 300
const HEIGHT = 140
const PAD_X = 16
const PAD_TOP = 28
const PAD_BOTTOM = 28

export default function AccuracyChart({ trend }) {
  const lastIndex = trend.length - 1
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM

  // 점 사이 가로 간격. 점이 하나면 가운데에 찍는다
  let step = 0
  if (trend.length > 1) {
    step = (WIDTH - PAD_X * 2) / (trend.length - 1)
  }

  const points = trend.map((item, index) => {
    let x = WIDTH / 2
    if (trend.length > 1) {
      x = PAD_X + step * index
    }
    const y = PAD_TOP + plotHeight * (1 - item.accuracy / 100)
    return { ...item, x, y }
  })

  // SVG path 문자열: 첫 점은 M(이동), 나머지는 L(선 긋기). 예: "M16,50 L83,40 L150,30"
  const path = points.map((p, index) => `${index === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  // 스크린리더용 설명 문구
  const summary = trend.map((item) => `${item.label} ${item.accuracy}%`).join(', ')

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`최근 학습 정답률: ${summary}`}
    >
      <line
        x1={PAD_X}
        x2={WIDTH - PAD_X}
        y1={HEIGHT - PAD_BOTTOM}
        y2={HEIGHT - PAD_BOTTOM}
        className="stroke-line"
        strokeWidth="1"
      />

      <path
        d={path}
        fill="none"
        className="stroke-primary"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((p, index) => {
        const isLast = index === lastIndex

        let valueClass = 'fill-muted text-label'
        if (isLast) {
          valueClass = 'fill-ink text-label font-bold'
        }

        return (
          <g key={index}>
            <circle
              cx={p.x}
              cy={p.y}
              r={isLast ? 6 : 4}
              className="fill-primary stroke-surface"
              strokeWidth="2"
            />
            <text x={p.x} y={p.y - 12} textAnchor="middle" className={valueClass}>
              {p.accuracy}%
            </text>
            <text x={p.x} y={HEIGHT - 8} textAnchor="middle" className="fill-muted text-label">
              {p.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
