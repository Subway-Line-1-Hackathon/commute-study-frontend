// 최상위 컴포넌트. 지금은 라우터만 렌더링한다
// (전역 Provider나 모달이 필요해지면 여기에 감싼다)
import AppRouter from './routes/AppRouter'

export default function App() {
  return <AppRouter />
}
