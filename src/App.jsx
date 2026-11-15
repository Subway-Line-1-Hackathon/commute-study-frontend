// 모든 주소에 인증 확인과 저장 상태 안내를 적용한다.
import AppRouter from './routes/AppRouter'
import AuthBoundary from './components/AuthBoundary'
import StorageNotice from './components/StorageNotice'

export default function App() {
  return (
    <>
      <StorageNotice />
      <AuthBoundary>
        <AppRouter />
      </AuthBoundary>
    </>
  )
}
