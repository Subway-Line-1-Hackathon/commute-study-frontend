import { Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from '../lib/constants'
import { RequireAuth, RequireActive } from './guards'
import S00Splash from '../pages/S00Splash'
import S10Waiting from '../pages/S10Waiting'
import Stub from '../pages/Stub'
import S01Login from '../pages/S01Login'
import S04Commute from '../pages/S04Commute'
import S05Material from '../pages/S05Material'

export default function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.SPLASH} element={<S00Splash />} />
      <Route path={ROUTES.LOGIN} element={<S01Login />} />

      <Route
        path={ROUTES.COMMUTE}
        element={
          <RequireAuth>
            <S04Commute />
          </RequireAuth>
        }
      />
      <Route
        path={ROUTES.MATERIAL}
        element={
          <RequireAuth>
            <S05Material />
          </RequireAuth>
        }
      />
      <Route
        path={ROUTES.WAITING}
        element={
          <RequireAuth>
            <S10Waiting />
          </RequireAuth>
        }
      />

      <Route
        path={ROUTES.HOME}
        element={
          <RequireActive>
            <Stub name="S-20 홈" />
          </RequireActive>
        }
      />
      <Route
        path={ROUTES.SETUP}
        element={
          <RequireActive>
            <Stub name="S-30 양식/난이도" />
          </RequireActive>
        }
      />
      <Route
        path={ROUTES.PLAYER}
        element={
          <RequireActive>
            <Stub name="S-40 학습 플레이어" />
          </RequireActive>
        }
      />
      <Route
        path={ROUTES.SUMMARY}
        element={
          <RequireActive>
            <Stub name="S-50 통학 후 요약" />
          </RequireActive>
        }
      />

      <Route path="*" element={<Navigate to={ROUTES.SPLASH} replace />} />
    </Routes>
  )
}
