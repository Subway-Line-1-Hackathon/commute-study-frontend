export default function Button({ type = 'button', className = '', ...props }) {
  return (
    <button
      type={type}
      {...props}
      className={`h-13 w-full rounded-button bg-primary font-semibold text-white active:brightness-95 disabled:opacity-40 ${className}`}
    />
  )
}
