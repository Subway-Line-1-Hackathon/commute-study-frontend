import BackButton from '../components/BackButton'

export default function Stub({ name, back }) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 py-4">
      <BackButton to={back} />
      <div className="mt-40 text-center">
        <p className="text-lg font-semibold text-slate-600">{name} (준비 중)</p>
      </div>
    </div>
  )
}
