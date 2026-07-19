# 개선 제안 — 최소 테스트/타입 안전망 (핵심 추천 로직 우선) + 백로그 우선순위 인덱스

> 작성: 현황분석·개선점제안 에이전트 · 기준일 **2026-07-16** · 대상 커밋 **`135b404`**(HEAD)
> 범위: 아직 문서화되지 않은 마지막 축(자동 검증 부재)을 실행 수준으로 구체화하고, **누적된 8개 제안을 우선순위로 정리**해 실행으로 전환한다.

---

## 1. 프로젝트 개관 (한 문단)

한국어 성경 학습용 **하이브리드 Android 앱**(React 19 + Vite 7 + Tailwind 4 + Capacitor 8). 4개 탭, 핵심 가치는 **오늘의 위로**(감정 설문→태그 매칭 구절 추천)와 TTS 낭독. 규모 `src` 약 3,664 LOC / 컴포넌트 24개, 구절 데이터 118개.

## 2. 현재 상황 — 분석은 쌓였고, 검증·실행 장치가 없다

개발자는 comfort 콘텐츠를 빠르게 확장(창세기 11장까지) 중이나, **어떤 자동 검증도 없이 매 커밋이 반영**된다. 실측:
- 테스트 러너 **미설치**, 테스트 파일 **0건**, `test`/`typecheck` 스크립트 **없음**, CI(`.github/workflows`) **없음**.
- 핵심 추천 로직(태그 빈도 스코어링)은 `ComfortChat.tsx`에 **인라인**(순수 함수 아님) → **현재 구조로는 테스트 불가**.

### 누적 제안 백로그 (8건, 전부 미착수) — 우선순위 인덱스
| # | 제안(문서) | 축 | 심각도 | 비용 | 사용자체감 |
|---|---|---|---|---|---|
| **P0** | 부팅 크래시 방어 (`STATUS_2026-07-16_top-priority` / `PROPOSAL_boot-crash-hardening`) | 신뢰성 | **최상(복구불가 화이트스크린)** | 낮음(30–45분) | 치명 |
| P1 | fetch 실패 복원력 (`PROPOSAL_2026-07-16_fetch-resilience`) | 신뢰성 | 높음(탭 빈화면) | 중(1.5h) | 높음 |
| P2 | 접근성 lang/aria (`PROPOSAL_2026-07-16_a11y-and-document-lang`) | 사용성 | 높음(TTS 오독·조작불가) | 낮음(1h) | 높음(사용자층) |
| P3 | priority/reason 연결 (`PROPOSAL_2026-07-16_comfort-priority-wireup`) | 추천품질 | 중(수작업 사장) | 중(1.5h) | 중 |
| P4 | 추천 스코어 중복+버그 (`PROPOSAL_2026-07-16_comfort-scoring-dedup`) | 정확성/유지보수 | 중(랭킹 불일치) | 중(1.5h) | 낮–중 |
| P5 | bible_theme 지연 로드 (`PROPOSAL_2026-07-16_theme-json-lazyload`) | 성능 | 중(1.32MB/진입) | 중(1h) | 중(저사양) |
| P6 | 타입 중앙화 (`PROPOSAL_2026-07-16_type-centralization`) | 유지보수 | 중(동명이형 Verse) | 낮음(1h) | 없음(내부) |
| P7 | console 정리 (`PROPOSAL_2026-07-16_console-strip`) | 위생/보안 | 중(정보노출) | 낮음(30분) | 없음(내부) |

> **단일 권고: 지금 착수할 1건은 P0(부팅 크래시).** 배포 앱에서 복구 불가 크래시라 리뷰·이탈 직결, 비용도 낮다. 본 문서의 테스트 안전망은 P0 이후 **나머지 리팩터(P4 등)를 안전하게** 만들기 위한 토대다.

---

## 3. 제안하는 개선점 (단 1건) — 핵심 로직부터 최소 테스트 + typecheck 게이트

### 왜 우선순위가 높은가
- **회귀 방어선 0**: 위 8건 중 P4는 이미 **실존하는 잠재 버그**(‘새 말씀 보기’에서 빈도 가중치 소실)를 담고 있는데, 그걸 잡거나 리팩터를 검증할 수단이 없다.
- 개발자가 **고빈도로 데이터·로직을 바꾼다** → 사람 눈 리뷰만으로는 태그/스코어/스키마 드리프트가 새어나간다.
- 테스트를 **핵심(추천 엔진)부터** 깔면, 이후 모든 제안(특히 P3·P4)이 안전한 리팩터로 바뀐다.

### 해결안

**(A) 러너·스크립트 추가 (Vitest — Vite 네이티브, 설정 최소)**
```jsonc
// package.json (devDependencies: vitest)
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "typecheck": "tsc -b --noEmit"
}
```

**(B) 추천 로직을 순수 함수로 추출 후 테스트 (P4와 합류)**
`selectVersesByTags(verses, rawTags, {rand})`(P4 문서의 추출안)를 `src/components/comfort/selectVerses.ts`로 뽑고, `rand` 주입으로 결정론적 테스트:
```ts
// selectVerses.test.ts
import { describe, it, expect } from 'vitest';
import { selectVersesByTags } from './selectVerses';

const verses = [
  { id: 1, reference: 'A', text: 'a', tags: ['hope', 'peace'] },
  { id: 2, reference: 'B', text: 'b', tags: ['peace'] },
  { id: 3, reference: 'C', text: 'c', tags: ['comfort'] },
];
const seq = () => 0; // 결정론적 셔플

describe('selectVersesByTags', () => {
  it('빈도 가중: 더 자주 나온 태그를 가진 구절을 상위로', () => {
    const { verses: r } = selectVersesByTags(verses, ['peace','peace','hope'], { rand: seq, pick: 2 });
    expect(r[0].id).toBe(1); // peace(2회)+hope(1회) 매칭이 최상
  });
  it('매칭 부족 시 comfort 태그로 채운다', () => {
    const { verses: r } = selectVersesByTags(verses, ['nonexistent'], { rand: seq, pick: 1 });
    expect(r.some(v => v.tags.includes('comfort'))).toBe(true);
  });
  it('태그 없음 → sortedTags는 [comfort] 폴백', () => {
    const { sortedTags } = selectVersesByTags(verses, [], { rand: seq });
    expect(sortedTags).toEqual(['comfort']);
  });
});
```

**(C) 데이터 계약 테스트 (수기 캠페인 보호)**
`comfort-verses-data.json`을 로드해 불변식 검증(중복 id 없음·필수 필드·태그가 설문 어휘 부분집합). 현재는 양호하나, **성장하는 수기 데이터의 드리프트를 조기 차단**한다.
```ts
it('comfort 데이터 불변식', async () => {
  const data = (await import('../../../public/data/comfort-verses-data.json')).default;
  const ids = data.map(v => v.id);
  expect(new Set(ids).size).toBe(ids.length);            // id 유일
  data.forEach(v => expect(v.reference && v.text && v.tags?.length).toBeTruthy());
});
```

**(D) 최소 CI (`.github/workflows/ci.yml`)**
```yaml
name: ci
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
```

---

## 4. 수용 기준
1. `pnpm test`가 추천 로직 3+건, 데이터 계약 1+건을 통과.
2. `pnpm typecheck`가 타입 오류 0으로 통과(P6 타입 정리와 시너지).
3. PR에서 CI가 typecheck+lint+test를 게이트로 실행.
4. 추출 후 comfort 추천 동작 회귀 없음. `npm run build` 통과.

## 5. 영향도·비용
- 변경: `vitest` devDep + 스크립트 + `selectVerses.ts`(P4 추출) + 테스트 2–3파일 + CI 1파일. 런타임 의존성 0.
- 작업량: 약 1.5–2시간(러너+추출+테스트+CI). 위험 낮음.
- 효과: **핵심 추천 엔진에 회귀 방어선 확보** → 이후 P3·P4·P6가 안전한 리팩터로 전환, 수기 데이터 드리프트 자동 차단.

## 6. 메타 권고
누적 제안이 8건인데 전부 comfort 콘텐츠 커밋에 밀려 **미착수**다. **다음 1스텝은 P0 부팅 크래시 구현**을 강력 권고하며, 그 직후 본 테스트 안전망(B/C)을 깔면 나머지를 빠르고 안전하게 소진할 수 있다. (요청 시 P0 또는 본 안전망을 바로 구현하겠다.)
