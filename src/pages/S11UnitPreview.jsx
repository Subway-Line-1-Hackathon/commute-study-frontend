import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import UnitItem from '../components/UnitItem'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import { MATERIAL_STATUS as M, ROUTES } from '../lib/constants'
import { useMaterialStore } from '../store/useMaterialStore'

export default function S11UnitPreview() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const subjectId = params.get('subjectId')

  const subject = useMaterialStore((s) => s.subjects.find((item) => item.id === subjectId))
  const materials = useMaterialStore((s) => s.materials)

  if (!subject) {
    return <Navigate to={ROUTES.HOME} replace />
  }

  const readyMaterials = materials.filter((m) => m.subjectId === subjectId && m.status === M.READY)
  const units = readyMaterials.flatMap((m) => m.units)

  const bottomCta = (
    <>
      <Button onClick={() => navigate(ROUTES.HOME, { replace: true })}>홈으로</Button>
      <Button
        variant="secondary"
        onClick={() => navigate(`${ROUTES.MATERIAL_UPLOAD}?subjectId=${subjectId}`)}
        className="mt-3"
      >
        다른 자료 올리기
      </Button>
    </>
  )

  return (
    <Screen bottomCta={bottomCta}>
      <ScreenTitle title={`단원 ${units.length}개로 나눴어요`} />

      <span className="mt-3 self-start rounded-full bg-success-soft px-2.5 py-1 text-label text-success">
        READY
      </span>

      <ul className="mt-6 space-y-3">
        {units.map((unit, index) => (
          <UnitItem key={unit.id} number={index + 1} unit={unit} />
        ))}
      </ul>
    </Screen>
  )
}
