export default function Screen({ children, footer }) {
  return (
    <div className="flex min-h-dvh flex-col px-6 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))]">
      <main className="flex flex-1 flex-col">{children}</main>

      {footer && <div className="pt-6">{footer}</div>}
    </div>
  )
}