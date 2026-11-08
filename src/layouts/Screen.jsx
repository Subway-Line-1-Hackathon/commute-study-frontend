import BackButton from '../components/BackButton'

export default function Screen({ children, bottomCta, back }) {
  let backTo
  if (typeof back === 'string') {
    backTo = back
  }

  let bottomPadding = 'pb-6'
  if (bottomCta) {
    bottomPadding = ''
  }

  return (
    <div className={`flex min-h-dvh flex-col px-6 pt-12 ${bottomPadding}`}>
      <main className="flex flex-1 flex-col">
        {back && (
          <div className="relative -top-1 -mt-11 flex h-11 items-center">
            <BackButton to={backTo} />
          </div>
        )}
        {children}
      </main>

      {bottomCta && (
        <div className="sticky bottom-0 -mx-6 bg-gradient-to-t from-background from-80% to-transparent px-6 pt-6 pb-6">
          {bottomCta}
        </div>
      )}
    </div>
  )
}
