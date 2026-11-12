import { useNavigate } from 'react-router-dom'
import mascot from '../assets/mascot-default.png'
import Button from '../components/Button'
import CommuteCard from '../components/home/CommuteCard'
import FirstUploadCard from '../components/home/FirstUploadCard'
import LastStudyCard from '../components/home/LastStudyCard'
import ReviewCard from '../components/home/ReviewCard'
import { useHome } from '../hooks/useHome'
import Screen from '../layouts/Screen'
import { ROUTES } from '../lib/constants'
import { getSessionRoute } from '../store/useSessionStore'

export default function S20Home() {
  const navigate = useNavigate()
  const home = useHome()

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
      <div className="flex items-center gap-3">
        <img src={mascot} alt="" className="h-12 w-12" />
        <h1 className="text-title whitespace-pre-line text-ink">
          {'오늘은 어떤 단원을\n공부할까요?'}
        </h1>
      </div>
      <p className="mt-2 text-caption text-muted">
        {home.nickname}님, 오늘도 통학길 학습 시작해요.
      </p>

      <div className="mt-6 space-y-3">
        <CommuteCard commute={home.commute} />

        {home.isFirst ? (
          <FirstUploadCard onClick={() => navigate(ROUTES.SUBJECT_NEW)} />
        ) : (
          <LastStudyCard
            home={home}
            onResume={() => navigate(getSessionRoute(home.resumable))}
            onCreate={() => navigate(ROUTES.UNIT_PREVIEW)}
            onReview={() => navigate(ROUTES.REVIEW)}
          />
        )}

        {home.openWrongCount > 0 && (
          <ReviewCard count={home.openWrongCount} onClick={() => navigate(ROUTES.WRONG_NOTES)} />
        )}
      </div>
    </Screen>
  )
}
