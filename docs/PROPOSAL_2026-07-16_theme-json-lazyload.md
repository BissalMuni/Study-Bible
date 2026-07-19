# 개선 제안 — 테마성경 `bible_theme.json`(1.32MB) 전체 로드 → 책 단위 지연 로드

> 작성: 현황분석·개선점제안 에이전트 · 기준일 **2026-07-16** · 대상 커밋 **`7fe101f`**(HEAD)
> 범위: 신뢰성·정확성 3건(별도 문서) 이후, **성능/메모리** 축의 우선순위 높은 1건을 실측 좌표로 구체화.

---

## 1. 프로젝트 개관 (한 문단)

한국어 성경 학습용 **하이브리드 Android 앱**(React 19 + Vite 7 + Tailwind 4 SPA를 Capacitor 8로 패키징). 4개 탭(오늘의 위로·테마성경·어와나 암송·성경읽기). 콘텐츠는 런타임 `fetch`로 정적 JSON/TXT를 읽는 데이터 주도 설계. 규모 `src` 약 3,664 LOC / 컴포넌트 24개. **대상 단말은 저사양 Android WebView 포함.**

## 2. 현재 상황

HEAD 최근 커밋은 계속 comfort 설문 확장. 앞서 문서화한 미착수 부채 — P0 부팅 크래시, P1 fetch 복원력, ComfortChat 추천 로직 중복 — 은 그대로. 본 문서는 아직 실행 수준으로 구체화되지 않은 **성능/메모리** 개선을 다룬다.

---

## 3. 제안하는 개선점 (단 1건) — 테마 상세 진입마다 1.32MB 전체 JSON을 로드·파싱

### 문제 (실측)

`public/data` 파일 크기:

| 파일 | 크기 |
|---|---|
| **`bible_theme.json`** | **1,348,356 B ≈ 1.32 MB** |
| all_passages.json | 207,963 B |
| theme-passages.json | 68,372 B |
| themes.json | 32,536 B |
| (그 외) | ≤ 39 KB |

`bible_theme.json`은 **다음으로 큰 파일의 6.5배**이며 구조는 `{ [bookId]: { [chapter]: {verse, text}[] } }` — 사실상 성경 본문 전체 코퍼스다.

`ThemeDetail.tsx:77-84`는 이 파일을 **컴포넌트 마운트 시 통째로** 받아 메모리에 파싱한다:
```tsx
useEffect(() => {
  fetch('/data/bible_theme.json')          // ← 1.32MB 전량
    .then(res => res.json())               // ← 전량 JSON 파싱 → 대형 객체 상주
    .then(data => setBibleThemeData(data))
    .catch(console.error);
}, []);
```
그런데 실제 사용은 **구절 클릭 시 딱 한 책/한 장**만 조회한다(`ThemeDetail.tsx:104-107`):
```tsx
const bookData = bibleThemeData[passage.bookId.toString()];
const chapterData = bookData[passage.chapter.toString()];
```

즉 **한 장(수 KB)을 보기 위해 매 진입마다 1.32MB를 전송·파싱**한다. `ThemeDetail`은 테마를 열 때마다 마운트되므로 **테마를 열 때마다 반복**된다(WebView가 HTTP 캐시로 전송은 아껴도, **JSON 파싱과 대형 객체의 메모리 상주 비용은 매번 발생**).

### 영향
- **저사양 Android WebView**에서 1.32MB 파싱 = 진입 지연(수백 ms~) + GC 압박 + 메모리 스파이크. 하이브리드 앱 체감 성능의 핵심 저해 요인.
- 첫 진입에서 사용자가 아무 구절도 안 눌러도 전량 로드 → 낭비.

### 왜 우선순위가 높은가
- 데이터가 계속 커지는 방향(성경 본문)이라 부담이 단조 증가.
- 신뢰성/정확성 3건과 **독립**이며, 사용자 체감(진입 속도)에 직접 작용.
- 정적 파일 분할이라 런타임 위험이 낮고 되돌리기 쉽다.

---

## 4. 구체적 해결안 — 책 단위 분할 + 지연 로드 + 캐시

### (A) 빌드/준비 스크립트로 책 단위 분할 (신규 `scripts/split-bible-theme.mjs`)
```js
// node scripts/split-bible-theme.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const src = JSON.parse(readFileSync('public/data/bible_theme.json', 'utf8'));
mkdirSync('public/data/bible_theme', { recursive: true });
for (const [bookId, chapters] of Object.entries(src)) {
  writeFileSync(`public/data/bible_theme/${bookId}.json`, JSON.stringify(chapters));
}
// 결과: public/data/bible_theme/{1..66}.json (책당 평균 ~20KB)
```
> 원본 `bible_theme.json`은 분할 산출물 검증 후 제거하거나, 당분간 보관하되 앱에서 참조 제거.

### (B) `ThemeDetail`에서 전량 로드 제거 → 클릭 시 해당 책만 로드 + 메모리 캐시
```tsx
// 파일 상단(모듈 스코프): 세션 내 책 캐시 — 같은 책 재요청 시 재fetch 방지
const bookCache = new Map<number, Record<string, { verse: number; text: string }[]>>();

async function loadBook(bookId: number) {
  const hit = bookCache.get(bookId);
  if (hit) return hit;
  const res = await fetch(`/data/bible_theme/${bookId}.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  bookCache.set(bookId, data);
  return data;
}
```
```tsx
// 기존 useEffect(fetch 1.32MB) 삭제.
// handlePassageClick 내부: bibleThemeData[bookId] 대신
const bookData = await loadBook(passage.bookId);        // 필요한 책만(~20KB)
const chapterData = bookData[passage.chapter.toString()];
// 이후 filter(startVerse..endVerse) 로직은 동일
```
> 마운트 시 0바이트, 첫 클릭 때만 해당 책(~수십 KB) 로드, 같은 책 재클릭은 캐시 히트. 로딩 표시는 기존 `loadingVerses`(`ThemeDetail.tsx:48`) 재사용.

---

## 5. 수용 기준 (Acceptance Criteria)
1. 테마 상세 진입 시 `bible_theme.json`(1.32MB) 요청이 **더 이상 발생하지 않는다**(Network 탭 확인).
2. 구절 클릭 시 `/data/bible_theme/{bookId}.json`만 요청되고 본문이 동일하게 표시된다(내용 회귀 없음).
3. 같은 책의 다른 장/구절 재클릭 시 추가 네트워크 요청 없음(캐시 히트).
4. 분할 파일 총합·구절 내용이 원본과 일치(스크립트 검증).
5. `npm run build`(`tsc -b && vite build`) 통과.

## 6. 영향도·비용
- 변경: 신규 스크립트 1 + `ThemeDetail.tsx` 로드부 수정 + `public/data/bible_theme/*.json` 산출물. 신규 런타임 의존성 0.
- 작업량: 약 1시간(분할 스크립트+치환+검증). 위험 낮음(정적 분할, 조회 로직 보존).
- 효과: 테마 진입당 파싱 **1.32MB → ~20KB(≈98% 감소)**, 저사양 단말 진입 지연·메모리 스파이크 완화. 미클릭 진입 시 전송 0.

## 7. 관계 (미착수 부채 링크)
- P0 부팅 크래시: `STATUS_2026-07-16_top-priority.md` (최우선, 미착수)
- P1 fetch 복원력: `PROPOSAL_2026-07-16_fetch-resilience.md` (미착수) — 본 건의 per-book fetch에 그 `AsyncBoundary`/에러·재시도 패턴을 함께 적용하면 시너지.
- ComfortChat 추천 로직: `PROPOSAL_2026-07-16_comfort-scoring-dedup.md` (미착수)
- 후속 저비용: 프로덕션 `console.*` 44건 제거(특히 `ThemeDetail`이 구절 데이터 로깅), README/`package.json` name 정리, CI(lint+typecheck).
