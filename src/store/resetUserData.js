import { useMaterialStore } from './useMaterialStore'
import { useSessionStore } from './useSessionStore'

// 기기에 저장된 계정 데이터(자료·학습 기록)를 비운다
// cs:materials, cs:session은 계정 구분 없이 localStorage에 저장되기 때문에
// 다른 계정으로 로그인하거나 탈퇴했을 때 호출한다
export function resetUserData() {
  useMaterialStore.setState({ subjects: [], materials: [], categories: {}, serverMaterials: [] })
  useSessionStore.setState({
    current: null,
    history: [],
    wrongNotes: [],
    unitProgress: {},
    dailyStats: {},
    pendingAttempts: [],
  })
}
