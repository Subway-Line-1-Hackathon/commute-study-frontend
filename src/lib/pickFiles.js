import { UPLOAD } from './constants'

const FORMAT_ERROR = '지원하지 않는 파일 형식이에요. PDF, PPTX, PNG만 올릴 수 있어요.'
const SIZE_ERROR = `${UPLOAD.MAX_MB}MB 이하 파일만 올릴 수 있어요.`
const PNG_ERROR = `PNG는 한 번에 ${UPLOAD.MAX_PNG_PAGES}장까지 올릴 수 있어요.`
const COUNT_ERROR = `한 번에 자료 ${UPLOAD.MAX_PER_UPLOAD}개까지 올릴 수 있어요.`

export function pickFiles(picked, room) {
  const errors = []
  const docs = []
  let pngs = []

  for (const file of picked) {
    const ext = file.name.split('.').pop().toLowerCase()
    if (!UPLOAD.EXTENSIONS.includes(ext)) {
      errors.push(FORMAT_ERROR)
    } else if (file.size > UPLOAD.MAX_MB * 1024 * 1024) {
      errors.push(SIZE_ERROR)
    } else if (ext === 'png') {
      pngs.push(file)
    } else {
      docs.push(file)
    }
  }

  if (pngs.length > UPLOAD.MAX_PNG_PAGES) {
    errors.push(PNG_ERROR)
    pngs = []
  }
  pngs.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }))

  const groups = docs.map((file) => [file])
  if (pngs.length > 0) {
    groups.push(pngs)
  }

  if (groups.length > room) {
    errors.push(COUNT_ERROR)
  }

  return {
    groups: groups.slice(0, Math.max(0, room)),
    errors: [...new Set(errors)],
  }
}
