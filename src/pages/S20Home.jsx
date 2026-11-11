import { useNavigate } from 'react-router-dom'
import mascot from '../assets/mascot-cheer.png'
import Button from '../components/Button'
import CommuteCard from '../components/home/CommuteCard'
import FirstUploadCard from '../components/home/FirstUploadCard'
import LastStudyCard from '../components/home/LastStudyCard'
import ProcessingCard from '../components/home/ProcessingCard'
import ReviewCard from '../components/home/ReviewCard'
import { useHome } from '../hooks/useHome'
import Screen from '../layouts/Screen'
import { ROUTES } from '../lib/constants'
import { getSessionRoute } from '../store/useSessionStore'

export default function S20Home() {
  const navigate = useNavigate()
  const home = useHome()

  const startUnit = (unit) => {
    const draft = {
      source: 'categories',
      categoryIds: unit.categoryId != null ? [unit.categoryId] : [],
      unitId: unit.id,
      unitTitle: unit.title,
      subjectId: unit.subjectId,
    }
    navigate(ROUTES.SETUP, { state: { draft } })
  }

  const showLastStudy = !home.isFirst && (home.hasUnits || home.last)
  const showProcessing = home.pendingMaterials.length > 0 || home.preparingUnits.length > 0

  let bottomCta = null
  if (!home.isFirst) {
    bottomCta = (
      <Button variant="secondary" onClick={() => navigate(ROUTES.SUBJECT_NEW)}>
        새 파일 업로드
      </Button>
    )
  }

  return (
    <Screen withTabBar bottomCta={bottomCta}>
      <p className="text-caption text-muted">반가워요, {home.nickname}님!</p>
      <div className="mt-2 flex items-center gap-3">
        <img src={mascot} alt="" className="relative top-0.5 h-16 w-16 shrink-0" />
        <h1 className="text-title leading-snug whitespace-pre-line text-ink">
          {'오늘은 어떤 단원을\n공부할까요?'}
        </h1>
      </div>

      <div className="mt-4 space-y-3">
        <CommuteCard commute={home.commute} />

        {home.isFirst && <FirstUploadCard onClick={() => navigate(ROUTES.SUBJECT_NEW)} />}

        {showLastStudy && (
          <LastStudyCard
            home={home}
            onResume={() => navigate(getSessionRoute(home.resumable))}
            onCreate={() => navigate(ROUTES.UNIT_PREVIEW)}
            onReview={() => navigate(ROUTES.REVIEW)}
            onStartNext={startUnit}
          />
        )}

        {showProcessing && (
          <ProcessingCard materials={home.pendingMaterials} units={home.preparingUnits} />
        )}

        {home.openWrongCount > 0 && (
          <ReviewCard count={home.openWrongCount} onClick={() => navigate(ROUTES.WRONG_NOTES)} />
        )}
      </div>
    </Screen>
  )
}
