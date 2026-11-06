export const isSpeechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

// 한 번만 말하는 안내 (예: "곧 끝나요")
export function announce(text) {
  if (!isSpeechSupported()) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ko-KR'
  window.speechSynthesis.speak(u)
}

export function createSpeaker({ onIndex, onFinish } = {}) {
  let segments = []
  let index = 0
  let rate = 1
  let playing = false
  let token = 0 // 취소된 발화가 뒤늦게 다음 문단을 읽지 않도록 구분

  const cancel = () => {
    token += 1
    if (isSpeechSupported()) window.speechSynthesis.cancel()
  }

  const speak = (i) => {
    cancel()
    if (i >= segments.length) {
      playing = false
      if (onFinish) onFinish()
      return
    }
    index = i
    if (onIndex) onIndex(i)
    const myToken = token
    const u = new SpeechSynthesisUtterance(segments[i].text)
    u.lang = 'ko-KR'
    u.rate = rate
    u.onend = () => {
      if (playing && myToken === token) speak(i + 1)
    }
    // cancel 직후 바로 speak하면 무시되는 브라우저가 있어 잠깐 기다린다
    setTimeout(() => {
      if (myToken === token) window.speechSynthesis.speak(u)
    }, 80)
  }

  return {
    load(list, startIndex = 0) {
      segments = list
      index = startIndex
    },
    play() {
      if (!isSpeechSupported()) return
      playing = true
      speak(index)
    },
    pause() {
      playing = false
      cancel()
    },
    stop() {
      playing = false
      cancel()
    },
    setRate(r) {
      rate = r
      if (playing) speak(index)
    },
    seek(i) {
      if (segments.length === 0) return
      index = Math.max(0, Math.min(i, segments.length - 1))
      if (playing) speak(index)
      else if (onIndex) onIndex(index)
    },
  }
}
