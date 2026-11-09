import { Outlet } from 'react-router-dom'
import TabBar from '../components/TabBar'

export default function TabLayout() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  )
}
