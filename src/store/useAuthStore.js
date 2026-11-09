import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { AUTH_STATUS, COMMUTE, ROUTES } from '../lib/constants'
import { zustandStorage } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { clampCommute, isValidCommute } from '../lib/time'
import { MOCK_USER } from '../mocks/mockUser'

export const useAuthStore = create(
  persist(
    (set) => ({
      status: AUTH_STATUS.ANONYMOUS,
      user: null, // { id, name, email, provider, nickname }
      commute: null, // { studyMin, departure, arrival } 역 이름은 표시용
      activated: false, // 온보딩을 한 번이라도 끝냈는지

      // 구글 로그인. Supabase가 연결돼 있으면 구글 화면으로 이동하고 true를 돌려준다.
      // 키가 없으면 Mock 유저로 즉시 로그인한다 (이전에 저장된 계정 정보는 유지)
      loginWithGoogle: async () => {
        if (supabase) {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}${ROUTES.SPLASH}` },
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

      saveNickname: (nickname) => set((s) => ({ user: { ...s.user, nickname: nickname.trim() } })),

      // 입력한 시간이 그대로 학습 가능 시간
      saveCommute: ({ studyMin, departure = '', arrival = '' }) => {
        if (!isValidCommute(studyMin)) return false
        set({ commute: { studyMin, departure: departure.trim(), arrival: arrival.trim() } })
        return true
      },

      activate: () => set({ status: AUTH_STATUS.ACTIVE, activated: true }),

      // 로그인 상태만 해제. 닉네임, 통학 시간, 자료는 계정 데이터라 유지
      logout: () => {
        supabase?.auth.signOut()
        set({ status: AUTH_STATUS.ANONYMOUS })
      },
    }),
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
