import BackButton from '../components/BackButton'

export default function Screen({ children, bottomCta, back }) {
  let backTo
  if (typeof back === 'string') {
    backTo = back
  }

  return (
    <div className="flex min-h-dvh flex-col px-6 pt-12 pb-6">
      <main className="flex flex-1 flex-col">
        {back && (
          <div className="relative -top-1 -mt-11 flex h-11 items-center">
            <BackButton to={backTo} />
          </div>
        )}
        {children}
      </main>

      {bottomCta && <div className="pt-6">{bottomCta}</div>}
    </div>
  )
}
