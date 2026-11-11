// AI가 만든 글에 섞인 마크다운 기호를 지운다 (화면 표시·음성 읽기 공용)
// **굵게**, *기울임*, ~~취소선~~, `코드`, # 제목, > 인용, - 목록, [글자](주소)
export function stripMarkdown(text) {
  if (text == null) return text
  return String(text)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // [글자](주소) -> 글자
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // # 제목
    .replace(/^\s*>\s?/gm, '') // > 인용
    .replace(/^\s*[-*+•]\s+/gm, '') // - 목록
    .replace(/\*\*|__|~~|`/g, '') // 굵게·취소선·코드 기호
    .replace(/(^|[^\w*])\*(?!\s)([^*\n]+?)\*(?!\w)/g, '$1$2') // *기울임*
}

// "(2쪽)", "(2~3쪽)" 같은 쪽수 표기를 지운다
export const stripPageRefs = (text) =>
  text == null ? text : String(text).replace(/\s*\(\s*\d+\s*(?:[-~–]\s*\d+\s*)?쪽\s*\)/g, '')
