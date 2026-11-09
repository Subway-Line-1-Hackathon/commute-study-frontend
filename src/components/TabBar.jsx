import { NavLink } from 'react-router-dom'
import homeOff from '../assets/icons/tab-home-off.png'
import homeOn from '../assets/icons/tab-home-on.png'
import notesOff from '../assets/icons/tab-notes-off.png'
import notesOn from '../assets/icons/tab-notes-on.png'
import reportOff from '../assets/icons/tab-report-off.png'
import reportOn from '../assets/icons/tab-report-on.png'
import settingsOff from '../assets/icons/tab-settings-off.png'
import settingsOn from '../assets/icons/tab-settings-on.png'
import { ROUTES } from '../lib/constants'

const TABS = [
  { to: ROUTES.HOME, label: '홈', on: homeOn, off: homeOff },
  { to: ROUTES.WRONG_NOTES, label: '오답노트', on: notesOn, off: notesOff },
  { to: ROUTES.REPORT, label: '리포트', on: reportOn, off: reportOff },
  { to: ROUTES.SETTINGS, label: '설정', on: settingsOn, off: settingsOff },
]

export default function TabBar() {
  return (
    <nav className="sticky bottom-0 z-10 flex h-16 border-t border-line bg-surface">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          replace
          className="flex flex-1 flex-col items-center justify-center gap-1"
        >
          {({ isActive }) => (
            <>
              <img src={isActive ? tab.on : tab.off} alt="" className="h-6 w-6" />
              <span className={`text-label ${isActive ? 'text-primary' : 'text-muted'}`}>
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
