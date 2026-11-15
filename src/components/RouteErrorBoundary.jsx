import { Component } from 'react'
import Button from './Button'

// Suspense는 대기 중인 요청만 처리한다. 실패한 화면 모듈은 이 경계에서 복구를 안내한다.
export default class RouteErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main
        role="alert"
        className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <h1 className="text-title text-ink">화면을 불러오지 못했어요</h1>
        <p className="text-caption text-muted">연결을 확인한 뒤 새로고침해 주세요.</p>
        <Button onClick={() => window.location.reload()}>새로고침</Button>
      </main>
    )
  }
}
