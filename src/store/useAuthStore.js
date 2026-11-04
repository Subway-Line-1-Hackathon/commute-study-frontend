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
      user: null,
      commute: null, // { oneWayMin, studyMin }

      loginWithGoogle: () => set({ status: AUTH_STATUS.AUTHENTICATED, user: MOCK_USER }),

      saveCommute: (oneWayMin) => {
        if (!isValidCommute(oneWayMin)) return false
        set({ commute: { oneWayMin, studyMin: calcStudyMinutes(oneWayMin) } })
        return true
      },

      activate: () => set({ status: AUTH_STATUS.ACTIVE }),

      logout: () => set({ status: AUTH_STATUS.ANONYMOUS, user: null, commute: null }),
    }),
    { name: 'cs:auth', storage: createJSONStorage(() => zustandStorage) },
  ),
)
