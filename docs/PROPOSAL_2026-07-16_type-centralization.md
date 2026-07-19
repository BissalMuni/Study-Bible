# 개선 제안 — 타입 중복 정리 + 동명이형(`Verse`) 충돌 해소 + 타입 게이트

> 작성: 현황분석·개선점제안 에이전트 · 기준일 **2026-07-16** · 대상 커밋 **`9196994`**(HEAD)
> 범위: 유지보수성/타입안전성 축의 우선순위 높은 1건. **PROJECT_ANALYSIS §3-8의 "타입 승격" 처방을 실측으로 정정**하고 실행 수준으로 구체화.

---

## 1. 프로젝트 개관 (한 문단)

한국어 성경 학습용 **하이브리드 Android 앱**(React 19 + Vite 7 + Tailwind 4 SPA를 Capacitor 8로 패키징). 4개 탭(오늘의 위로·테마성경·어와나 암송·성경읽기). 콘텐츠는 런타임 `fetch`로 정적 JSON/TXT를 읽는 데이터 주도 설계. 규모 `src` 약 3,664 LOC / 컴포넌트 24개. `types/index.ts`에 공용 타입이 있으나 **컴포넌트가 로컬 재정의를 남발**한다.

## 2. 현재 상황

HEAD 최근 커밋(`9196994` 등)은 계속 **comfort 콘텐츠 확장**. 앞서 문서화한 4건(P0 부팅 크래시, P1 fetch 복원력, ComfortChat 추천 로직 중복, bible_theme 지연 로드)은 **모두 미착수**. CI·테스트·lint 게이트는 **전무**(`.github/workflows` 없음, `package.json`에 test 스크립트 0). 즉 **타입 회귀를 잡아줄 자동 방어선이 없는 상태에서 hot 파일(ComfortChat)이 매 커밋 커진다.** 본 문서는 그 위험을 줄이는 타입 정리를 다룬다.

---

## 3. 제안하는 개선점 (단 1건) — 로컬 타입 중복, 특히 이름은 같고 형태가 다른 `Verse`

### 문제 (실측 대조)

| 이름 | 위치 | 형태 | 판정 |
|---|---|---|---|
| `Verse` (canonical) | `types/index.ts:30` | `{ verse:number; content:string; english? }` | 성경**읽기**용 |
| `Verse` (재정의) | `ComfortChat.tsx:60`, `ComfortResult.tsx:6` | `{ id:number; reference:string; text:string; tags:string[] }` | **위로 추천**용 — 형태 완전 상이 |
| `BibleBook` | `BibleReader.tsx:9`, `ChapterContent.tsx:8` | `{ id:number; name:string; chapters:number }` | 두 파일 **완전 동일 복제** |
| `Book` (canonical) | `types/index.ts:23` | `{ id?; name; english?; chapters? }` | `BibleBook`과 유사·비동일(옵셔널) |
| `EncouragementMessage` | `ComfortChat.tsx:67`, `ComfortResult.tsx` | `{ message:string; closing:string }` | 두 파일 **완전 동일 복제** |

**핵심 위험 — 동명이형 `Verse`:** 공용 `Verse`와 comfort의 `Verse`는 **이름만 같고 필드가 하나도 겹치지 않는다**(`content` vs `text`+`tags`). 지금은 로컬 정의라 우연히 격리돼 있지만, 누군가 comfort 파일에서 `import { Verse } from '../../types'`를 하는 순간 `.text`/`.tags` 접근이 조용히 깨진다. 이는 **PROJECT_ANALYSIS §3-8가 권한 "`Verse`를 types로 승격 후 import 통일"을 그대로 적용하면 오히려 버그를 만든다**는 뜻 — 두 개념을 **분리 명명**해야 한다.

### 왜 우선순위가 높은가
- 중복이 **가장 활발히 편집되는 파일(ComfortChat)** 에 몰려 있어, 설문/구절 확장 때마다 정의 드리프트 위험이 곱해진다.
- 타입 회귀를 잡을 **CI·테스트가 0**이라, 로컬 재정의 간 불일치는 런타임에 가서야 드러난다.
- 저비용·저위험(형태 보존 이동 + 이름 정리)인데 안전성 이득이 크다.

---

## 4. 구체적 해결안 — 개념별 단일 명명 + import 통일 + 최소 게이트

### (A) `types/index.ts`에 개념을 **분리 명명**해 단일 정의
```ts
// 성경 본문 한 절 (읽기)  — 기존 Verse를 명확히 개명(별칭 유지 가능)
export interface BibleVerse { verse: number; content: string; english?: string }

// 위로 추천 구절 (comfort)  — 형태가 다른 별개 개념
export interface ComfortVerse { id: number; reference: string; text: string; tags: string[] }
export interface EncouragementMessage { message: string; closing: string }

// 성경 읽기 트리의 책
export interface BibleBook { id: number; name: string; chapters: number }
```
> `Verse`라는 모호한 이름은 두 구체 개념으로 대체한다. 기존 코드 충격을 줄이려면 `export type Verse = BibleVerse`(deprecated 주석) 별칭을 한시적으로 둘 수 있으나, comfort 쪽은 반드시 `ComfortVerse`를 쓰도록 한다.

### (B) 로컬 재정의 제거 → import 통일
```tsx
// ComfortChat.tsx / ComfortResult.tsx: 로컬 interface Verse/EncouragementMessage 삭제
import type { ComfortVerse, EncouragementMessage } from '../../types';
// 파일 내 Verse → ComfortVerse 로 치환

// BibleReader.tsx / ChapterContent.tsx: 로컬 interface BibleBook 삭제
import type { BibleBook } from '../../types';
```
> `ChapterContent`의 `VerseData{verse,content}`는 `BibleVerse`와 동형이므로 `BibleVerse`로 통일 가능.

### (C) 재발 방지 최소 게이트 (권장, 별도 커밋 가능)
- `package.json`에 `"typecheck": "tsc -b --noEmit"` 스크립트 추가.
- GitHub Actions 최소 워크플로: PR에서 `pnpm install` → `typecheck` + `eslint .` 실행. (테스트 도입 전이라도 타입/린트만으로 로컬 재정의 드리프트를 조기 차단.)

---

## 5. 수용 기준 (Acceptance Criteria)
1. `grep -rn "interface Verse\|interface BibleBook\|interface EncouragementMessage" src/components` 결과 **0건**(모두 `types/index.ts`로 이동).
2. comfort 파일은 `ComfortVerse`를, bible 파일은 `BibleVerse`/`BibleBook`을 import해 사용하며 형태 불일치 컴파일 에러 없음.
3. 동작 회귀 없음(순수 타입 이동). `npm run build`(`tsc -b && vite build`) 통과.
4. (C 채택 시) CI에서 typecheck+lint가 그린.

## 6. 영향도·비용
- 변경: `types/index.ts` + 재정의 4개 파일(ComfortChat/ComfortResult/BibleReader/ChapterContent) import 치환. 신규 의존성 0.
- 작업량: 약 40~60분(치환+빌드 확인). 위험 낮음(형태 보존). (C)는 추가 30분.
- 효과: **동명이형 `Verse` 충돌이라는 잠재 버그 원천 제거** + 정의 단일화로 hot 파일 드리프트 차단 + (선택) 자동 게이트로 회귀 예방.

## 7. 관계 (미착수 부채 링크)
- P0 부팅 크래시(`STATUS_2026-07-16_top-priority.md`), P1 fetch 복원력(`PROPOSAL_2026-07-16_fetch-resilience.md`), ComfortChat 추천 로직(`PROPOSAL_2026-07-16_comfort-scoring-dedup.md`), bible_theme 지연 로드(`PROPOSAL_2026-07-16_theme-json-lazyload.md`) — 모두 독립·미착수.
- 본 건은 특히 ComfortChat 추천 로직 리팩터와 **함께 하면 시너지**(추출한 `selectVerses`가 `ComfortVerse`를 인자로 받게 되어 타입이 한 곳으로 수렴).
- 후속 저비용: 프로덕션 `console.*` 44건 제거(`esbuild.drop`), README/`package.json` name(`react_app_new`) 정리.
