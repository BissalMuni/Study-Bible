# 개선 제안 (다음 우선순위) — fetch 실패 복원력: 공통 로딩/에러/재시도

> 작성: 현황분석·개선점제안 에이전트 · 기준일 **2026-07-16** · 대상 커밋 **`ea15cd2`**(HEAD)
> 범위: **P0 부팅 크래시 방어**(이미 `PROPOSAL_boot-crash-hardening.md`·`STATUS_2026-07-16_top-priority.md`에 실행 수준으로 문서화됨)에 이은 **차순위 신뢰성 개선 1건**을 실측 좌표로 구체화한다.

---

## 1. 프로젝트 개관 (한 문단)

한국어 성경 학습용 **하이브리드 Android 앱**(React 19 + Vite 7 + Tailwind 4 SPA를 Capacitor 8로 패키징). 4개 탭(오늘의 위로·테마성경·어와나 암송·성경읽기). **모든 콘텐츠는 예외 없이 런타임 `fetch`로 정적 JSON/TXT를 읽어오는 데이터 주도 설계** — 즉 fetch가 화면 렌더의 전제조건이다. 규모 `src` 약 3,664 LOC / 컴포넌트 24개.

## 2. 현재 상황 (P0는 여전히 미착수)

`ea15cd2` 재검증 시 P0(무방어 `JSON.parse`·ErrorBoundary 부재)는 그대로 미반영. 본 문서는 **그 다음으로 사용자 영향이 큰 신뢰성 결함**을 다룬다. 두 건은 독립적이라 병행/순차 착수 모두 가능하다.

---

## 3. 제안하는 개선점 (단 1건) — fetch 실패 시 앱이 빈 화면으로 멈추고 복구 수단이 없다

### 문제 (실측)

앱에는 **fetch 호출 8곳**이 있는데, 실패를 사용자에게 알리고 회복시키는 처리가 거의 없다.

| fetch 지점 | 로딩 UI | 에러 UI | 재시도 | 실패 시 실제 결과 |
|---|---|---|---|---|
| `BibleReader.tsx:36` `/data/bible.json` | ❌ | ❌ | ❌ | `bibleData=null` 유지 → **빈 화면** (`.catch(console.error)`) |
| `ComfortChat.tsx:113-114` `comfort-verses*.json` | ❌ | ❌ | ❌ | `data=null` 유지 → **빈 화면** (`.catch(console.error)`) |
| `ChapterContent.tsx:55` `/biblerhv/{id}-{ch}.txt` | ❌ | ❌ | ❌ | `verses=[]` → **빈 본문**(`res.ok`는 체크하나 UI 없음) |
| `ThemeDetail.tsx:60,78` `theme-passages/bible_theme` | 부분(`loadingVerses`) | ❌ | ❌ | `.catch(console.error)` → 구절 안 뜸 |
| `AwanaRecital.tsx:26` `all_passages.json` | ✅ `isLoading` | ❌ | ❌ | 로딩 스피너만 무한, 에러 표시 없음 |
| `ThemeList.tsx:92` `themes.json` | ✅ `loading` | ✅ `error`(메시지) | ❌ | **유일하게 에러 노출**, 단 재시도 버튼 없음 |

**결론:** 8곳 중 에러를 사용자에게 알리는 곳은 `ThemeList` 1곳뿐이고, **재시도 수단은 전 앱에 0곳**이다. 모바일 웹뷰에서 네트워크 순단·저장소 지연·파일 누락이 한 번만 나도 해당 탭이 **아무 안내 없이 빈 화면으로 굳고, 사용자는 앱을 재시작하는 것 말고 방법이 없다.** 처리 방식도 컴포넌트마다 제각각(무처리/로딩만/로딩+에러)이라 유지보수 시 드리프트가 크다.

### 왜 차순위(P1)인가
- P0(부팅 크래시)는 앱 자체가 안 뜨는 문제, 본 건은 **개별 탭이 조용히 죽는 문제**. 발생 빈도는 오히려 더 높다(모든 탭이 매 진입 시 fetch).
- 데이터가 정적 파일이라 실패율은 낮지만, 웹뷰 캐시/쿼터/오프라인·부분 배포 누락에서 실제로 발생하며 **한번 발생하면 회복 UI가 없어 체감 심각도가 크다.**

---

## 4. 구체적 해결안 — 공통 `useFetchJson` 훅 + `<AsyncBoundary>` 표시 컴포넌트

각 컴포넌트의 fetch/상태를 표준화해 **로딩·에러·재시도**를 한 곳에서 처리한다. 신규 의존성 0.

### (A) `src/hooks/useFetchJson.ts` (신규)
```ts
import { useCallback, useEffect, useState } from 'react';

type State<T> = { data: T | null; loading: boolean; error: Error | null };

/** JSON/텍스트를 fetch하며 로딩·에러·재시도(reload)를 표준화. */
export function useFetchJson<T>(url: string, parse: 'json' | 'text' = 'json') {
  const [s, setS] = useState<State<T>>({ data: null, loading: true, error: null });

  const load = useCallback(() => {
    let cancelled = false;
    setS({ data: null, loading: true, error: null });
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
        return parse === 'text' ? r.text() : r.json();
      })
      .then((data) => { if (!cancelled) setS({ data, loading: false, error: null }); })
      .catch((error) => {
        if (import.meta.env.DEV) console.error('[useFetchJson]', error);
        if (!cancelled) setS({ data: null, loading: false, error });
      });
    return () => { cancelled = true; };
  }, [url, parse]);

  useEffect(load, [load]);
  return { ...s, reload: load };
}
```

### (B) `src/components/common/AsyncBoundary.tsx` (신규)
```tsx
interface Props {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  children: React.ReactNode;
}

export function AsyncBoundary({ loading, error, onRetry, children }: Props) {
  if (loading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">불러오는 중…</div>;
  }
  if (error) {
    return (
      <div className="p-8 flex flex-col items-center gap-3 text-center">
        <p className="text-gray-700 dark:text-gray-200">콘텐츠를 불러오지 못했어요.</p>
        <button onClick={onRetry} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
          다시 시도
        </button>
      </div>
    );
  }
  return <>{children}</>;
}
```

### (C) 적용 예 — `BibleReader.tsx`
```tsx
const { data: bibleData, loading, error, reload } = useFetchJson<BibleData>('/data/bible.json');
// ...
return (
  <AsyncBoundary loading={loading} error={error} onRetry={reload}>
    {/* 기존 bibleData 사용 렌더 (bibleData는 이 안에서 non-null 취급) */}
  </AsyncBoundary>
);
```
> 우선 **무처리 3곳**(`BibleReader`·`ComfortChat`·`ChapterContent`(text 모드))부터 적용해 최대 효과를 얻고, 이어 `AwanaRecital`·`ThemeDetail`·`ThemeList`를 동일 훅으로 통일해 중복 상태 로직을 제거한다.

---

## 5. 수용 기준 (Acceptance Criteria)
1. DevTools Network를 **Offline**으로 두고 각 탭 진입 → 빈 화면 대신 **"다시 시도" 버튼**이 있는 에러 뷰 노출.
2. 버튼 클릭(온라인 복귀 후) → 정상 로드되어 콘텐츠 표시(재시작 불필요).
3. 로딩 중에는 각 탭에 **"불러오는 중…"** 표시(무한 빈 화면 없음).
4. 정상 경로 회귀 없음 — 기존 데이터 렌더 동일.
5. `npm run build`(`tsc -b && vite build`) 통과.

## 6. 영향도·비용
- 변경: 신규 2파일(`useFetchJson.ts`, `AsyncBoundary.tsx`) + 수정 3~6파일(fetch 컴포넌트). 신규 의존성 0.
- 작업량: 무처리 3곳 우선 적용 기준 약 1~1.5시간 + 오프라인 수동 검증 20분. 위험 낮음(패턴 치환).
- 효과: 모든 탭이 실패를 **알리고 스스로 회복**하게 되어, 재시작 없이 이탈을 막는다. fetch 처리 방식 통일로 유지보수성도 개선.

## 7. 관계
- **선행/병행:** P0 부팅 크래시 방어(`STATUS_2026-07-16_top-priority.md`). 독립적이라 순서 무관.
- **후속:** 프로덕션 `console.*` 44건 제거(Vite `esbuild.drop`), README/`package.json` name 정리, CI(lint+typecheck) 게이트.
