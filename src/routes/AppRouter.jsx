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

// 전체 화면 라우팅 표
// 화면 이름 S00~S60은 기획서의 화면 번호와 같다
// - RequireAuth: 로그인만 되어 있으면 통과 (온보딩: 닉네임, 통학 시간)
// - RequireActive: 온보딩까지 끝난 ACTIVE 유저만 통과 (홈, 학습 화면)
// - TabLayout 안의 화면만 하단 탭바가 보인다
export default function AppRouter() {
  return (
    <Routes>
      {/* 모든 화면을 감싸는 공통 레이아웃 (모바일 폭 고정) */}
      <Route element={<AppLayout />}>
        {/* 누구나 들어올 수 있는 화면 */}
        <Route path={ROUTES.SPLASH} element={<S00Splash />} />
        <Route path={ROUTES.LOGIN} element={<S01Login />} />

        {/* 온보딩: 로그인만 필요 */}

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
        {/* 과목·자료 등록 흐름: 과목 만들기 -> 업로드/분석 대기 -> 단원 미리보기 */}
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

        {/* 학습 흐름: 개념 듣기 -> 문제 설정 -> (복습) -> 문제 풀이 -> 결과 요약 */}
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

        {/* 하단 탭바가 있는 화면: 홈 / 오답노트 / 리포트 / 설정 */}
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

        {/* 없는 주소는 스플래시로 보낸다 (스플래시가 상태에 맞는 화면으로 다시 보냄) */}
        <Route path="*" element={<Navigate to={ROUTES.SPLASH} replace />} />
      </Route>
    </Routes>
  )
}
