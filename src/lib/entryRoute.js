import { AUTH_STATUS, ROUTES } from './constants'

export function getEntryRoute({ auth, materials, subjects }) {
  if (auth.status === AUTH_STATUS.ANONYMOUS) return ROUTES.LOGIN
  if (auth.status === AUTH_STATUS.ACTIVE) return ROUTES.HOME

  if (!auth.commute) return ROUTES.COMMUTE
  if (!subjects.length || !materials.length) return ROUTES.MATERIAL
  return ROUTES.WAITING
}
