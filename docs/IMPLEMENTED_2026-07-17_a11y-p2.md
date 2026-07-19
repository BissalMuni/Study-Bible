# 구현 보고 — P2 접근성: 문서 언어 `lang="ko"` + 아이콘 버튼 접근명

> 작성: 현황분석·개선점제안 에이전트 · 기준일 **2026-07-17** · 대상 커밋 **`dcd9401`**(작업 트리)
> 성격: 백로그 P2(문서 `PROPOSAL_2026-07-16_a11y-and-document-lang.md`)를 **코드로 구현**. 신뢰성(P0·P1)에 이은 사용성 개선.

---

## 1. 현재 상황 (파악)

- HEAD `dcd9401` 고정 — 새 커밋 없음. 개발자는 comfort 데이터만 수정(작업트리 `bible_theme.json` 등 M).
- 앞선 구현 **P0(safeParse+ErrorBoundary)·P1(useFetchJson+AsyncBoundary, BibleReader)** 는 작업트리에 유지(미커밋).
- P2 대상 결함 잔존 확인: `index.html` `lang="en"`, `<title>react_app_new`, TTS 조작부 아이콘 버튼에 접근명 없음.

## 2. 구현 내용

### `index.html`
- `lang="en"` → **`lang="ko"`** — 한국어 앱인데 영어로 선언되어 있어 스크린리더(TalkBack)·브라우저 TTS가 영어 엔진으로 한국어를 오독하던 문제 해소. (낭독이 핵심인 앱에서 특히 중요.)
- `<title>react_app_new` → **`오늘의 위로 성경`** (스캐폴드 잔재 제거).
- `viewport`에 `viewport-fit=cover`, `theme-color`·`description` 메타 추가.

### `TTSSettings.tsx` (아이콘 전용 버튼 접근명)
- 설정 열기 버튼: `aria-label="음성 설정 열기"`, `title` 문구 정정, 아이콘 `aria-hidden`.
- 닫기(X) 버튼: `aria-label="닫기"`, 아이콘 `aria-hidden`.
- 헤더 장식 아이콘(Volume2): `aria-hidden`.

## 3. 정확성 메모 (과잉수정 회피)
- **테스트 재생 버튼(`:163-174`)은 이미 텍스트('중지'/'테스트 재생')를 렌더**하므로 접근 가능 → **수정하지 않음**.
- `BottomNav`도 텍스트 라벨(오늘의위로 등) 보유 → 대상 아님.
- 결함은 "아이콘 전용 컨트롤 이름 부재 + 문서 언어 오선언"에 국한되어 그 지점만 수정.

## 4. 검증

| 항목 | 결과 |
|---|---|
| `tsc -b` | ✅ exit 0 |
| `vite build` | ✅ 성공 |
| 산출물 `dist/index.html` | ✅ `lang="ko"`, `<title>오늘의 위로 성경</title>` 반영 확인 |

### 수동 확인(권장)
- Android TalkBack 활성 후 음성 설정 열기/닫기 버튼이 "음성 설정 열기"·"닫기"로 읽히는지.
- 한국어 본문이 한국어 발음으로 낭독되는지(문서 lang 반영).

## 5. 백로그 상태

| 순위 | 항목 | 상태 |
|---|---|---|
| P0 | 부팅 크래시 방어 | ✅ 구현(미커밋) |
| P1 | fetch 복원력 | ✅ 인프라+BibleReader 구현(미커밋); ComfortChat·ThemeDetail 후속 |
| P2 | 접근성 lang/aria | ✅ **구현(본 문서, 미커밋)**; 여타 화면의 아이콘 버튼 접근명은 점진 확대 여지 |
| P3 | priority/reason 연결 | 미착수 |
| P4 | 추천 스코어 중복+버그 | 미착수 |
| P5 | bible_theme 지연 로드 | 미착수 (신규 `bible_complete.json` 5.17MB 관찰) |
| P6 | 타입 중앙화 | 미착수 |
| P7 | console 정리 | 미착수 |
| — | 테스트/CI 안전망 | 미착수 |

## 6. 참고
- 변경: `index.html` + `TTSSettings.tsx`. 신규 의존성 0. 순수 속성/메타 추가라 회귀 위험 거의 없음.
- **작업 트리 미커밋**(P0·P1과 함께 사용자 리뷰 후 커밋 권장).
- 다음 권고: **테스트/CI 안전망**(이후 P4/P6 리팩터 보호) 또는 **P7 console 정리**(esbuild.drop 1줄, 정보노출 차단).
