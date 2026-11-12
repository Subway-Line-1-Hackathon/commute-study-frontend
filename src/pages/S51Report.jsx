import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import AccuracyChart from '../components/report/AccuracyChart'
import FeedbackCard from '../components/report/FeedbackCard'
import StatTile from '../components/report/StatTile'
import { REPORT_STATUS, useReport } from '../hooks/useReport'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import { ROUTES } from '../lib/constants'
import { getFeedback, getHeadline } from '../lib/report'

// S51 리포트 탭: 최근 정답률 그래프, 오늘 학습 시간·정답률·오답 수, AI 피드백
// 계산은 hooks/useReport.js와 lib/report.js에서 한다
export default function S51Report() {
  const navigate = useNavigate()
  const report = useReport()
  const loading = report.status === REPORT_STATUS.LOADING
  const failed = report.status === REPORT_STATUS.ERROR
  const hasRecord = report.status === REPORT_STATUS.OK && report.trend.length > 0

  let headline = getHeadline(report.trend)
  if (loading) headline = '기록을 불러오고 있어요'
  if (failed) headline = '기록을 불러오지 못했어요'

  // 서버 기록을 받기 전·실패 시에는 숫자 대신 '-'
  const statValue = (text) => (report.status === REPORT_STATUS.OK ? text : '-')

  const bottomCta = (
    <Button onClick={() => navigate(ROUTES.REVIEW)} disabled={report.openWrongCount === 0}>
      오답노트 다시 풀기
    </Button>
  )

  return (
    <Screen withTabBar bottomCta={bottomCta}>
      <ScreenTitle title={headline} />

      <Card title="최근 학습 정답률" className="mt-6">
        {hasRecord && <AccuracyChart trend={report.trend} />}
        {loading && <p className="py-10 text-center text-caption text-muted">불러오는 중…</p>}
        {failed && (
          <div className="py-6 text-center">
            <p className="text-caption text-muted">네트워크를 확인하고 다시 시도해 주세요.</p>
            <button
              type="button"
              onClick={report.reload}
              className="mt-2 text-caption font-bold text-primary"
            >
              다시 시도
            </button>
          </div>
        )}
        {report.status === REPORT_STATUS.OK && !hasRecord && (
          <p className="py-10 text-center text-caption text-muted">
            통학 학습을 하면 정답률 그래프가 생겨요.
          </p>
        )}
      </Card>

      <div className="mt-3 flex gap-2">
        <StatTile
          label="전체 평균"
          value={statValue(report.average == null ? '-' : `${report.average}%`)}
        />
        <StatTile label="정답률" value={statValue(`${report.accuracy}%`)} />
        <StatTile label="오답" value={statValue(`${report.wrongCount}개`)} />
      </div>

      {hasRecord && <FeedbackCard message={getFeedback(report)} className="mt-3" />}
    </Screen>
  )
}
