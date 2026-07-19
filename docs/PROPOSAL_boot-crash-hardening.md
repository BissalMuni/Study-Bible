# 개선 제안 P0 — 부팅 크래시 방어 (localStorage 파싱 + 최상위 ErrorBoundary)

> 작성: 현황분석·개선점제안 에이전트 · 기준일 2026-07-15 · 대상 커밋 `c2952dd`
> 범위: **우선순위 1위 개선점 1건**을 즉시 착수 가능한 수준으로 구체화.
> 근거는 모두 실제 코드 대조(파일:라인)로 확정.

---

## 1. 프로젝트 현황 요약 (한 문단)

한국어 성경 학습용 **하이브리드 모바일 앱**(React 19 + Vite 7 + Tailwind 4 SPA를 Capacitor 8로 감싼 Android 앱). 4개 탭(오늘의 위로·테마성경·어와나 암송·성경읽기)을 제공하며, 콘텐츠는 `public/data`·`public/bible*`의 정적 JSON/TXT/MP3를 런타임 `fetch`로 로드한다. 상태는 Context 2종(GlobalState·Ad) + `localStorage` 영속화, TTS는 `window.AndroidAudio` 네이티브 브리지 우선 Web Speech 폴백. 규모 `src` 약 3,625 LOC / 컴포넌트 24개. **테스트·CI·ErrorBoundary 없음.**

---

## 2. 제안하는 개선점 (단 1건)

### 앱을 부팅 불능 상태로 만드는 단일 크래시 지점 — `GlobalStateContext`의 무방어 `JSON.parse` + 폴백 UI 부재

**문제 좌표:** `src/contexts/GlobalStateContext.tsx:23-26`

```tsx
const [state, setState] = useState<GlobalState>(() => {
  const saved = localStorage.getItem('bibleApp_globalState');
  return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState; // ← try/catch 없음
});
```

이 `JSON.parse`는 **앱 최상위 프로바이더(`GlobalStateProvider`)의 `useState` 초기화 함수** 안에서 실행된다(`App.tsx:185`에서 트리 최상단에 배치). 저장값이 손상되면:

1. 첫 렌더 도중 예외가 던져진다.
2. 앱에 **ErrorBoundary가 전혀 없다**(`grep` 결과 0건, `main.tsx`도 순수 `createRoot().render()`뿐). → React가 트리 전체를 언마운트 → **완전한 화이트스크린**.
3. 손상값은 `localStorage`에 그대로 남아 **재실행할 때마다 같은 지점에서 다시 크래시**한다. 사용자가 스스로 벗어날 방법이 없다(앱 데이터 삭제/재설치 외 복구 불가). 배포된 Android 앱에서는 치명적.

**손상이 실제로 발생하는 경로(가설 아님, 흔한 실운영 시나리오):**
- 앱 강제 종료/프로세스 킬로 인한 쓰기 중단(부분 기록).
- 버전 간 스키마 변경으로 남은 이전 포맷.
- WebView 저장소 쿼터 초과·손상, OS/기기 수준 데이터 이상.

### 기존 v2 분석 문서 정정 (정확도 강화)
`docs/PROJECT_ANALYSIS.md`의 §3-6은 "localStorage 미방어 **3곳**(`GlobalStateContext:25`·`AdContext:77`·`adConfig:95`)"이라 기술했으나, 실제 코드 재확인 결과 **`adConfig.ts:91-103`과 `AdContext.tsx:73-83`은 이미 `try/catch`로 방어**되어 있다. **실제 무방어 지점은 `GlobalStateContext.tsx:25` 단 1곳**이다. 즉 부채 규모는 더 작지만, 그 1곳이 **가장 치명적인 위치(루트·부팅 경로)**라 우선순위는 오히려 최상위(P0)다.

| 지점 | 방어 여부 | 심각도 |
|---|---|---|
| `GlobalStateContext.tsx:25` | ❌ 무방어 | **최상(루트·부팅 크래시·복구 불가)** |
| `AdContext.tsx:77` | ✅ try/catch 있음 | — |
| `adConfig.ts:95` | ✅ try/catch 있음 | — |

---

## 3. 구체적 해결안

두 겹의 방어를 함께 넣는다. (A) 손상값을 안전하게 무시(1차 방어), (B) 그래도 뚫리는 임의 예외에 대한 폴백 UI(심층 방어).

### (A) `safeParse` 헬퍼 + 적용

새 파일 `src/utils/storage.ts`:

```ts
/** localStorage 등에서 읽은 문자열을 안전하게 파싱. 손상 시 fallback 반환. */
export function safeParse<T>(raw: string | null, fallback: T): T {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
```

`GlobalStateContext.tsx` 수정:

```tsx
import { safeParse } from '../utils/storage';
// ...
const [state, setState] = useState<GlobalState>(() => {
  const saved = localStorage.getItem('bibleApp_globalState');
  return { ...defaultState, ...safeParse<Partial<GlobalState>>(saved, {}) };
});
```

> 손상값이 있어도 `defaultState`로 안전하게 부팅되고, 다음 저장(`useEffect`) 때 정상값으로 자가 치유된다.
> (선택) `AdContext`/`adConfig`의 기존 try/catch도 동일 헬퍼로 통일하면 중복 제거 + 일관성 확보. 필수는 아님.

### (B) 최상위 ErrorBoundary + 자가 복구

새 파일 `src/components/common/ErrorBoundary.tsx`:

```tsx
import React from 'react';

interface State { hasError: boolean; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // dev에서만 상세 로깅 (프로덕션 콘솔 오염 방지)
    if (import.meta.env.DEV) console.error('[ErrorBoundary]', error);
  }

  private handleReset = () => {
    // 부팅 크래시의 주 원인인 손상 상태를 제거 후 새로고침
    try { localStorage.removeItem('bibleApp_globalState'); } catch { /* noop */ }
    location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-gray-50 dark:bg-gray-900">
          <p className="text-gray-700 dark:text-gray-200">
            일시적인 오류가 발생했어요. 다시 시도해 주세요.
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white"
          >
            다시 시작
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

`main.tsx`에서 트리 최상단을 감싼다:

```tsx
import { ErrorBoundary } from './components/common/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
```

> "다시 시작" 버튼은 **손상 키를 지우고 리로드**하므로, 만에 하나 (A)를 우회하는 다른 손상 상황에서도 사용자가 스스로 앱을 정상 부팅 상태로 되돌릴 수 있다 — 재설치 불필요.

---

## 4. 수용 기준 (Acceptance Criteria)

1. DevTools 콘솔에서 `localStorage.setItem('bibleApp_globalState','{잘못된json')` 실행 후 새로고침 → **화이트스크린 없이 정상 부팅**(기본 설정으로).
2. 렌더 중 임의 예외 강제 발생 시 → 화이트스크린 대신 **폴백 UI + "다시 시작" 버튼** 표시, 버튼 클릭 시 정상 복구.
3. 정상 저장값이 있을 때 → 기존 설정(폰트/다크모드/TTS 등)이 그대로 유지됨(회귀 없음).
4. `npm run build`(= `tsc -b && vite build`) 타입/빌드 통과.

## 5. 영향도·비용

- **변경 파일:** 신규 2개(`utils/storage.ts`, `components/common/ErrorBoundary.tsx`) + 수정 2개(`GlobalStateContext.tsx`, `main.tsx`). 신규 의존성 0.
- **작업량:** 약 30–45분(구현) + 15분(수동 검증). 위험 낮음(순수 추가 + 방어적 변경).
- **효과:** 배포 앱에서 발생 시 리뷰·이탈로 직결되는 **복구 불가 부팅 크래시**를 근절. ROI 최상.

## 6. 후속(별도 티켓, 본 제안 범위 밖)

- fetch 실패 공통 로딩/에러 UI (PROJECT_ANALYSIS §3-4/5).
- 프로덕션 `console.*` 44건 제거(Vite `esbuild.drop`) + README/`package.json` name 정리.
- CI에 lint+typecheck 최소 게이트.
