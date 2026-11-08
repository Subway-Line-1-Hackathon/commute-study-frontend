export default function TextField({
  label,
  required = false,
  invalid = false,
  className = '',
  ...props
}) {
  const input = (
    <input
      {...props}
      className={`h-13 w-full rounded-xl border bg-surface px-3.5 outline-none placeholder:text-placeholder placeholder:text-muted focus:ring-2 ${
        invalid ? 'border-danger focus:ring-danger/20' : 'border-line focus:ring-primary/20'
      } ${className}`}
    />
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
