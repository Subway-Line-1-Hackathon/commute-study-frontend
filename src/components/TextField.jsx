// 공통 입력칸. label이 있으면 위에 이름을 붙이고, invalid면 빨간 테두리
// value, onChange, placeholder 등 나머지 props는 그대로 <input>에 전달된다
export default function TextField({
  label,
  required = false,
  invalid = false,
  className = '',
  ...props
}) {
  // 빈 날짜는 안내 문구를 보여주고, 포커스 중에는 기본 연·월·일 입력을 표시한다.
  const isEmptyDate = props.type === 'date' && !props.value

  const input = (
    <div className="relative">
      <input
        {...props}
        className={`peer h-13 w-full rounded-button border bg-surface px-3.5 outline-none placeholder:text-placeholder placeholder:text-muted focus:ring-2 ${
          invalid ? 'border-danger focus:ring-danger/20' : 'border-line focus:ring-primary/20'
        } ${isEmptyDate ? 'text-transparent focus:text-ink' : ''} ${className}`}
      />

      {isEmptyDate && (
        <span
          className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-placeholder text-muted peer-focus:hidden"
          aria-hidden="true"
        >
          {props.placeholder ?? '날짜를 선택해 주세요'}
        </span>
      )}
    </div>
  )

  if (!label) return input

  return (
    <label className="block">
      <span className="mb-2 block text-caption font-bold text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </span>
      {input}
    </label>
  )
}
