// 여러 개 중 하나를 고르는 탭 모양 토글 (예: 눈으로 풀기 | 듣고 풀기)
// options: [{ value, label }], value: 지금 선택된 값
export default function SegmentedToggle({ options, value, onChange }) {
  const index = options.findIndex((opt) => opt.value === value)

  return (
    <div className="relative flex rounded-full border border-line bg-surface p-1">
      <span
        className="absolute inset-y-1 left-1 rounded-full bg-primary transition-transform duration-300 ease-out"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`relative flex-1 rounded-full py-2.5 text-caption font-medium transition-colors duration-300 ${
            value === opt.value ? 'text-white' : 'text-muted'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
