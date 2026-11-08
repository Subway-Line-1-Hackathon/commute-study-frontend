export default function Screen({ children, footer }) {
  return (
    <div className="flex min-h-dvh flex-col px-6 pt-12 pb-6">
      <main className="flex flex-1 flex-col">{children}</main>

      {footer && <div className="pt-6">{footer}</div>}
    </div>
  )
}
