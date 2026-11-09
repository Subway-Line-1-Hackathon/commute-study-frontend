import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import TabLayout from '../layouts/TabLayout'
import { ROUTES } from '../lib/constants'
import { RequireAuth, RequireActive } from './guards'
import S00Splash from '../pages/S00Splash'
import S01Login from '../pages/S01Login'
import S02Nickname from '../pages/S02Nickname'
import S04Commute from '../pages/S04Commute'
import S05Material from '../pages/S05Material'
import S10Waiting from '../pages/S10Waiting'
import S11UnitPreview from '../pages/S11UnitPreview'
import S20Home from '../pages/S20Home'
import S30Setup from '../pages/S30Setup'
import S32Review from '../pages/S32Review'
import S35Listen from '../pages/S35Listen'
import S40Player from '../pages/S40Player'
import S50Summary from '../pages/S50Summary'
import S51Report from '../pages/S51Report'
import S52WrongNotes from '../pages/S52WrongNotes'
import S60Settings from '../pages/S60Settings'

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path={ROUTES.SPLASH} element={<S00Splash />} />
        <Route path={ROUTES.LOGIN} element={<S01Login />} />

        <Route
          path={ROUTES.NICKNAME}
          element={
            <RequireAuth>
              <S02Nickname />
            </RequireAuth>
          }
        />
        <Route
          path={ROUTES.COMMUTE}
          element={
            <RequireAuth>
              <S04Commute />
            </RequireAuth>
          }
        />
        <Route
          path={ROUTES.SUBJECT_NEW}
          element={
            <RequireActive>
              <S05Material />
            </RequireActive>
          }
        />
        <Route
          path={ROUTES.MATERIAL_UPLOAD}
          element={
            <RequireActive>
              <S10Waiting />
            </RequireActive>
          }
        />
        <Route
          path={ROUTES.UNIT_PREVIEW}
          element={
            <RequireActive>
              <S11UnitPreview />
            </RequireActive>
          }
        />

        <Route
          path={ROUTES.LISTEN}
          element={
            <RequireActive>
              <S35Listen />
            </RequireActive>
          }
        />
        <Route
          path={ROUTES.SETUP}
          element={
            <RequireActive>
              <S30Setup />
            </RequireActive>
          }
        />
        <Route
          path={ROUTES.REVIEW}
          element={
            <RequireActive>
              <S32Review />
            </RequireActive>
          }
        />
        <Route
          path={ROUTES.PLAYER}
          element={
            <RequireActive>
              <S40Player />
            </RequireActive>
          }
        />
        <Route
          path={ROUTES.SUMMARY}
          element={
            <RequireActive>
              <S50Summary />
            </RequireActive>
          }
        />

        <Route element={<TabLayout />}>
          <Route
            path={ROUTES.HOME}
            element={
              <RequireActive>
                <S20Home />
              </RequireActive>
            }
          />
          <Route
            path={ROUTES.WRONG_NOTES}
            element={
              <RequireActive>
                <S52WrongNotes />
              </RequireActive>
            }
          />
          <Route
            path={ROUTES.REPORT}
            element={
              <RequireActive>
                <S51Report />
              </RequireActive>
            }
          />
          <Route
            path={ROUTES.SETTINGS}
            element={
              <RequireActive>
                <S60Settings />
              </RequireActive>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.SPLASH} replace />} />
      </Route>
    </Routes>
  )
}
