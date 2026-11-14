import listenIcon from '../../assets/icons/mode-listen.svg'
import readIcon from '../../assets/icons/mode-read.svg'
import { DIFFICULTY, QUESTION_TYPE as T, SOLVE_MODE as M } from '../../lib/constants'

export const MODE_OPTIONS = [
  {
    value: M.READ,
    icon: readIcon,
    title: '보면서 풀기',
    desc: '화면을 보며 풀어요. 앉아서 갈 때 좋아요.',
    types: ['O/X', '단답형', '객관식'],
  },
  {
    value: M.LISTEN,
    icon: listenIcon,
    title: '듣고 풀기',
    desc: '문제와 정답을 차례로 읽어 드려요.',
    types: ['O/X', '단답형'],
  },
]

export const TYPE_LABEL = {
  [M.READ]: { [T.OX]: 'O/X', [T.SHORT]: '단답형', [T.MCQ]: '객관식' },
  [M.LISTEN]: { [T.OX]: 'O/X', [T.SHORT]: '단답형' },
}

export const DEFAULT_TYPES = { [M.READ]: [T.MCQ], [M.LISTEN]: [T.OX] }

export const DIFFICULTY_OPTIONS = [
  { value: DIFFICULTY.EASY, label: '쉬움' },
  { value: DIFFICULTY.NORMAL, label: '보통' },
  { value: DIFFICULTY.HARD, label: '어려움' },
]
