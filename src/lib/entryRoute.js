import { AUTH_STATUS, ROUTES } from './constants'

export function getEntryRoute({ auth }) {
  if (auth.status === AUTH_STATUS.ANONYMOUS) return ROUTES.LOGIN
  if (auth.status === AUTH_STATUS.ACTIVE) return ROUTES.HOME
  if (!auth.user?.nickname) return ROUTES.NICKNAME
  return ROUTES.COMMUTE
}
