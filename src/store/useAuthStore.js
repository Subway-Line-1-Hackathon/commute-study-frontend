import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { AUTH_STATUS, COMMUTE, ROUTES } from '../lib/constants'
import { getMe, saveSettings, withdraw as apiWithdraw } from '../lib/endpoints'
import { resetUserData } from './resetUserData'
import { zustandStorage } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { clampCommute, isValidCommute } from '../lib/time'
import { MOCK_USER } from '../mocks/mockUser'

// 로그인·사용자 정보 전역 스토어 (zustand)
// - 화면에서는 useAuthStore((s) => s.status)처럼 필요한 값만 골라 구독한다
// - persist로 localStorage('cs:auth')에 저장돼서 새로고침해도 로그인 상태가 유지된다
// - supabase가 null이면(키 없음) 서버 없이 Mock 데이터로 동작한다
export const useAuthStore = create(
  persist(
    (set) => ({
      status: AUTH_STATUS.ANONYMOUS, // 로그인/온보딩 단계 (constants.js의 AUTH_STATUS)
      user: null, // { id, name, email, provider, nickname }
      commute: null, // { studyMin, departure, arrival } 역 이름은 표시용
      activated: false, // 온보딩을 한 번이라도 끝냈는지

      // 구글 로그인. Supabase가 연결돼 있으면 구글 화면으로 이동하고 true를 돌려준다.
      // 키가 없으면 Mock 유저로 즉시 로그인한다 (이전에 저장된 계정 정보는 유지)
      loginWithGoogle: async () => {
        if (supabase) {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}${ROUTES.SPLASH}`,
              queryParams: { prompt: 'select_account' },
            },
          })
          if (error) throw error
          return true
        }
        set((s) => ({
          status: s.activated ? AUTH_STATUS.ACTIVE : AUTH_STATUS.AUTHENTICATED,
          user: s.user ?? MOCK_USER,
        }))
        return false
      },

      // Supabase 세션을 store에 반영한다. 다른 계정이면 온보딩 정보를 초기화한다
      applySession: (session) => {
        if (!session) {
          set({ status: AUTH_STATUS.ANONYMOUS })
          return
        }
        const { user: authUser } = session
        set((s) => {
          const sameUser = s.user?.id === authUser.id
          const activated = sameUser && s.activated
          return {
            status: activated ? AUTH_STATUS.ACTIVE : AUTH_STATUS.AUTHENTICATED,
            activated,
            commute: sameUser ? s.commute : null,
            user: {
              id: authUser.id,
              email: authUser.email,
              name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? '',
              provider: 'google',
              nickname: sameUser ? s.user.nickname : undefined,
            },
          }
        })
      },

      // 닉네임만 store에 저장 (서버 저장은 saveProfile에서 통학 시간과 함께 한다)
      saveNickname: (nickname) => set((s) => ({ user: { ...s.user, nickname: nickname.trim() } })),

      // 통학 설정을 store에만 저장한다. 범위를 벗어나면 저장하지 않고 false
      // 입력한 시간이 그대로 학습 가능 시간
      saveCommute: ({ studyMin, departure = '', arrival = '' }) => {
        if (!isValidCommute(studyMin)) return false
        set({ commute: { studyMin, departure: departure.trim(), arrival: arrival.trim() } })
        return true
      },

      // 닉네임과 통학 설정을 서버에 저장하고 store에도 반영한다.
      // 서버는 닉네임과 통학 시간을 한 번에 받는다. Mock 모드면 store에만 저장한다
      saveProfile: async ({ nickname, studyMin, departure = '', arrival = '' }) => {
        if (!isValidCommute(studyMin)) return false
        let savedMin = studyMin
        if (supabase) {
          const res = await saveSettings({
            nickname: nickname.trim(),
            oneWayMin: studyMin,
            fromStation: departure.trim() || undefined,
            toStation: arrival.trim() || undefined,
          })
          // 서버가 보정한 학습 시간을 돌려주면 그 값을 쓴다
          savedMin = res?.studyMin ?? studyMin
        }
        set((s) => ({
          user: { ...s.user, nickname: nickname.trim() },
          commute: { studyMin: savedMin, departure: departure.trim(), arrival: arrival.trim() },
        }))
        return true
      },

      // 서버의 내 정보로 닉네임·통학 설정·온보딩 상태를 맞춘다. 처음 부르면 서버가 사용자를 만든다
      syncMe: async () => {
        if (!supabase) return
        const me = await getMe()
        const settings = me?.settings
        set((s) => {
          const activated = me?.status === AUTH_STATUS.ACTIVE
          const patch = {
            status: activated ? AUTH_STATUS.ACTIVE : AUTH_STATUS.AUTHENTICATED,
            activated,
            user: { ...s.user, nickname: me?.nickname ?? s.user?.nickname },
          }
          if (settings) {
            // 서버 필드명(oneWayMin, fromStation, toStation)을 화면 필드명으로 바꾼다
            patch.commute = {
              studyMin: settings.studyMin ?? settings.oneWayMin,
              departure: settings.fromStation ?? '',
              arrival: settings.toStation ?? '',
            }
          }
          return patch
        })
      },

      // 온보딩 완료 처리 -> 이후 RequireActive 화면(홈 등)에 들어갈 수 있다
      activate: () => set({ status: AUTH_STATUS.ACTIVE, activated: true }),

      // 로그인 상태만 해제. 닉네임, 통학 시간, 자료는 계정 데이터라 유지
      logout: async () => {
        if (supabase) await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        set({ status: AUTH_STATUS.ANONYMOUS })
      },

      // 회원 탈퇴: 서버에서 계정·학습 기록을 지우고, 기기에 남은 데이터도 모두 비운 뒤 로그아웃한다
      // 서버 삭제가 실패하면 에러를 던지고 아무것도 지우지 않는다 (다시 시도 가능)
      withdraw: async () => {
        if (supabase) {
          await apiWithdraw()
          await supabase.auth.signOut().catch(() => {})
        }
        resetUserData()
        set({ status: AUTH_STATUS.ANONYMOUS, user: null, commute: null, activated: false })
      },
    }),
    // persist 설정: localStorage 키 이름, 저장 형식 버전, 버전이 바뀌었을 때 옛 데이터를 변환하는 migrate
    {
      name: 'cs:auth',
      version: 1,
      // v0은 편도 시간(oneWayMin)을 저장했다. 그 값을 학습 가능 시간으로 옮긴다
      migrate: (persisted, version) => {
        if (version >= 1 || !persisted.commute) return persisted
        const studyMin = clampCommute(persisted.commute.oneWayMin ?? COMMUTE.DEFAULT)
        return { ...persisted, commute: { studyMin, departure: '', arrival: '' } }
      },
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
)
