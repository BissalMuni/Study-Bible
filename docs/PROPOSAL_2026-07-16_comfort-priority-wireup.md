# 개선 제안 — 수기 큐레이션 필드(`priority`/`reason`)를 추천 엔진·UI에 연결 + 스키마 정합/검증

> 작성: 현황분석·개선점제안 에이전트 · 기준일 **2026-07-16** · 대상 커밋 **`9196994`**(HEAD)
> 범위: **개발자가 직전 커밋에서 실제로 추가한 데이터**를 실측 분석해, 그 노력이 앱에 반영되도록 하는 우선순위 높은 1건.

---

## 1. 프로젝트 개관 (한 문단)

한국어 성경 학습용 **하이브리드 Android 앱**(React 19 + Vite 7 + Tailwind 4 SPA를 Capacitor 8로 패키징). 4개 탭 중 핵심 가치는 **오늘의 위로**(comfort): 감정 설문 → 태그 매칭으로 성경 구절 추천. 구절 풀은 `public/data/comfort-verses-data.json`. 규모 `src` 약 3,664 LOC.

## 2. 현재 상황 — 개발자의 실제 작업 맥락

HEAD `9196994` 커밋 메시지가 현재 작업을 드러낸다: **`bible_theme.json` 원문을 정독하며 comfort 구절을 수기 매핑**하고, 각 구절에 **새 필드 `priority`(1=최고연관)·`reason`(연결 이유)** 를 부여하며, 진행 파일 `comfort-mapping-progress.json`으로 추적 중이다(창세기 1–2장 완료, id 101–106 추가). **즉 개발자는 지금 "추천 관련도"를 손수 큐레이션하고 있다.**

그런데 실측 결과, **그 큐레이션이 앱에 전혀 반영되지 않는다.**

---

## 3. 제안하는 개선점 (단 1건) — 큐레이션한 `priority`/`reason`가 코드에서 완전히 무시된다

### 문제 (실측 확정)

| 사실 | 근거 |
|---|---|
| `priority`를 읽는 코드 0건 | `grep -rn "priority" src` = 0 |
| `reason`을 읽는 코드 0건 | `grep -rn "reason" src` = 0 |
| 추천 점수는 **태그 빈도 + 랜덤 셔플**만 사용 | `ComfortChat.tsx:238-270`(`score += (n-index)*tagCounts[tag]` → top10 → `Math.random()` 셔플) |
| 결과 화면은 `reference/text/tags`만 렌더 | `ComfortResult.tsx:158·176·181` (`reason` 미표시) |
| 신규 필드는 **106개 중 6개만** 보유 | `comfort-verses-data.json`: `priority`/`reason` 보유 6건(id 101–106), 나머지 100건 없음 → **스키마 드리프트** |
| `Verse` 타입에 필드 미선언 | `ComfortChat.tsx:60`·`ComfortResult.tsx:6`의 `interface Verse{ id;reference;text;tags }` — `priority`/`reason` 없음 |

**결론:** 개발자가 성경을 정독하며 부여한 **"priority 1 = 최고연관" 신호는 추천 순위에 0의 영향**을 주고, 공들여 쓴 **`reason`("이 구절이 왜 위로가 되는가")은 사용자에게 한 번도 보이지 않는다.** 즉 **지금 진행 중인 수작업이 런타임 가치로 이어지지 않는다.** 앞으로 66권을 정독해 채워 넣을 이 노력이 계속 사장된다.

### 왜 우선순위가 높은가
- **앱의 핵심 가치(추천 관련도)에 직접 작용**하며, 개발자의 **현재 진행 중인 작업을 즉시 살린다**(ROI·착수 확률 최상).
- 데이터는 이미 쌓이는 중 — 엔진만 연결하면 회고적으로 전체가 개선된다.
- 저위험(가산점·표시 추가), 신규 의존성 0.

---

## 4. 구체적 해결안

### (A) 타입에 필드 반영 (옵셔널)
```ts
// types/index.ts (또는 comfort 전용 타입)
export interface ComfortVerse {
  id: number; reference: string; text: string; tags: string[];
  priority?: number;   // 1=최고연관 … 클수록 낮음. 미지정=중립
  reason?: string;     // 이 구절이 위로가 되는 이유(사용자 노출 후보)
}
```

### (B) 추천 스코어에 `priority` 반영 — 큐레이션을 랭킹에 주입
`ComfortChat.tsx`의 점수 계산에 priority 가산점을 더한다(태그 매칭이 동점일 때 큐레이션이 우선순위를 가르도록):
```ts
const PRIORITY_BONUS: Record<number, number> = { 1: 6, 2: 3, 3: 1 };
// verse별 score 계산 시:
score += PRIORITY_BONUS[verse.priority ?? 99] ?? 0;
```
> 가중치는 태그 최고빈도 항의 스케일(≈`sortedTags.length`)과 균형을 맞춰 튜닝. priority 미보유(구형 100건)는 0 가산이므로 **회귀 없음**(기존 순위 유지), 신규 큐레이션분만 상승.
> ※ 이 스코어 로직은 `processTagsAndShowResult`·`handleNewVerse` **2곳에 중복**(별도 문서 `PROPOSAL_2026-07-16_comfort-scoring-dedup.md`)이므로, **먼저 `selectVersesByTags`로 추출한 뒤 그 한 곳에 priority를 넣으면** 두 경로에 일관 적용된다(시너지).

### (C) `reason`을 결과 UI에 노출 (선택, 사용자 가치 큼)
`ComfortResult.tsx`의 구절 카드에 `reason`이 있으면 부가 설명으로 표시:
```tsx
{verse.reason && (
  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">💡 {verse.reason}</p>
)}
```

### (D) 데이터 스키마·QA 검증 스크립트 (드리프트/오진 방지)
`comfort-mapping-progress.json`의 노트를 코드로 검증하는 최소 스크립트를 둔다:
- 모든 항목이 `{id,reference,text,tags}` 필수 + `priority`/`reason` 타입 확인, `id` 유일성.
- **개발자의 "verse 번호 6절 오프셋" 경고는 실데이터로 재현되지 않음**을 본 분석에서 확인(창세기 1장 = 절 1..31 정상 31개; `items≠maxVerse`인 11개 챕터는 오프셋이 아니라 **희소 선택**). → 해당 경고 노트는 **폐기 또는 재검증** 대상. 잘못된 보정 공식(`실제 = data - floor((data-1)/6)`)을 참조에 적용하면 오히려 **정상 절 번호를 훼손**한다(예: 창 1:31 → 26). 스크립트로 "bible_theme 절 번호 vs 실제 장 절수" 대조를 자동화해 근거 없는 수기 보정을 차단한다.

---

## 5. 수용 기준 (Acceptance Criteria)
1. `priority: 1` 구절이 동일 태그 매칭 상황에서 미지정 구절보다 **상위 노출**(가산 반영 확인).
2. `priority` 미보유(구형 100건)만 있는 응답 → 기존 추천 순위 **회귀 없음**.
3. `reason` 보유 구절이 결과 화면에 설명으로 표시된다(C 채택 시).
4. 검증 스크립트가 스키마 위반·중복 id를 검출하고, 오프셋 경고의 진위를 데이터로 판정한다.
5. `npm run build`(`tsc -b && vite build`) 통과.

## 6. 영향도·비용
- 변경: `ComfortChat.tsx`(스코어) + `ComfortResult.tsx`(표시) + 타입 + 검증 스크립트 1. 신규 의존성 0.
- 작업량: 약 1시간(B+C) + 30분(D). 위험 낮음(가산·표시 추가).
- 효과: **진행 중인 수기 큐레이션이 즉시 추천 품질로 전환** + `reason`으로 UX 설득력↑ + 스키마/오진 방지로 데이터 신뢰성↑.

## 7. 관계 (미착수 부채 링크)
- **강한 시너지:** `PROPOSAL_2026-07-16_comfort-scoring-dedup.md` — 스코어 중복을 먼저 `selectVersesByTags`로 통일하면 priority 주입 지점이 1곳으로 수렴.
- 독립·미착수: P0 부팅 크래시(`STATUS_2026-07-16_top-priority.md`), P1 fetch 복원력, bible_theme 지연 로드, 타입 중앙화 문서 각 1건.
