# 개선 제안 — ComfortChat 구절 추천 로직 중복 제거 + 가중치 불일치(잠재 버그) 수정

> 작성: 현황분석·개선점제안 에이전트 · 기준일 **2026-07-16** · 대상 커밋 **`7fe101f`**(HEAD)
> 범위: **개발자가 현재 활발히 확장 중인 파일(`ComfortChat.tsx`)** 내부의 우선순위 높은 개선 1건을 실측 좌표로 구체화.

---

## 1. 프로젝트 개관 (한 문단)

한국어 성경 학습용 **하이브리드 Android 앱**(React 19 + Vite 7 + Tailwind 4 SPA를 Capacitor 8로 패키징). 4개 탭(오늘의 위로·테마성경·어와나 암송·성경읽기). 콘텐츠는 런타임 `fetch`로 정적 JSON/TXT를 읽는 데이터 주도 설계. 규모 `src` 약 3,664 LOC / 컴포넌트 24개.

## 2. 현재 상황 — 최근 커밋은 전부 comfort 설문 확장

HEAD 3개 커밋이 모두 **ComfortChat 설문 분기 확장**이다(`ea15cd2` negative, `63b42ea` positive, `7fe101f` neutral/desire). 즉 **이 앱에서 지금 실제로 손대는 뜨거운 파일은 `ComfortChat.tsx`(503 LOC, 최대 파일)이며 계속 커지고 있다.** (참고: P0 부팅 크래시·P1 fetch 복원력 제안은 각각 별도 문서로 남겼고 여전히 미착수.) 본 문서는 **개발자가 지금 밟고 있는 코드 경로**에서 ROI가 가장 큰 개선을 다룬다.

---

## 3. 제안하는 개선점 (단 1건) — 추천 스코어링 로직이 2곳에 중복되고, 한쪽에서 빈도 가중치가 소실된다

### 문제 A — 동일 스코어링 알고리즘의 이중 구현 (드리프트 위험)

태그→구절 점수화·상위10·셔플·부족분 기본채움 로직이 **두 함수에 거의 그대로 복제**돼 있다.

| 위치 | 함수 | 역할 |
|---|---|---|
| `ComfortChat.tsx:208-284` | `processTagsAndShowResult` | 최초 결과 산출 |
| `ComfortChat.tsx:315-350` | `handleNewVerse` | "새 말씀 보기" 재산출 |

두 블록은 `data.verses.map(...score...)` → `filter(score>0)` → `sort` → `slice(0,10)` → `Math.random()` 셔플 → `slice(0,5)` → `comfort` 태그 기본채움까지 **구조가 동일**하다. 설문이 계속 확장돼 태그·가중치를 조정할 때마다 **두 곳을 함께 고쳐야 하며**, 한쪽만 바뀌면 "결과 화면"과 "새 말씀"이 다른 로직으로 갈라진다.

### 문제 B — 그 중복이 이미 **가중치 불일치(잠재 버그)** 를 낳고 있다

- `processTagsAndShowResult`는 **원시 `allTags`**(중복 포함)로 `tagCounts`를 만든다 → 자주 나온 태그일수록 count가 커져 `score += (n-index) * tagCounts[tag]` 의 **빈도 가중치가 실제로 작동**한다.
- 반면 `handleNewVerse`는 **`collectedTags`(=이미 dedup·정렬된 `sortedTags`)** 로 `tagCounts`를 만든다(`ComfortChat.tsx:317-320`). 이 배열은 태그가 유일하므로 **모든 `tagCounts[tag]===1`** → 빈도 가중치가 **소실**된다.

즉 **같은 감정 프로필인데 "결과 화면"과 "새 말씀 보기"의 랭킹 기준이 다르다.** 사용자가 새 말씀을 눌렀을 때 빈도 가중이 사라진 다른 순위로 뽑히는, 눈에 잘 안 띄지만 명백한 로직 불일치다. 설문 확장으로 태그 수가 늘수록 괴리가 커진다.

### 왜 우선순위가 높은가
- **활성 개발 경로**: 최근 3커밋이 전부 이 파일. 여기의 부채는 앞으로의 모든 설문 확장 작업에 곱해져 비용이 누적된다.
- **정확도 직결**: 추천 품질이 앱의 핵심 가치(“오늘의 위로”)인데, B는 그 품질을 조용히 저해한다.
- **테스트 가능성 0 → 확보**: 현재 추천 로직이 컴포넌트 이벤트 핸들러에 묶여 단위 테스트가 불가능하다. 순수 함수로 추출하면 회귀 방지 테스트를 붙일 수 있다.

---

## 4. 구체적 해결안 — 순수 함수 `selectVersesByTags` 1개로 통일

### (A) `src/components/comfort/selectVerses.ts` (신규, 순수 함수)
```ts
import type { Verse } from '../../types'; // 없으면 ComfortChat의 Verse를 types로 승격

/**
 * 태그 목록(중복 포함 가능)으로 구절을 점수화해 상위 N개를 선택.
 * 빈도 가중치는 rawTags의 중복 횟수에서 계산한다(핵심: dedup된 배열을 넣지 말 것).
 */
export function selectVersesByTags(
  verses: Verse[],
  rawTags: string[],
  opts: { pick?: number; pool?: number; rand?: () => number } = {},
): { verses: Verse[]; sortedTags: string[] } {
  const pick = opts.pick ?? 5;
  const pool = opts.pool ?? 10;
  const rand = opts.rand ?? Math.random;

  const tagCounts: Record<string, number> = {};
  rawTags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([t]) => t);

  const scored = verses.map(verse => {
    let score = 0;
    sortedTags.forEach((tag, i) => {
      if (verse.tags.includes(tag)) score += (sortedTags.length - i) * (tagCounts[tag] || 1);
    });
    return { verse, score };
  });

  const top = scored.filter(v => v.score > 0).sort((a, b) => b.score - a.score)
    .slice(0, pool).map(v => v.verse);
  let result = [...top].sort(() => rand() - 0.5).slice(0, pick);

  if (result.length < pick) {
    const fill = verses
      .filter(v => v.tags.includes('comfort') && !result.some(r => r.id === v.id))
      .sort(() => rand() - 0.5).slice(0, pick - result.length);
    result = [...result, ...fill];
  }
  return { verses: result, sortedTags: sortedTags.length ? sortedTags : ['comfort'] };
}
```

### (B) 두 호출부를 이 함수로 치환
```tsx
// processTagsAndShowResult 내부 (raw allTags 전달 → 빈도 가중치 유지)
const { verses, sortedTags } = selectVersesByTags(data.verses, allTags);
setCollectedTags(sortedTags);
setRecommendedVerses(verses);

// handleNewVerse: 원시 태그를 보존해 전달해야 B가 고쳐진다.
// collectedTags(dedup본) 대신, answers에서 raw 태그를 다시 모으거나
// 최초 산출 시 rawTags를 state(useRef)로 보관해 재사용한다.
const { verses } = selectVersesByTags(data.verses, rawTagsRef.current);
setRecommendedVerses(verses);
```
> 핵심: `handleNewVerse`가 **dedup된 `collectedTags`가 아니라 원시 태그**를 넘기도록 바꿔야 문제 B가 실제로 해결된다. 최초 산출 때의 `allTags`를 `useRef`로 보관해 재사용하는 방식을 권장.

---

## 5. 수용 기준 (Acceptance Criteria)
1. 동일 설문 응답에 대해 **"결과 화면"과 "새 말씀 보기"가 같은 가중치 기준**으로 후보를 뽑는다(빈도 가중 일관).
2. 스코어링 로직이 `selectVersesByTags` **한 곳에만** 존재(중복 0).
3. `rand`를 주입해 결정론적 단위 테스트 최소 3건(빈도 가중, 부족분 채움, 태그 없음→comfort 폴백) 추가.
4. 기존 결과 화면 UX 회귀 없음. `npm run build`(`tsc -b && vite build`) 통과.

## 6. 영향도·비용
- 변경: 신규 1파일(`selectVerses.ts`) + `ComfortChat.tsx` 두 함수 슬림화(≈503→약 430 LOC). 신규 의존성 0.
- 작업량: 약 1~1.5시간(추출+치환+테스트). 위험 낮음(로직 보존 리팩터, B만 의도적 수정).
- 효과: **활성 개발 파일의 유지보수 비용 절감 + 추천 정확도 불일치(잠재 버그) 제거 + 핵심 로직 테스트 가능화**.

## 7. 관계 (미착수 부채 링크)
- P0 부팅 크래시: `STATUS_2026-07-16_top-priority.md` (여전히 미착수, 최우선)
- P1 fetch 복원력: `PROPOSAL_2026-07-16_fetch-resilience.md` (미착수)
- 본 건은 위 둘과 독립. **개발자의 현재 작업 경로에 정확히 놓여 있어 착수 확률·즉효성이 가장 높다.**
