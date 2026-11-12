import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import ModeStep from '../components/setup/ModeStep'
import OptionStep from '../components/setup/OptionStep'
import PreparingView from '../components/setup/PreparingView'
import { DEFAULT_TYPES } from '../components/setup/options'
import Screen from '../layouts/Screen'
import { errorMessage } from '../lib/api'
import { COMMUTE, DIFFICULTY, ROUTES } from '../lib/constants'
import { useAuthStore } from '../store/useAuthStore'
import { getSessionRoute, useSessionStore } from '../store/useSessionStore'

export default function S30Setup() {
  const navigate = useNavigate()
  const draft = useLocation().state?.draft
  const studyMin = useAuthStore((s) => s.commute?.studyMin ?? COMMUTE.DEFAULT)

  const [mode, setMode] = useState(null)
  const [types, setTypes] = useState([])
  const [difficulty, setDifficulty] = useState(DIFFICULTY.NORMAL)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  if (!draft) return <Navigate to={ROUTES.HOME} replace />
  if (creating) return <PreparingView />

  const chooseMode = (value) => {
    setMode(value)
    setTypes(DEFAULT_TYPES[value])
  }

  const toggleType = (value) => {
    if (types.includes(value)) {
      setTypes(types.filter((t) => t !== value))
    } else {
      setTypes([...types, value])
    }
  }

  const handleStart = async () => {
    if (types.length === 0) return
    setCreating(true)
    setError('')
    try {
      const session = await useSessionStore
        .getState()
        .createSession({ draft, solveMode: mode, types, difficulty, studyMin })
      navigate(getSessionRoute(session), { replace: true })
    } catch (err) {
      setError(errorMessage(err, '문제를 만들지 못했어요. 잠시 후 다시 시도해 주세요.'))
      setCreating(false)
    }
  }

  if (!mode) {
    return (
      <Screen back>
        <ModeStep studyMin={studyMin} onSelect={chooseMode} />
      </Screen>
    )
  }

  const bottomCta = (
    <>
      {error && <p className="mb-2 text-center text-caption text-danger">{error}</p>}
      <Button onClick={handleStart} disabled={types.length === 0}>
        출발하기
      </Button>
    </>
  )

  return (
    <Screen back={() => setMode(null)} bottomCta={bottomCta}>
      <OptionStep
        mode={mode}
        studyMin={studyMin}
        types={types}
        difficulty={difficulty}
        onToggleType={toggleType}
        onChangeDifficulty={setDifficulty}
      />
    </Screen>
  )
}
