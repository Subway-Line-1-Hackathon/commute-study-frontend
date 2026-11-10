// 화면 상단 큰 제목과 설명 문구. title 안의 \n은 줄바꿈으로 보인다 (whitespace-pre-line)
export default function ScreenTitle({ title, description }) {
  return (
    <div>
      <h1 className="text-title whitespace-pre-line text-ink">{title}</h1>

      {description && <p className="mt-2 text-caption text-muted">{description}</p>}
    </div>
  )
}
