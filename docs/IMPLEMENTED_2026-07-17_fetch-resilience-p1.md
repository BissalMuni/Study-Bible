# 구현 보고 — P1 fetch 실패 복원력 (재사용 인프라 + BibleReader 적용)

> 작성: 현황분석·개선점제안 에이전트 · 기준일 **2026-07-17** · 대상 커밋 **`dcd9401`**(작업 트리)
> 성격: 백로그 P1(문서 `PROPOSAL_2026-07-16_fetch-resilience.md`)을 **코드로 구현**. P0(부팅 크래시)에 이은 신뢰성 2단계.

---

## 1. 현재 상황 (파악)

- HEAD `dcd9401` — 최근 커밋은 계속 comfort 심화(Q2 sorrow·hate). 개발자는 comfort만 커밋.
- **P0 부팅 크래시 방어(safeParse + ErrorBoundary)는 작업 트리에 구현되어 있으나 아직 미커밋** 상태로 유지됨(`git status`: `GlobalStateContext.tsx`·`main.tsx` M, `ErrorBoundary.tsx`·`utils/storage.ts` ??).
- 신규 데이터 준비물 `public/data/bible_complete.json`(5.17MB, 코드 미참조) 등장 — 향후 P5(대형 JSON 지연 로드)와 연관되나 아직 런타임 미사용.
- fetch 무대응 지점 잔존: `BibleReader:39`, `ComfortChat:122`, `ThemeDetail:83` (모두 `.catch(console.error)` → 실패 시 빈 화면/무한 스피너).

## 2. 구현 내용

### 신규 (재사용 인프라)
- **`src/hooks/useFetchJson.ts`** — `useFetchJson<T>(url, 'json'|'text')` → `{ data, loading, error, reload }`. `res.ok` 검사, 취소 처리, dev 전용 로깅, `reload`로 재시도.
- **`src/components/common/AsyncBoundary.tsx`** — `loading`→스피너, `error`→안내+**"다시 시도"**(onRetry), 정상→children.

### 적용 (BibleReader)
- `useState<bibleData> + useEffect(fetch...).catch(console.error)` 제거 → `useFetchJson<BibleData>('/data/bible.json')`.
- 기존 `if (!bibleData) return <무한 스피너>` → `if (!bibleData) return <AsyncBoundary loading error onRetry={reload} />`.
- **효과:** 종전에는 fetch 실패 시 스피너가 **영원히** 돌았다(복구 불가). 이제 **에러 문구 + 다시 시도 버튼**으로 사용자가 회복 가능.

## 3. 검증

| 항목 | 결과 |
|---|---|
| `tsc -b` | ✅ exit 0 |
| `vite build` | ✅ 성공 (2125 modules) |
| 로딩→에러→재시도 흐름(설계) | `useFetchJson` error 상태 + `AsyncBoundary` 재시도 버튼 |

### 수동 확인(권장)
- DevTools Network **Offline** → 성경읽기 탭 진입 시 무한 스피너 대신 "다시 시도" 노출, 온라인 복귀 후 클릭 시 정상 로드.

## 4. 남은 적용 (후속, 본 구현 범위 밖 — 회귀 위험 관리 위해 분리)

| 지점 | 사유 |
|---|---|
| `ComfortChat.tsx:113-122` | `Promise.all([fetch, fetch])` 이중 로드라 단일 URL 훅에 바로 안 맞음 → 작은 래핑/2회 호출 리팩터 필요. |
| `ThemeDetail.tsx:78-83` (`bible_theme.json`) | **P5(책 단위 지연 로드)와 함께 처리**하는 것이 합리적(전량 로드 자체를 없앨 예정). |

> 두 지점은 각각 `PROPOSAL_2026-07-16_fetch-resilience.md`·`PROPOSAL_2026-07-16_theme-json-lazyload.md`에 상세.

## 5. 백로그 상태

| 순위 | 항목 | 상태 |
|---|---|---|
| P0 | 부팅 크래시 방어 | ✅ 구현(작업트리, 미커밋) — `IMPLEMENTED_2026-07-16_boot-crash-hardening.md` |
| P1 | fetch 복원력 | ✅ **인프라+BibleReader 구현(본 문서)**, ComfortChat·ThemeDetail 후속 |
| P2 | 접근성 lang/aria | 미착수 (lang 여전히 `en`) |
| P3 | priority/reason 연결 | 미착수 (`grep priority src`=0) |
| P4 | 추천 스코어 중복+버그 | 미착수 |
| P5 | bible_theme 지연 로드 | 미착수 (+ 신규 5.17MB `bible_complete.json` 관찰) |
| P6 | 타입 중앙화 | 미착수 |
| P7 | console 정리 | 미착수 (esbuild.drop 없음) |
| — | 테스트/CI 안전망 | 미착수 |

## 6. 참고
- 변경: 신규 2 + 수정 1(BibleReader). 신규 의존성 0. **작업 트리 미커밋**(P0 변경과 함께 사용자 리뷰 후 커밋 권장).
- 다음 권고: **P2 접근성 `lang="ko"`**(1줄, 초저위험, TTS 앱 정합) 또는 **테스트 안전망**(이후 리팩터 보호).
