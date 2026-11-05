import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { AUTH_STATUS } from '../lib/constants'
import { zustandStorage } from '../lib/storage'
import { calcStudyMinutes, isValidCommute } from '../lib/time'
import { MOCK_USER } from '../mocks/mockUser'

export const useAuthStore = create(
  persist(
    (set) => ({
      status: AUTH_STATUS.ANONYMOUS,
      user: null, // { id, name, email, provider, nickname }
      commute: null, // { oneWayMin, studyMin }
      activated: false, // 온보딩을 한 번이라도 끝냈는지

      // 구글 OAuth 버튼 -> Mock 유저로 즉시 로그인 (이전에 저장된 계정 정보는 유지)
      loginWithGoogle: () =>
        set((s) => ({
          status: s.activated ? AUTH_STATUS.ACTIVE : AUTH_STATUS.AUTHENTICATED,
          user: s.user ?? MOCK_USER,
        })),

      saveNickname: (nickname) => set((s) => ({ user: { ...s.user, nickname: nickname.trim() } })),

      saveCommute: (oneWayMin) => {
        if (!isValidCommute(oneWayMin)) return false
        set({ commute: { oneWayMin, studyMin: calcStudyMinutes(oneWayMin) } })
        return true
      },

      activate: () => set({ status: AUTH_STATUS.ACTIVE, activated: true }),

      // 로그인 상태만 해제. 닉네임, 통학 시간, 자료는 계정 데이터라 유지
      logout: () => set({ status: AUTH_STATUS.ANONYMOUS }),
    }),
    { name: 'cs:auth', storage: createJSONStorage(() => zustandStorage) },
  ),
)
