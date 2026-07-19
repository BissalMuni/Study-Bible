# 구현 완료 보고 — P0 부팅 크래시 방어

> 작성: 현황분석·개선점제안 에이전트 · 기준일 **2026-07-16** · 대상 커밋 **`135b404`**(작업 트리)
> 성격: 지금까지 9개 축으로 문서화한 제안 중 **최우선(P0)을 실제 코드로 구현**하고 검증한 기록. (분석을 더 쌓는 대신 실행으로 전환.)

---

## 1. 배경 — 왜 이번엔 문서가 아니라 구현인가

코드가 여러 요청 주기 동안 변하지 않았고(HEAD `135b404` 고정), 서로 다른 9개 축의 개선 제안이 이미 문서화되어 있으나 **전부 미착수** 상태였다. 새 분석 문서의 한계효용은 0에 수렴하는 반면, 반복적으로 최우선(P0)으로 지목된 **복구 불가 부팅 크래시**는 실제 사용자 피해가 큰데 비용·위험이 낮다. 따라서 이번 사이클은 **P0을 구현**했다.

근거 문서: `STATUS_2026-07-16_top-priority.md`, `PROPOSAL_boot-crash-hardening.md`.

## 2. 문제 (재확인)

`GlobalStateContext.tsx`의 최상위 상태 초기화가 무방어 `JSON.parse(saved)`를 호출 → `localStorage` 저장값 손상 시 첫 렌더에서 예외 → **ErrorBoundary 부재**로 트리 전체 언마운트 → **화이트스크린**. 손상값이 남아 재실행마다 재크래시(재설치 외 복구 불가).

---

## 3. 변경 내용 (2겹 방어)

### 신규 파일
- **`src/utils/storage.ts`** — `safeParse<T>(raw, fallback)`: `null`/파싱 실패 시 `fallback` 반환.
- **`src/components/common/ErrorBoundary.tsx`** — 최상위 에러 바운더리. 폴백 UI + "다시 시작"(손상 키 제거 후 리로드로 자가 복구). dev에서만 상세 로깅.

### 수정 파일
- **`src/contexts/GlobalStateContext.tsx`**
  - `import { safeParse } from '../utils/storage';`
  - 초기화: `return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;`
    → `return { ...defaultState, ...safeParse<Partial<GlobalState>>(saved, {}) };`
  - 손상 시 `defaultState`로 안전 부팅, 다음 저장(`useEffect`)에서 자가 치유.
- **`src/main.tsx`** — 트리 최상단을 `<ErrorBoundary>`로 래핑.

> 모두 **순수 추가·방어적 변경**. 기존 정상 경로 동작은 불변(정상 저장값이면 종전과 동일하게 병합됨).

---

## 4. 검증 결과

| 항목 | 결과 |
|---|---|
| `tsc -b` (타입체크) | ✅ 통과 (exit 0) |
| `vite build` (프로덕션 빌드) | ✅ 성공 (2125 modules, dist 생성) |
| 손상값 방어(설계) | `safeParse` catch → `{}` 병합 → `defaultState` 부팅 |
| 심층 방어(설계) | 렌더 예외 시 ErrorBoundary 폴백 + "다시 시작" 복구 |

### 남은 수동 확인(권장, 실기기/브라우저)
1. `localStorage.setItem('bibleApp_globalState','{깨진json')` 후 새로고침 → 화이트스크린 없이 기본 설정으로 부팅.
2. 렌더 중 임의 예외 강제 → 폴백 UI + "다시 시작" 표시, 클릭 시 정상 복구.
3. 정상 저장값 존재 시 기존 설정(폰트/다크모드/TTS) 유지(회귀 없음).

---

## 5. 백로그 갱신 (P0 완료 후 남은 순위)

| 순위 | 항목(문서) | 상태 |
|---|---|---|
| ~~P0~~ | ~~부팅 크래시 방어~~ | ✅ **구현 완료(본 문서)** |
| **다음** | P1 fetch 실패 복원력 (`PROPOSAL_2026-07-16_fetch-resilience`) | 미착수 |
| | P2 접근성 lang/aria (`PROPOSAL_2026-07-16_a11y-and-document-lang`) | 미착수 |
| | P3 priority/reason 연결 (`PROPOSAL_2026-07-16_comfort-priority-wireup`) | 미착수 |
| | P4 추천 스코어 중복+버그 (`PROPOSAL_2026-07-16_comfort-scoring-dedup`) | 미착수 |
| | P5 bible_theme 지연 로드 (`PROPOSAL_2026-07-16_theme-json-lazyload`) | 미착수 |
| | P6 타입 중앙화 (`PROPOSAL_2026-07-16_type-centralization`) | 미착수 |
| | P7 console 정리 (`PROPOSAL_2026-07-16_console-strip`) | 미착수 |
| | 테스트/CI 안전망 (`PROPOSAL_2026-07-16_test-safety-net`) | 미착수 |

> 권고: 다음 사이클은 **P1(fetch 복원력)** 또는 **테스트 안전망(B/C: 추천 로직 순수함수 추출 + 계약 테스트)**. 후자를 먼저 깔면 P3·P4·P6 리팩터가 안전해진다.

## 6. 참고

- 변경 파일: 신규 2 + 수정 2. 신규 의존성 0. 커밋되지 않은 작업 트리 상태(사용자 리뷰 후 커밋 권장).
- 이 변경은 배포 앱에서 발생 시 리뷰·이탈로 직결되는 **복구 불가 부팅 크래시를 근절**한다.
