# 구현 보고 — P4 추천 스코어 중복 제거 + 빈도 가중치 버그 수정

> 작성: 현황분석·개선점제안 에이전트 · 기준일 **2026-07-17** · 대상 커밋 **`dcd9401`**(작업 트리)
> 성격: 백로그 P4(문서 `PROPOSAL_2026-07-16_comfort-scoring-dedup.md`)를 **코드로 구현**. 정확성/유지보수 개선.

---

## 1. 현재 상황 (파악)

- HEAD `dcd9401` 고정, 새 커밋 없음. 앞선 구현 P0·P1·P2가 작업트리에 유지(미커밋).
- ComfortChat은 개발자가 가장 활발히 편집하는 파일(503 LOC)이며, 추천 스코어링이 2곳에 중복 + 잠재 버그를 담고 있었다.

## 2. 고친 문제

### (A) 스코어링 로직 이중 구현
`processTagsAndShowResult`와 `handleNewVerse`가 태그 빈도 스코어→top10→셔플→comfort 부족분 채움을 **각각 복제**. 튜닝 시 두 곳을 동기화해야 하는 드리프트 위험.

### (B) 빈도 가중치 소실 버그 (확정)
- `processTagsAndShowResult`: **원시 `allTags`**(중복 포함)로 `tagCounts` 산출 → 빈도 가중치 작동.
- `handleNewVerse`: **dedup된 `collectedTags`**로 `tagCounts` 산출 → 모든 count=1 → **빈도 가중치 소실**.
- 결과: 같은 감정 프로필인데 "결과 화면"과 "새 말씀 보기"의 랭킹 기준이 달랐다.

## 3. 구현 내용

### 신규 `src/components/comfort/selectVerses.ts`
순수 함수 `selectVersesByTags<T extends {id,tags}>(verses, rawTags, {pick,pool,rand})`
→ `{ verses, sortedTags }`. `rand` 주입으로 **결정론적 테스트 가능**(기본 `Math.random`).
JSDoc에 "반드시 원시 태그(중복 포함)를 넘길 것" 경고 명시.

### `ComfortChat.tsx`
- `processTagsAndShowResult`: 인라인 스코어링 블록(약 55줄)을 `selectVersesByTags(data.verses, allTags)` 호출로 대체. **원시 태그를 `rawTagsRef`(useRef)에 보존.**
- `handleNewVerse`: 중복 스코어링 제거 → `selectVersesByTags(data.verses, rawTagsRef.current)` 호출. **dedup된 collectedTags 대신 원시 태그를 사용 → 버그 (B) 해소.**

## 4. 검증

| 항목 | 결과 |
|---|---|
| `tsc -b` | ✅ exit 0 |
| `vite build` | ✅ 성공 |
| 스코어링 중복 제거 | 인라인 `scoredVerses`/`tagCounts` **0건**(전량 순수 함수로 이동) |
| 파일 축소 | ComfortChat **503 → 424 LOC** (−79) |
| 동작 보존 | `processTagsAndShowResult`는 종전과 동일 입력(allTags)→동일 로직. 결과 화면 회귀 없음 |
| 버그 수정 | `handleNewVerse`가 이제 결과 화면과 동일한 빈도 가중치로 재선택 |

### 수동 확인(권장)
- 설문 완료 후 "새 말씀 보기" 반복 시, 최초 결과와 동일한 관련도 기준의 구절군에서 뽑히는지.
- 매칭 0인 응답 → comfort 기본 구절로 채워지는지.

## 5. 후속(권장)
- 이 순수 함수에 **단위 테스트**(빈도 가중·부족분 채움·태그 없음 폴백)를 붙이면 회귀 방지 완성 → 백로그 "테스트/CI 안전망" 문서의 (B) 그대로 적용 가능(`rand` 주입으로 결정론).
- P3(priority/reason 연결)의 가산점을 **이 함수 한 곳**에 넣으면 두 경로에 일관 적용된다.

## 6. 백로그 상태

| 순위 | 항목 | 상태 |
|---|---|---|
| P0 | 부팅 크래시 방어 | ✅ 구현(미커밋) |
| P1 | fetch 복원력 | ✅ 인프라+BibleReader(미커밋); ComfortChat·ThemeDetail 후속 |
| P2 | 접근성 lang/aria | ✅ 구현(미커밋) |
| P4 | 추천 스코어 중복+버그 | ✅ **구현(본 문서, 미커밋)** |
| P3 | priority/reason 연결 | 미착수 (이제 selectVerses 한 곳에 가산점만 넣으면 됨) |
| P5 | bible_theme 지연 로드 | 미착수 |
| P6 | 타입 중앙화 | 미착수 |
| P7 | console 정리 | 미착수 |
| — | 테스트/CI 안전망 | 미착수 (selectVerses가 이제 테스트 가능한 순수 함수) |

## 7. 참고
- 변경: 신규 1(`selectVerses.ts`) + 수정 1(`ComfortChat.tsx`). 신규 의존성 0.
- **작업 트리 미커밋**(P0·P1·P2와 함께 리뷰 후 커밋 권장).
- 다음 권고: **P3(priority 가산점 주입 — 이제 저비용)** 또는 **테스트 안전망(selectVerses 단위 테스트)**.
