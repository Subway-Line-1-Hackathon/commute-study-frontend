const TONE = {
  primary: 'bg-primary/10 text-primary',
  white: 'bg-surface text-primary',
  neutral: 'bg-background text-muted',
  warning: 'bg-warning-soft text-warning',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
}

const SIZE = {
  md: 'px-2.5 py-1 text-caption font-bold',
  sm: 'px-2 py-0.5 text-label',
}

export default function Tag({
  tone = 'primary',
  size = 'md',
  pill = false,
  className = '',
  children,
}) {
  const shape = pill ? 'rounded-full' : 'rounded-chip'

  return (
    <span className={`inline-block ${shape} ${SIZE[size]} ${TONE[tone]} ${className}`}>
      {children}
    </span>
  )
}
