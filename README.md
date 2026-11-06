# 통학 학습 (commute-study-frontend)

통학 시간에 **개념을 듣고(TTS) → 문제를 푸는** 모바일 웹앱의 프론트엔드입니다.
해커톤 제출용이며, 현재 **서버 응답은 모두 Mock + LocalStorage**로 동작합니다. 백엔드 없이 처음부터 끝까지 돌아갑니다.

> 이 문서는 팀원이 코드를 수정할 때 "이 파일이 뭔지, 어디를 조심해야 하는지" 알 수 있도록 쓴 설명서입니다.
> **구조를 바꾸면 이 문서도 같이 고쳐 주세요.**

---

## 1. 시작하기

```bash
git clone https://github.com/Subway-Line-1-Hackathon/commute-study-frontend.git
cd commute-study-frontend
git switch develop
npm install
npm run dev
```

- 폰으로 확인: `npm run dev -- --host` 로 켜고, 같은 와이파이의 폰에서 터미널에 나온 `Network` 주소로 접속
- 포맷/검사: `npm run format`, `npm run lint` (PR 전에 둘 다 통과해야 합니다)
- 화면이 이상하면: 브라우저 F12 → Application → Local Storage에서 `cs:` 로 시작하는 항목을 지우고 새로고침

**스택**: Vite + React(JSX), react-router-dom, Zustand(persist → LocalStorage), Tailwind CSS v4, 모바일 우선(`max-w-md`)

---

## 2. 서비스 한눈에 보기

### 학습 흐름

```
S-00 스플래시 ─ 미로그인 ─▶ S-01 로그인(구글 Mock)
                              │ 처음이면
                              ▼
              닉네임(S-02) → S-04 통학 시간 → S-05 과목·자료 등록 → S-10 처리 대기
                              │ (재로그인이면 건너뜀)
                              ▼
                        ★ S-20 홈 (자료 선택 · 오답노트 · 설정)
                              │ 자료 카드 → "출발" 확인 모달
                              ▼
   학습 가능 시간 ≥ 20분 ──▶ S-35 개념 듣기(TTS) ──▶ S-30 문제 설정 ──▶ S-40 문제 풀이 ──▶ S-50 요약
   학습 가능 시간 < 20분 ──────────────────────────▶ S-30 문제 설정 ┘

오답 복습: S-20 또는 S-52 오답노트 ─▶ S-32 복습 미리보기 ─▶ S-40 문제 풀이 ─▶ S-50 요약
설정:      S-20 ─▶ S-60 설정 (통학 시간·닉네임 수정, 로그아웃)
```

### 핵심 규칙

| 규칙 | 내용 |
| --- | --- |
| 통학 시간 입력 | **편도** 5~180분 |
| 학습 가능 시간 | `Math.floor(편도 × 0.7)` |
| 20분 미만 | 개념 듣기 없음, 문제 풀이/오답 복습만 |
| 개념 : 문제 비율 | 20~39분 3:7, 40~59분 4:6, 60분 이상 5:5 (`lib/plan.js` 표 한 곳에서 수정) |
| 종료 알림 | 문제 풀이 종료 **3분 전**에 "곧 끝나요" (토스트 + 음성 + 진동). `WARNING_SEC` |
| 문항당 시간 | O/X 30초, 객관식 60초, 단답 90초 (추천 문항 수 계산용) |
| 세션 최대 문항 | 복습 세션 기준 30문제 |
| 학습 단위 | **단원 없이 자료(파일) 하나가 학습 항목 하나**입니다. 코드의 `unit`은 "자료 하나"를 뜻합니다. |
| 하루 경계 | 한국 시간 자정 (`lib/date.js`) |

---

## 3. 폴더 구조와 파일 설명

```
src/
├ main.jsx            앱 진입점 (BrowserRouter)
├ App.jsx             AppRouter만 렌더
├ index.css           @import "tailwindcss" 한 줄
├ lib/                순수 함수·상수 (화면과 무관)
├ mocks/              가짜 서버 응답 (API 연동 시 교체 대상)
├ store/              Zustand 스토어 3개 (앱 상태의 전부)
├ hooks/              커스텀 훅
├ routes/             라우팅과 접근 가드
├ components/         재사용 UI 조각
└ pages/              화면 (S-번호 순)
```

### lib/ — 상수와 규칙

| 파일 | 역할 |
| --- | --- |
| `constants.js` | 상태값(AUTH/MATERIAL/SESSION/WRONG/PHASE), 문제 유형, 난이도, 규칙 상수, **`ROUTES`(모든 경로)** |
| `storage.js` | LocalStorage 헬퍼, zustand용 저장소 어댑터, `uid()`, `wait()` |
| `time.js` | 통학 시간 검증, 학습 가능 시간 계산(×70%), 20분 미만 판단, 시계 포맷 |
| `plan.js` | **개념/문제 시간 배분표**, 문항당 시간, 추천 문항 수 |
| `entryRoute.js` | 로그인 후 **어느 화면으로 보낼지** 한 곳에서 결정 |
| `nickname.js` | 닉네임 검증 (2~10자, 한글·영문·숫자·_ , 금지어) |
| `date.js` | 한국 시간 기준 날짜 키 (`YYYY-MM-DD`) |
| `review.js` | 오답노트 목록 상한(미해결 100·해결 50), 복습 문제 고르기 |
| `speaker.js` | 브라우저 TTS(문단 단위 재생, 일시정지, 속도) + 한 번 말하기(`announce`) |

### mocks/ — 가짜 데이터 (나중에 API로 교체)

| 파일 | 역할 |
| --- | --- |
| `mockUser.js` | 구글 로그인 대신 쓰는 가짜 유저 |
| `mockMaterial.js` | 자료 처리 결과(학습 항목 1개 + 요약) 생성 |
| `mockQuiz.js` | 문제 생성 (객관식 정답은 `보기 2`, 단답형 정답은 `정답`, O/X는 번갈아) |
| `mockScript.js` | 개념 듣기용 강의 스크립트 생성 (분당 약 350자 기준, 문장은 반복되는 mock) |

### store/ — 앱 상태 (가장 중요)

| 파일 | 저장 키 | 역할 |
| --- | --- | --- |
| `useAuthStore.js` | `cs:auth` | 로그인 상태, 유저/닉네임, 통학 시간, `activated` |
| `useMaterialStore.js` | `cs:materials` (version 1) | 과목, 자료, 업로드→처리→완료 Mock 전이 |
| `useSessionStore.js` | `cs:session` (version 3) | 학습 세션, 오답노트, 진도, 일별 응답 기록 |

### hooks/, routes/

| 파일 | 역할 |
| --- | --- |
| `hooks/useWakeLock.js` | 학습 중 화면이 꺼지지 않게 함 |
| `routes/AppRouter.jsx` | 모든 라우트 정의 |
| `routes/guards.jsx` | `RequireAuth`(로그인 필요), `RequireActive`(온보딩 완료 필요) |

### components/

| 파일 | 역할 |
| --- | --- |
| `BackButton` | 뒤로가기 (`to` 지정 또는 이전 화면) |
| `TopBar` | 뒤로가기 + 설정 + 로그아웃 공용 상단바 |
| `ConfirmModal` | 확인/취소 팝업 (`onCancel` 없으면 확인만) |
| `ResumeModal` | 홈의 이어하기 팝업 |
| `UnitCard` | 홈의 자료 카드 (진도 막대 포함) |
| `Chip`, `SegmentedToggle` | 선택 칩, 토글 |
| `QuestionCard` | 문제 카드 (O/X, 객관식, 단답형, 정오 표시) |
| `TimerBadge` | 남은 시간 배지 (1분 이하면 빨간색) |
| `StatCard` | 요약 화면의 통계 카드 |

### pages/ — 화면

| 파일 | 경로 | 화면 |
| --- | --- | --- |
| `S00Splash` | `/` | 스플래시, 진입 분기 |
| `S01Login` | `/login` | 구글 Mock 로그인 |
| `S02Nickname` | `/onboarding/nickname` | 닉네임 설정 (번호 임시) |
| `S04Commute` | `/onboarding/commute` | 통학 시간 설정 |
| `S05Material` | `/onboarding/material` | 과목 등록 + 자료 업로드(파일 이름만 저장) |
| `S10Waiting` | `/onboarding/waiting` | 자료 처리 대기 → 모두 완료되면 홈 |
| `S20Home` | `/home` | 홈 |
| `S35Listen` | `/study/listen` | 개념 듣기 (번호 임시) |
| `S30Setup` | `/study/setup` | 문제 설정 (유형·난이도·문항 수) |
| `S32Review` | `/study/review` | 오답 복습 미리보기 |
| `S40Player` | `/study/play` | 문제 풀이 |
| `S50Summary` | `/study/summary` | 통학 후 요약 |
| `S52WrongNotes` | `/wrong-notes` | 오답노트 |
| `S60Settings` | `/settings` | 설정 |
| `Stub` | - | 예전 "준비 중" 화면. 지금은 쓰지 않으며 삭제해도 됩니다. |

---

## 4. 상태 관리

### 인증 (useAuthStore)

`ANONYMOUS` → (로그인) `AUTHENTICATED` → (자료 처리 완료) `ACTIVE`

- 한 번 `ACTIVE`가 되면 `activated: true`가 남아서, 재로그인하면 바로 `ACTIVE`가 됩니다.
- `logout()`은 **로그인 상태만 해제**합니다. 닉네임, 통학 시간, 자료는 유지됩니다.
- 진입 분기: 로그인 → 닉네임 → 통학 시간 → 과목/자료 → 대기 → 홈 (`lib/entryRoute.js`)

### 자료 (useMaterialStore)

`UPLOADED` → (2~3초) `PROCESSING` → (2~3초) `READY`

- Mock 타이머입니다. 새로고침으로 끊기면 `resumePending()`이 스플래시와 S-10에서 이어서 처리합니다.
- 자료가 READY가 되면 `units`에 학습 항목이 **1개** 생깁니다 (단원 구분 없음).

### 세션 (useSessionStore)

세션 하나는 상태(`status`)와 단계(`phase`)를 함께 가집니다.

| 구분 | 값 |
| --- | --- |
| `status` | `READY` → `IN_PROGRESS` → `COMPLETED`(마지막 문제 제출) / `ENDED`(시간 종료·중도 종료) |
| `phase` | `LISTEN`(개념 듣기) → `QUIZ_SETUP`(문제 설정) → `QUIZ`(문제 풀이) |
| `mode` | `curriculum`(일반 학습) / `review`(오답 복습, 바로 `QUIZ`) |

주요 액션

| 액션 | 하는 일 |
| --- | --- |
| `createSession({ unit, studyMin })` | 시간 배분과 스크립트를 만들고 세션 생성 (20분 미만이면 `QUIZ_SETUP`부터) |
| `createReviewSession({ questions, studyMin })` | 오답 복습 세션 생성 |
| `start()` | `READY` → `IN_PROGRESS` (출발) |
| `skipListening()` | 개념 듣기를 건너뜀 (남은 개념 시간은 문제 시간에 더해짐) |
| `startQuiz({ types, difficulty, count })` | 문제 생성 후 `QUIZ` 단계로 |
| `submitAnswer(value)` | 채점, 오답 기록, 일별 기록. 마지막 문제면 즉시 `COMPLETED` |
| `tick()` | 1초마다 호출. 단계에 맞는 시간이 줄고 종료 알림 플래그(`warned`) 처리 |
| `endSession()` | `ENDED`로 전환 |

- **현재 문제 번호는 `answers.length`로 계산**합니다. `currentIndex`는 없습니다.
- `getSessionRoute(session)`: 세션 단계에 맞는 경로를 돌려줍니다 (홈에서 출발/이어하기 때 사용).
- 사용자당 진행 중 세션은 하나(`current`)입니다.

### 오답 (wrongNotes)

- **문제당 한 줄**입니다. 다시 틀리면 `wrongCount + 1`, 복습에서 맞히면 `RESOLVED`, 해결한 문제를 다시 틀리면 `OPEN`으로 돌아옵니다.
- 오답노트에서 삭제할 수 없습니다. 목록 상한(미해결 100, 해결 50)은 **화면에서만** 적용됩니다.
- 하루 합산 정답률용 기록은 `dailyStats[YYYY-MM-DD] = { answered, correct }` (복습 응답 포함)

---

## 5. ⚠️ 수정하기 전에 꼭 읽기

### 같이 쓰는 파일 (충돌 주의)

| 파일 | 주의 |
| --- | --- |
| `store/useSessionStore.js` | **가장 많은 화면이 의존합니다** (홈, 듣기, 문제 설정, 복습, 풀이, 요약, 오답노트). 세션 구조를 바꾸면 `persist`의 `version`을 올리고 `migrate`를 쓰세요. 수정 전에 팀에 알려 주세요. |
| `store/useAuthStore.js`, `lib/entryRoute.js` | 로그인/온보딩 분기가 여기 한 곳에 있습니다. 바꾸면 S-00 ~ S-10 흐름을 처음부터 다시 확인하세요. |
| `store/useMaterialStore.js` | 자료 처리 타이머와 저장 구조. 저장 구조가 바뀌면 `version`을 올리세요. |
| `lib/constants.js`, `routes/AppRouter.jsx` | **모두가 건드리는 공용 파일**입니다. 기존 줄은 이름을 바꾸지 말고 **맨 아래(객체 끝)에 추가**해서 충돌을 줄이세요. |
| `lib/plan.js` | 개념/문제 시간 배분표. 숫자만 바꿔도 앱 전체에 반영됩니다. |
| `lib/speaker.js` | TTS 재생 로직(취소 토큰, 지연 호출)이 민감합니다. 고치면 PC와 폰 둘 다 소리를 확인하세요. |
| `package.json`, `package-lock.json` | 라이브러리 추가는 **한 사람이 하고 먼저 머지**하세요. |

### 비교적 안전하게 수정할 수 있는 곳

- 문구, 색상, 간격 등 **스타일** (`components/`, `pages/`의 className)
- `mocks/` 안의 가짜 데이터 내용
- **새 화면 추가**(아래 6번 참고), 새 컴포넌트 추가

### 규칙

- 화면에서 스토어를 쓸 때는 필요한 값만 선택해서 가져옵니다. `useSessionStore((s) => s.current)`처럼요. 이벤트 처리 안에서 최신 값이 필요하면 `useSessionStore.getState()`를 씁니다.
- 경로 문자열을 직접 쓰지 말고 **`ROUTES`** 를 쓰세요.
- `lib/` 안의 파일은 화면(React)을 몰라야 합니다. 상태와 규칙만 두세요.
- JSX의 `return` 안에 `const`, `let` 같은 선언을 넣지 마세요. 함수 본문(return 위)에 두세요.

---

## 6. 자주 하는 작업

### 새 화면 추가

1. `src/pages/S00Name.jsx` 생성
2. `lib/constants.js`의 `ROUTES` **맨 아래**에 경로 추가
3. `routes/AppRouter.jsx`에 import와 `<Route>` 추가 (로그인 필요면 `RequireAuth`, 온보딩 후 화면이면 `RequireActive`로 감싸기)
4. 화면 이동은 `navigate(ROUTES.XXX)`

### Mock을 실제 API로 바꾸기 (백엔드 연동 시)

호출부만 바꾸고 **화면 코드는 그대로** 둡니다.

| 기능 | 지금 쓰는 곳 | 바꿀 곳 |
| --- | --- | --- |
| 로그인 | `useAuthStore.loginWithGoogle` → `mockUser` | 로그인 API 응답으로 `status`, `user` 설정 |
| 자료 업로드·처리 | `useMaterialStore.uploadMaterial`, `advance` → `mockMaterial` | 업로드 API + 처리 상태 조회 |
| 강의 스크립트 | `useSessionStore.createSession` → `mockScript.generateScript` | 스크립트 API (자료 ID, 개념 듣기 시간(분) → 문단 목록) |
| 문제 생성 | `useSessionStore.startQuiz` → `mockQuiz.generateQuestions` | 문제 API (자료 ID, 유형, 난이도, 개수) |

연동 때는 `VITE_USE_MOCK` 환경변수로 mock/실제를 전환하는 방식을 쓸 예정입니다.

---

## 7. 개발 규칙

### Git

- **GitHub Flow + develop**: 작업 브랜치는 항상 `develop`에서 따고, PR의 **base는 `develop`**입니다. `main`에 직접 푸시하지 않습니다.
- 브랜치 이름 예: `feature/이름-기능`
- 작업 시작: `git switch develop` → `git pull` → `git switch -c feature/...`
- 마감 직전(13일)에 `develop`을 `main`에 합치는 PR을 만듭니다.

### 커밋 메시지

`<type>(<scope>): <한글 설명>` / 마침표 없음 / **한 커밋에 한 가지 일**

| type | 쓰는 경우 |
| --- | --- |
| `feat` | 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 동작 변화 없는 구조 개선 |
| `style` | 포맷 (기능 변화 없음) |
| `design` | CSS 등 UI 변경 |
| `chore` | 빌드, 설정, 의존성 |
| `docs` | 문서 |

### 코드 스타일

Prettier: 세미콜론 없음, 홑따옴표, 들여쓰기 2칸, 한 줄 100자. 변수/함수는 camelCase, 화면/컴포넌트는 PascalCase, 훅/스토어는 `useXxx`.
PR 전에 `npm run format`, `npm run lint`를 실행하세요.

---

## 8. 디버깅 팁

**상태 초기화**: F12 → Application → Local Storage → `cs:` 로 시작하는 항목 삭제 → 새로고침

**시간 기다리지 않고 확인하기** (F12 콘솔에 붙여넣고 새로고침)

```js
// 개념 듣기 5초 남기기 (듣기 화면에서)
const k='cs:session', d=JSON.parse(localStorage.getItem(k)); d.state.current.conceptRemainingSec=5; localStorage.setItem(k, JSON.stringify(d)); location.reload()

// 문제 풀이를 종료 알림 직전(185초)으로 (문제 풀이 화면에서)
const k='cs:session', d=JSON.parse(localStorage.getItem(k)); d.state.current.quizRemainingSec=185; localStorage.setItem(k, JSON.stringify(d)); location.reload()

// 오늘 푼 문제/정답 수 보기
JSON.parse(localStorage.getItem('cs:session')).state.dailyStats
```

**자주 나는 문제**

| 증상 | 원인과 해결 |
| --- | --- |
| `vite`를 찾을 수 없음 | `npm install`을 아직 안 함 |
| `does not provide an export named ...` | 해당 파일이 비어 있거나 저장이 안 됨. `Get-ChildItem src\lib \| Select-Object Name, Length`로 `Length`가 0인 파일을 찾기 |
| 화면이 하얗게 나옴 | 브라우저 F12 콘솔의 빨간 에러를 확인 |
| PowerShell에서 `mkdir -p`, `{a,b}`가 안 됨 | PowerShell 문법으로: `mkdir a, b` / 새 파일은 `ni 경로` |
| 코드를 터미널에 붙여넣어 에러 | 코드는 VS Code 파일에, 명령어만 터미널에 |
| TTS 소리가 안 남 | ▶ 버튼을 눌러야 시작됩니다. 한국어 음성이 없는 PC일 수 있으니 폰에서 확인 |

---

## 9. 알려진 한계와 남은 작업

- **S-51 성장 리포트**(정답률 그래프, 일별 기록은 이미 쌓는 중), **S-41 해설·AI 질문**: 예정
- S-05의 **"샘플 데이터로 시작" 버튼**, 업로드 형식(PDF/PPT/PNG)과 30MB 제한 검사: 예정
- 홈의 진도 막대는 자료의 **최근 세션 정답률**입니다. (명세의 "푼 문제 ÷ 40"과 다름)
- 이어하기는 타이머를 **남은 시간에서 이어서** 진행합니다. (명세는 "새로 시작")
- 단답형 정답 판정은 문자열 일치만 합니다. (AI 판정은 연동 후)
- mock 문제는 난이도에 따라 달라지지 않고 개수만 반영합니다.
- 브라우저 TTS는 모바일에서 **화면이 꺼지거나 백그라운드로 가면 끊길 수 있습니다.** 시연은 화면을 켠 채로 하며, 정식 서비스는 서버가 만든 음성 파일 재생이 필요합니다.
- `S-02`(닉네임), `S-35`(개념 듣기)의 화면 번호는 임시입니다.
- 알림 기능(푸시)은 구현하지 않기로 했습니다. "곧 끝나요"는 앱 안의 안내입니다.

---

## 10. 작업 중 표시 (충돌 방지)

같은 파일을 동시에 수정하지 않도록, 작업 시작 전에 아래에 적어 주세요. 끝나면 지웁니다.

| 파일/영역 | 담당자 | 비고 |
| --- | --- | --- |
|  |  |  |
|  |  |  |
