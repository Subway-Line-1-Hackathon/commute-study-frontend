// 브라우저 내장 TTS(Web Speech API, speechSynthesis)로 글을 소리 내어 읽는 유틸
// - announce: 짧은 안내 한 번
// - createSpeaker: 여러 문단을 이어 읽는 플레이어 (개념 듣기 화면)
// - speak: 한 문장 읽고 끝나면 콜백 (듣고 풀기 화면)

import { stripMarkdown, stripPageRefs } from './text'

// 이 브라우저가 음성 읽기를 지원하는지
export const isSpeechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

// 기기에 있는 한국어 목소리 중 자연스러운 것을 먼저 고른다
const VOICE_PREFERENCE = [
  /SunHi.*Natural|Natural.*SunHi/i, // Edge
  /InJoon.*Natural|Natural.*InJoon/i, // Edge
  /Natural|Online/i, // 그 밖의 Microsoft 고품질 목소리
  /Yuna.*(Premium|Enhanced)|(Premium|Enhanced).*Yuna/i, // iOS/macOS 고품질
  /Google/i, // Chrome
  /Yuna/i, // iOS/macOS 기본
]

let cachedVoice // 한 번 고른 목소리를 저장해 두고 재사용
let cachedEnglishVoice

// 한국어 목소리 중 VOICE_PREFERENCE 순서대로 가장 먼저 맞는 것을 고른다. 없으면 기기 내장 목소리
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

function pickEnglishVoice() {
  const voices = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang?.replace('_', '-').toLowerCase().startsWith('en'))
  return (
    voices.find((v) => /Google US English/i.test(v.name)) ??
    voices.find((v) => v.lang.replace('_', '-').toLowerCase() === 'en-us') ??
    voices[0] ??
    null
  )
}

// 목소리 목록은 늦게 불러와지는 브라우저가 많아서, 바뀌면 다시 고른다
if (isSpeechSupported()) {
  cachedVoice = pickVoice()
  cachedEnglishVoice = pickEnglishVoice()
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    cachedVoice = pickVoice()
    cachedEnglishVoice = pickEnglishVoice()
  })
}

const ENGLISH_WORD = "[A-Za-z](?:[A-Za-z0-9'&+.-]*[A-Za-z0-9])?"
const ENGLISH_RUN = new RegExp(`${ENGLISH_WORD}(?:\\s+${ENGLISH_WORD})*`, 'g')
const hasWords = (text) => /[가-힣A-Za-z0-9]/.test(text)

function splitByLanguage(text) {
  const parts = []
  let last = 0
  for (const match of text.matchAll(ENGLISH_RUN)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), english: false })
    parts.push({ text: match[0], english: true })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), english: false })
  return parts
    .map((part) => ({ ...part, text: part.text.replace(/^[\s,.;:)\]]+/, '') }))
    .filter((part) => hasWords(part.text))
}

// AI가 만든 글에 섞인 마크다운 기호(**굵게**, # 제목, - 목록, `코드`, [링크](주소) 등)를
// TTS가 "별표 별표"처럼 그대로 읽지 않도록 걷어낸다
export function cleanForSpeech(text) {
  return (
    stripPageRefs(stripMarkdown(String(text ?? '')))
      .replace(/\*+/g, '') // 짝이 안 맞아 남은 별표
      // 한글 뒤 괄호 속 영어 병기: "텔넷(Telnet)"을 "텔넷 텔넷"으로 두 번 읽지 않게 한다
      .replace(/([가-힣])\s*\(\s*[A-Za-z][A-Za-z0-9 .,&/+'-]*\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function makeUtterance(text, rate, english) {
  const u = new SpeechSynthesisUtterance(text)
  if (english) {
    u.voice = cachedEnglishVoice
    u.lang = cachedEnglishVoice.lang
  } else {
    if (cachedVoice) u.voice = cachedVoice
    u.lang = cachedVoice?.lang ?? 'ko-KR'
  }
  u.rate = rate
  return u
}

// 모든 발화는 여기서 만든다. 영어 목소리가 있으면 영어 부분만 영어 목소리로 읽는다
function makeUtterances(text, rate = 1) {
  const clean = cleanForSpeech(text)
  if (!cachedVoice) cachedVoice = pickVoice()
  if (!cachedEnglishVoice) cachedEnglishVoice = pickEnglishVoice()

  const pieces = clean.split(/\s*[,，、]\s*/).filter(hasWords)

  const parts = pieces.flatMap((piece) => {
    if (!cachedEnglishVoice) return [{ text: piece, english: false }]
    return splitByLanguage(piece)
  })

  if (parts.length === 0) return [makeUtterance(clean, rate, false)]
  return parts.map((part) => makeUtterance(part.text, rate, part.english))
}

function speakAll(utterances) {
  utterances.forEach((u) => window.speechSynthesis.speak(u))
}

// 한 번만 말하는 안내 (예: "곧 끝나요")
export function announce(text) {
  if (!isSpeechSupported()) return
  window.speechSynthesis.cancel()
  speakAll(makeUtterances(text))
}

// 문단 목록을 하나씩 이어서 읽는 플레이어를 만든다
// - onIndex(i): i번째 문단을 읽기 시작할 때 (화면 하이라이트, 진행 저장용)
// - onFinish(): 마지막 문단까지 다 읽었을 때
// 사용: const sp = createSpeaker({...}); sp.load(segments); sp.play()
export function createSpeaker({ onIndex, onFinish } = {}) {
  let segments = [] // 읽을 문단 [{ text }]
  let index = 0 // 지금 문단 번호
  let rate = 1 // 읽기 속도 (1 = 보통)
  let playing = false
  let token = 0 // 취소된 발화가 뒤늦게 다음 문단을 읽지 않도록 구분

  const cancel = () => {
    token += 1
    if (isSpeechSupported()) window.speechSynthesis.cancel()
  }

  // i번째 문단을 읽고, 다 읽으면 자동으로 다음 문단을 읽는다
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
    const utterances = makeUtterances(segments[i].speech ?? segments[i].text, rate)
    utterances.at(-1).onend = () => {
      if (playing && myToken === token) speak(i + 1)
    }
    // cancel 직후 바로 speak하면 무시되는 브라우저가 있어 잠깐 기다린다
    setTimeout(() => {
      if (myToken === token) speakAll(utterances)
    }, 80)
  }

  return {
    // 읽을 문단과 시작 위치를 정한다 (재생은 play에서)
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
    // 속도를 바꾸면 지금 문단을 새 속도로 처음부터 다시 읽는다
    setRate(r) {
      rate = r
      if (playing) speak(index)
    },
    // i번째 문단으로 이동 (이전/다음 문단 버튼). 범위 밖이면 처음/끝으로 맞춘다
    seek(i) {
      if (segments.length === 0) return
      index = Math.max(0, Math.min(i, segments.length - 1))
      if (playing) speak(index)
      else if (onIndex) onIndex(index)
    },
  }
}

// 지금 나오는 모든 음성을 멈춘다 (화면을 떠날 때 등)
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
  const utterances = makeUtterances(text, rate)
  utterances.at(-1).onend = done
  utterances.at(-1).onerror = done
  // cancel 직후 바로 speak하면 무시되는 브라우저가 있어 잠깐 기다린다
  const id = setTimeout(() => !cancelled && speakAll(utterances), 80)
  return () => {
    cancelled = true
    clearTimeout(id)
    window.speechSynthesis.cancel()
  }
}
