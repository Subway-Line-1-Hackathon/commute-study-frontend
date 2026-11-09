import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import AccuracyChart from '../components/report/AccuracyChart'
import FeedbackCard from '../components/report/FeedbackCard'
import StatTile from '../components/report/StatTile'
import { useReport } from '../hooks/useReport'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import { ROUTES } from '../lib/constants'
import { getFeedback, getHeadline } from '../lib/report'

export default function S51Report() {
  const navigate = useNavigate()
  const report = useReport()
  const hasRecord = report.trend.length > 0

  const bottomCta = (
    <Button onClick={() => navigate(ROUTES.REVIEW)} disabled={report.openWrongCount === 0}>
      오답노트 다시 풀기
    </Button>
  )

  return (
    <Screen withTabBar bottomCta={bottomCta}>
      <ScreenTitle title={getHeadline(report.trend)} />

      {hasRecord && (
        <Card title="최근 학습 정답률" className="mt-6">
          <AccuracyChart trend={report.trend} />
        </Card>
      )}

      <div className="mt-3 flex gap-2">
        <StatTile label="총 학습 시간" value={`${report.studyMin}분`} />
        <StatTile label="정답률" value={`${report.accuracy}%`} />
        <StatTile label="오답" value={`${report.wrongCount}개`} />
      </div>

      {hasRecord && <FeedbackCard message={getFeedback(report)} className="mt-3" />}
    </Screen>
  )
}
