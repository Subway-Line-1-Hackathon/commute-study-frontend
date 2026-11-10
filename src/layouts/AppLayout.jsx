import { Outlet } from 'react-router-dom'

// 모든 화면을 감싸는 레이아웃. 모바일 앱처럼 보이도록 최대 폭(max-w-md)을 두고 가운데 정렬한다
// <Outlet />에 현재 주소에 맞는 화면이 들어간다
export default function AppLayout() {
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-background">
      <Outlet />
    </div>
  )
}
