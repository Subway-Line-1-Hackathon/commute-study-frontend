const CHARS_PER_MIN = 350 // 한국어 TTS가 1분에 읽는 대략적인 글자 수

const TEMPLATES = [
  (t) =>
    `지금부터 ${t}의 핵심 흐름을 살펴볼게요. 전체 그림을 먼저 잡아두면 세부 내용이 훨씬 쉽게 들어와요.`,
  (t) =>
    `${t}에서 가장 먼저 기억할 것은 정의예요. 용어의 뜻을 정확히 구분해 두면 문제에서 헷갈리지 않아요.`,
  (t) => `다음은 ${t}의 대표적인 예시예요. 개념을 예시와 연결해서 떠올리면 오래 기억에 남아요.`,
  (t) =>
    `${t}에서 시험에 자주 나오는 부분은 비교 문제예요. 비슷한 개념의 차이를 한 문장으로 말해 보세요.`,
  (t) =>
    `${t}의 앞뒤 내용이 어떻게 이어지는지도 중요해요. 원인과 결과의 순서를 짚어 가며 들어 보세요.`,
  (t) => `${t}의 핵심을 한 번 더 정리할게요. 정의, 예시, 차이점 세 가지만 기억하면 충분해요.`,
]

// unit: { id, title }, targetSec: 개념 듣기 시간(초) -> [{ id, text, sourcePage }]
export function generateScript({ unit, targetSec }) {
  const targetChars = Math.round((targetSec / 60) * CHARS_PER_MIN)
  const segments = []
  let chars = 0
  let i = 0
  while (chars < targetChars) {
    const text = TEMPLATES[i % TEMPLATES.length](unit.title)
    segments.push({ id: `seg-${i}`, text, sourcePage: (i % 12) + 1 })
    chars += text.length
    i += 1
  }
  return segments
}
