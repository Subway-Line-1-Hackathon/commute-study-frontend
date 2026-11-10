import { useNavigate } from 'react-router-dom'

// 뒤로가기 버튼
// to가 있으면 그 주소로, 없으면 브라우저 뒤로가기, 뒤로 갈 기록이 없으면(링크로 바로 들어온 경우) 첫 화면으로
export default function BackButton({ to }) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (to) navigate(to)
    else if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="뒤로"
      className="-ml-3 flex h-11 w-11 items-center justify-center text-[2rem] leading-none text-muted active:text-ink"
    >
      ‹
    </button>
  )
}
