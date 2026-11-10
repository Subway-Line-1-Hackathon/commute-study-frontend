import { NICKNAME_RULE } from './constants'

const RESERVED = ['관리자', '운영자', 'admin']
const PATTERN = /^[가-힣a-zA-Z0-9_]+$/

// 에러 메시지를 돌려주고, 문제가 없으면 빈 문자열
export function validateNickname(raw) {
  const value = raw.trim()
  if (value.length < NICKNAME_RULE.MIN || value.length > NICKNAME_RULE.MAX) {
    return `${NICKNAME_RULE.MIN}자 이상 ${NICKNAME_RULE.MAX}자 이하로 입력해 주세요.`
  }
  if (!PATTERN.test(value)) return '한글, 영문, 숫자, _만 사용할 수 있어요.'
  if (RESERVED.includes(value.toLowerCase())) return '사용할 수 없는 닉네임이에요.'
  return ''
}
