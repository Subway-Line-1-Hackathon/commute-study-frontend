import { UPLOAD } from './constants'

const FORMAT_ERROR = '지원하지 않는 파일 형식이에요. PDF, PPTX, PNG, JPG만 올릴 수 있어요.'
const HEIC_ERROR = 'HEIC 사진은 올릴 수 없어요. JPG로 바꿔서 올려 주세요.'
const SIZE_ERROR = `${UPLOAD.MAX_MB}MB 이하 파일만 올릴 수 있어요.`
const IMAGE_ERROR = `사진은 한 번에 ${UPLOAD.MAX_IMAGE_PAGES}장까지 올릴 수 있어요.`
const COUNT_ERROR = `한 번에 자료 ${UPLOAD.MAX_PER_UPLOAD}개까지 올릴 수 있어요.`

// 파일 선택창에서 고른 파일들을 검사하고 업로드 단위(묶음)로 나눈다
// - picked: 사용자가 고른 File 목록
// - room: 지금 더 올릴 수 있는 자료 개수
// - 반환: groups(업로드할 묶음 배열. PDF/PPTX는 파일 1개가 1묶음, 사진(PNG·JPG)은 전부 합쳐 1묶음), errors(중복 제거된 에러 문구)
// 형식·용량이 맞지 않는 파일은 빼고 나머지만 올린다
export function pickFiles(picked, room) {
  const errors = []
  const docs = []
  let images = []

  for (const file of picked) {
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'heic' || ext === 'heif') {
      errors.push(HEIC_ERROR)
    } else if (!UPLOAD.EXTENSIONS.includes(ext)) {
      errors.push(FORMAT_ERROR)
    } else if (file.size > UPLOAD.MAX_MB * 1024 * 1024) {
      errors.push(SIZE_ERROR)
    } else if (UPLOAD.IMAGE_EXTENSIONS.includes(ext)) {
      images.push(file)
    } else {
      docs.push(file)
    }
  }

  if (images.length > UPLOAD.MAX_IMAGE_PAGES) {
    errors.push(IMAGE_ERROR)
    images = []
  }
  // 사진은 보낸 순서가 쪽 순서라 파일명 순으로 정렬한다 (numeric: "2.jpg"가 "10.jpg"보다 앞)
  images.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }))

  const groups = docs.map((file) => [file])
  if (images.length > 0) {
    groups.push(images)
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
