# 통학 학습 프론트엔드

Supabase Google 인증과 백엔드 API를 사용하는 모바일 웹앱입니다.

## 실행

1. 의존성을 설치합니다: `npm install`
2. `.env.example`을 `.env.local`로 복사하고 Supabase URL과 공개 anon 키를 설정합니다.
3. `npm run dev -- --host`로 실행합니다.

인증 설정이 없으면 설정 안내를 표시합니다. 가짜 로그인이나 생성된 문제로 대체하지 않습니다. 개발 서버는 `/api` 요청을 백엔드로 프록시합니다. 다른 서버를 사용할 때는 `VITE_API_PROXY_TARGET`을 지정하세요. 배포 시 API 주소는 `VITE_API_BASE_URL`로 지정합니다.

## 학습 흐름

Google 로그인 → 닉네임·통학 설정 → 과목 등록·자료 업로드 → 단원 선택 → 학습 설정 → 개념 듣기·문제 풀이 → 결과·오답·리포트

문제·요약·단원·자료 처리 상태는 서버 응답을 사용합니다. 기기에는 사용자별 자료 캐시, 진행 중 세션, 미전송 답안과 학습 기록을 보관합니다.

## 구조

- `src/lib`: API, 인증 연결, 데이터 변환, 저장소
- `src/store`: 인증·자료·학습 세션 상태와 액션
- `src/hooks`: 화면 데이터 조회와 학습 동작
- `src/routes`: 접근 가드와 화면별 지연 로딩
- `src/components`, `src/pages`: 공통 UI와 화면
- `tests`: 외부 API를 대체해 실제 액션과 컨트롤러를 검증하는 테스트

자세한 내용은 [프론트엔드 구조 안내](docs/frontend-architecture.md)를 참고하세요.

## 검증

`npm test`, `npm run lint`, `npm run build`를 실행합니다. 코드 정리는 `npm run format`을 사용합니다.
