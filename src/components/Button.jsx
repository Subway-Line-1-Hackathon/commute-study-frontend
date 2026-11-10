const VARIANT = {
  primary: 'bg-primary text-white',
  secondary: 'border border-line bg-surface text-ink',
}

export default function Button({ type = 'button', variant = 'primary', className = '', ...props }) {
  return (
    <button
      type={type}
      {...props}
      className={`h-13 w-full rounded-button font-semibold active:brightness-95 disabled:opacity-40 ${VARIANT[variant]} ${className}`}
    />
  )
}
