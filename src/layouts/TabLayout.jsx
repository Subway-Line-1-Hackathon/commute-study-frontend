import { Outlet } from 'react-router-dom'
import TabBar from '../components/TabBar'

// 하단 탭바가 있는 화면(홈, 오답노트, 리포트, 설정)의 레이아웃
export default function TabLayout() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  )
}
