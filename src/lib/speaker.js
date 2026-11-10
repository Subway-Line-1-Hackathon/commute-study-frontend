export const isSpeechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

// 기기에 있는 한국어 목소리 중 자연스러운 것을 먼저 고른다 (앞에 있을수록 우선)
const VOICE_PREFERENCE = [
  /SunHi.*Natural|Natural.*SunHi/i, // Edge
  /InJoon.*Natural|Natural.*InJoon/i, // Edge
  /Natural|Online/i, // 그 밖의 Microsoft 고품질 목소리
  /Yuna.*(Premium|Enhanced)|(Premium|Enhanced).*Yuna/i, // iOS/macOS 고품질
  /Google/i, // Chrome
  /Yuna/i, // iOS/macOS 기본
]

let cachedVoice

function pickVoice() {
  const voices = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang?.replace('_', '-').toLowerCase().startsWith('ko'))
  if (voices.length === 0) return null
  for (const re of VOICE_PREFERENCE) {
    const found = voices.find((v) => re.test(v.name))
    if (found) return found
  }
  return voices.find((v) => v.localService) ?? voices[0]
}

// 목소리 목록은 늦게 불러와지는 브라우저가 많아서, 바뀌면 다시 고른다
if (isSpeechSupported()) {
  cachedVoice = pickVoice()
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    cachedVoice = pickVoice()
  })
}

// 모든 발화는 여기서 만든다
function makeUtterance(text, rate = 1) {
  const u = new SpeechSynthesisUtterance(text)
  if (!cachedVoice) cachedVoice = pickVoice()
  if (cachedVoice) u.voice = cachedVoice
  u.lang = cachedVoice?.lang ?? 'ko-KR'
  u.rate = rate
  return u
}

// 한 번만 말하는 안내 (예: "곧 끝나요")
export function announce(text) {
  if (!isSpeechSupported()) return
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(makeUtterance(text))
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
    const u = makeUtterance(segments[i].text, rate)
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

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}

// 한 문장을 읽고 끝나면 onEnd. 반환값으로 취소(취소하면 onEnd는 부르지 않음)
export function speak(text, { onEnd, rate = 1 } = {}) {
  let cancelled = false
  const done = () => {
    if (!cancelled) onEnd?.()
  }
  if (!isSpeechSupported()) {
    // 음성을 못 읽는 브라우저: 글자 수로 읽는 시간을 대략 기다린다
    const id = setTimeout(done, Math.max(1500, text.length * 120))
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }
  window.speechSynthesis.cancel()
  const u = makeUtterance(text, rate)
  u.onend = done
  u.onerror = done
  // cancel 직후 바로 speak하면 무시되는 브라우저가 있어 잠깐 기다린다
  const id = setTimeout(() => !cancelled && window.speechSynthesis.speak(u), 80)
  return () => {
    cancelled = true
    clearTimeout(id)
    window.speechSynthesis.cancel()
  }
}
