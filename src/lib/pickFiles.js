import { UPLOAD } from './constants'

const FORMAT_ERROR = '지원하지 않는 파일 형식이에요. PDF, PPTX, PNG만 올릴 수 있어요.'
const SIZE_ERROR = `${UPLOAD.MAX_MB}MB 이하 파일만 올릴 수 있어요.`
const PNG_ERROR = `PNG는 한 번에 ${UPLOAD.MAX_PNG_PAGES}장까지 올릴 수 있어요.`
const COUNT_ERROR = `한 번에 자료 ${UPLOAD.MAX_PER_UPLOAD}개까지 올릴 수 있어요.`

// 파일 선택창에서 고른 파일들을 검사하고 업로드 단위(묶음)로 나눈다
// - picked: 사용자가 고른 File 목록
// - room: 지금 더 올릴 수 있는 자료 개수
// - 반환: groups(업로드할 묶음 배열. PDF/PPTX는 파일 1개가 1묶음, PNG는 전부 합쳐 1묶음), errors(중복 제거된 에러 문구)
// 형식·용량이 맞지 않는 파일은 빼고 나머지만 올린다
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
  // PNG는 페이지 순서대로 올라가야 하므로 파일명 순으로 정렬한다 (numeric: "2.png"가 "10.png"보다 앞)
  pngs.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }))

  const groups = docs.map((file) => [file])
  if (pngs.length > 0) {
    groups.push(pngs)
  }

  // 남은 자리보다 많으면 앞에서부터 들어가는 만큼만 올린다
  if (groups.length > room) {
    errors.push(COUNT_ERROR)
  }

  return {
    groups: groups.slice(0, Math.max(0, room)),
    errors: [...new Set(errors)],
  }
}
