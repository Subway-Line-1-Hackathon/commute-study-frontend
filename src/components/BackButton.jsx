import { useNavigate } from 'react-router-dom'

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
