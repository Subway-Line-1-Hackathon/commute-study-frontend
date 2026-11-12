// 선택/해제할 수 있는 동그란 태그 버튼 (문제 유형 고르기 등). selected면 파랗게 채워진다
export default function Chip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-4 py-2 text-caption font-medium ${
        selected ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink'
      }`}
    >
      {label}
    </button>
  )
}
