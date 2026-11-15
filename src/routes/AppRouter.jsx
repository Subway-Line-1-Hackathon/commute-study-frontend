import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import TabLayout from '../layouts/TabLayout'
import { ROUTES } from '../lib/constants'
import { RequireAuth, RequireActive } from './guards'
const S00Splash = lazy(() => import('../pages/S00Splash'))
const S01Login = lazy(() => import('../pages/S01Login'))
const S02Nickname = lazy(() => import('../pages/S02Nickname'))
const S04Commute = lazy(() => import('../pages/S04Commute'))
const S05Material = lazy(() => import('../pages/S05Material'))
const S10Waiting = lazy(() => import('../pages/S10Waiting'))
const S11UnitPreview = lazy(() => import('../pages/S11UnitPreview'))
const S20Home = lazy(() => import('../pages/S20Home'))
const S30Setup = lazy(() => import('../pages/S30Setup'))
const S32Review = lazy(() => import('../pages/S32Review'))
const S35Listen = lazy(() => import('../pages/S35Listen'))
const S40Player = lazy(() => import('../pages/S40Player'))
const S50Summary = lazy(() => import('../pages/S50Summary'))
const S51Report = lazy(() => import('../pages/S51Report'))
const S52WrongNotes = lazy(() => import('../pages/S52WrongNotes'))
const S60Settings = lazy(() => import('../pages/S60Settings'))
const S61CommuteEdit = lazy(() => import('../pages/S61CommuteEdit'))
const S62Account = lazy(() => import('../pages/S62Account'))
const S63SubjectManage = lazy(() => import('../pages/S63SubjectManage'))

// 인증 확인은 App에서 처리하고, 접근 조건은 라우트 그룹에 적용한다.
export default function AppRouter() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-center text-caption text-muted">
          화면을 불러오는 중…
        </p>
      }
    >
      <Routes>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.SPLASH} element={<S00Splash />} />
          <Route path={ROUTES.LOGIN} element={<S01Login />} />
          <Route element={<RequireAuth />}>
            <Route path={ROUTES.NICKNAME} element={<S02Nickname />} />
            <Route path={ROUTES.COMMUTE} element={<S04Commute />} />
          </Route>
          <Route element={<RequireActive />}>
            <Route path={ROUTES.SUBJECT_NEW} element={<S05Material />} />
            <Route path={ROUTES.MATERIAL_UPLOAD} element={<S10Waiting />} />
            <Route path={ROUTES.UNIT_PREVIEW} element={<S11UnitPreview />} />
            <Route path={ROUTES.LISTEN} element={<S35Listen />} />
            <Route path={ROUTES.SETUP} element={<S30Setup />} />
            <Route path={ROUTES.REVIEW} element={<S32Review />} />
            <Route path={ROUTES.PLAYER} element={<S40Player />} />
            <Route path={ROUTES.SUMMARY} element={<S50Summary />} />
            <Route path={ROUTES.SETTINGS_COMMUTE} element={<S61CommuteEdit />} />
            <Route path={ROUTES.SETTINGS_ACCOUNT} element={<S62Account />} />
            <Route path={ROUTES.SETTINGS_SUBJECTS} element={<S63SubjectManage />} />
            <Route element={<TabLayout />}>
              <Route path={ROUTES.HOME} element={<S20Home />} />
              <Route path={ROUTES.WRONG_NOTES} element={<S52WrongNotes />} />
              <Route path={ROUTES.REPORT} element={<S51Report />} />
              <Route path={ROUTES.SETTINGS} element={<S60Settings />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to={ROUTES.SPLASH} replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
