import { useNavigate } from 'react-router-dom'

export default function BackButton({ to, label = '뒤로' }) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (to) navigate(to)
    else if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 py-2 text-sm font-medium text-slate-600 active:text-slate-900"
    >
      <span className="text-lg leading-none">‹</span>
      {label}
    </button>
  )
}
