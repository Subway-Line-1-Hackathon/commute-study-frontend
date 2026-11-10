import BackButton from '../components/BackButton'

// 화면 하나의 기본 틀 (여백, 뒤로가기 버튼, 하단 고정 버튼)
// - bottomCta: 화면 아래에 붙어 있는 버튼 영역 (스크롤해도 따라옴)
// - back: true면 브라우저 뒤로가기, 문자열이면 그 주소로 이동하는 뒤로가기 버튼
// - withTabBar: 하단 탭바가 있는 화면이면 탭바 높이(4rem)만큼 피해서 배치
export default function Screen({ children, bottomCta, back, withTabBar = false }) {
  let backTo
  if (typeof back === 'string') {
    backTo = back
  }

  let bottomPadding = 'pb-6'
  if (bottomCta) {
    bottomPadding = ''
  }

  let minHeight = 'min-h-dvh'
  let ctaBottom = 'bottom-0'
  if (withTabBar) {
    minHeight = 'min-h-[calc(100dvh-4rem)]'
    ctaBottom = 'bottom-16'
  }

  return (
    <div className={`flex ${minHeight} flex-col px-6 pt-12 ${bottomPadding}`}>
      <main className="flex flex-1 flex-col">
        {back && (
          <div className="relative -top-1 -mt-11 flex h-11 items-center">
            <BackButton to={backTo} />
          </div>
        )}
        {children}
      </main>

      {bottomCta && (
        <div
          className={`sticky ${ctaBottom} -mx-6 bg-gradient-to-t from-background from-80% to-transparent px-6 pt-6 pb-6`}
        >
          {bottomCta}
        </div>
      )}
    </div>
  )
}
