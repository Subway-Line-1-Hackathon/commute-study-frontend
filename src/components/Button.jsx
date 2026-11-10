const VARIANT = {
  primary: 'bg-primary text-white',
  secondary: 'border border-line bg-surface text-ink',
}

// 공통 버튼 (가로 꽉 참). variant: primary(파란 배경) | secondary(테두리)
// onClick, disabled 등 나머지 props는 그대로 <button>에 전달된다
export default function Button({ type = 'button', variant = 'primary', className = '', ...props }) {
  return (
    <button
      type={type}
      {...props}
      className={`h-13 w-full rounded-button font-semibold active:brightness-95 disabled:opacity-40 ${VARIANT[variant]} ${className}`}
    />
  )
}
