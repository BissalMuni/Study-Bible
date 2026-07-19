# Study-Bible — 현황 재점검 및 최우선 개선점 1건

> 작성: 현황분석·개선점제안 에이전트 · 기준일 **2026-07-16** · 대상 커밋 **`ea15cd2`**(HEAD)
> 성격: 기존 두 문서(`PROJECT_ANALYSIS.md` v2, `PROPOSAL_boot-crash-hardening.md`) 이후 **실제 반영 여부를 현재 코드로 재검증**하고, 우선순위 1위 1건을 재확정한다.

---

## 1. 프로젝트 개관 (한 문단)

한국어 성경 학습용 **하이브리드 모바일 앱**. React 19 + TypeScript 5.9 + Vite 7 + Tailwind 4 SPA를 **Capacitor 8**로 감싼 Android 앱이다. 4개 탭 — **오늘의 위로**(감정 설문→태그 매칭 구절 추천), **테마성경**(주제별 구절), **어와나 암송**(MP3/TTS 반복 암송), **성경읽기**(장 단위 본문). 콘텐츠는 `public/data`·`public/bible*`의 정적 JSON/TXT/MP3를 런타임 `fetch`로 로드하는 데이터 주도 설계. 상태는 Context 2종(GlobalState·Ad) + `localStorage` 영속화, TTS는 `window.AndroidAudio` 네이티브 브리지 우선·Web Speech 폴백. 규모 `src` 약 **3,664 LOC / 컴포넌트 24개**. **테스트·CI·ErrorBoundary 없음.**

---

## 2. 현재 상황 — 이전 제안 반영 여부 (재검증 결과)

**핵심 발견: `c2952dd` 이후 기능 커밋 `ea15cd2`(위로 설문 개선)가 1건 더 쌓였으나, 이전에 P0로 상세 제안된 부팅 크래시 방어는 코드에 전혀 반영되지 않았다.** 즉 복구 불가 부팅 크래시 지점이 배포 경로에 그대로 남아 있다.

| 항목 | 이전 제안 | HEAD `ea15cd2` 실측 | 상태 |
|---|---|---|---|
| `GlobalStateContext` 무방어 `JSON.parse` | safeParse로 방어 | `GlobalStateContext.tsx:25` 여전히 try/catch 없음 | ❌ 미반영 |
| 최상위 ErrorBoundary | main.tsx에서 감싸기 | `grep ErrorBoundary src` = 0건, `main.tsx`는 순수 `createRoot().render()` | ❌ 미반영 |
| `safeParse` 헬퍼(`utils/storage.ts`) | 신규 추가 | 파일 없음 | ❌ 미반영 |
| 프로덕션 `console.*` | dev 게이팅/제거 | 여전히 **44건** (`ThemeDetail` 16건이 구절 데이터 통째 로깅) | ❌ 미반영 |
| README / package name | 실제 앱 반영 | README 첫 줄 `# React + TypeScript + Vite`, name `react_app_new` | ❌ 미반영 |

> 결론: 지난 분석의 방향과 좌표는 **현재도 100% 유효**하다. 부채가 줄지 않았고, 최우선 항목이 그대로 미해결이다.

---

## 3. 최우선 개선점 (단 1건) — 루트 부팅 크래시 방어

**우선순위 1위는 변함없이 `GlobalStateContext`의 무방어 `JSON.parse` + 폴백 UI 부재다.** 배포된 Android 앱에서 발생 시 **사용자가 스스로 벗어날 수 없는(재설치 외 복구 불가) 화이트스크린**을 유발하기 때문이다.

**문제 좌표:** `src/contexts/GlobalStateContext.tsx:23-26` (앱 최상위 프로바이더의 `useState` 초기화 함수)

```tsx
const [state, setState] = useState<GlobalState>(() => {
  const saved = localStorage.getItem('bibleApp_globalState');
  return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState; // ← try/catch 없음
});
```

손상값(프로세스 킬로 인한 부분 기록 / 버전 간 스키마 변경 잔재 / WebView 저장소 이상)이 있으면 첫 렌더에서 예외 → ErrorBoundary 부재로 트리 전체 언마운트 → 화이트스크린. 손상값이 `localStorage`에 남아 **재실행마다 같은 지점에서 재크래시**한다.

### 해결안 (2겹 방어, 신규 의존성 0)

**(A) `src/utils/storage.ts` 신규 — 손상값 안전 무시**
```ts
export function safeParse<T>(raw: string | null, fallback: T): T {
  if (raw == null) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
```
`GlobalStateContext.tsx`:
```tsx
import { safeParse } from '../utils/storage';
const [state, setState] = useState<GlobalState>(() => {
  const saved = localStorage.getItem('bibleApp_globalState');
  return { ...defaultState, ...safeParse<Partial<GlobalState>>(saved, {}) };
});
```
> 손상돼도 `defaultState`로 부팅되고, 다음 저장(`useEffect`)에서 정상값으로 자가 치유.

**(B) `src/components/common/ErrorBoundary.tsx` 신규 + `main.tsx`에서 트리 최상단 래핑** — 임의 렌더 예외에 대한 심층 방어. 폴백 UI의 **"다시 시작"** 버튼은 `localStorage.removeItem('bibleApp_globalState')` 후 `location.reload()`로, (A)를 우회하는 손상 상황에서도 사용자가 재설치 없이 자가 복구하게 한다.
> 전체 구현 코드는 `docs/PROPOSAL_boot-crash-hardening.md` §3 참조(그대로 유효). 본 문서는 그 제안이 **여전히 미착수**임을 확정하고 재우선순위화한다.

### 수용 기준
1. 콘솔에서 `localStorage.setItem('bibleApp_globalState','{깨진json')` 후 새로고침 → 화이트스크린 없이 기본 설정으로 정상 부팅.
2. 렌더 중 임의 예외 → 폴백 UI + "다시 시작" 노출, 클릭 시 정상 복구.
3. 정상 저장값이면 기존 설정(폰트/다크모드/TTS) 회귀 없음.
4. `npm run build`(= `tsc -b && vite build`) 통과.

### 비용·효과
- 변경: 신규 2 + 수정 2파일, 의존성 0. 구현 약 30–45분 + 검증 15분. 위험 낮음(순수 추가·방어적).
- 효과: 리뷰 이탈로 직결되는 **복구 불가 부팅 크래시 근절**. ROI 최상.

---

## 4. 후속(별도 티켓, 본 건 완료 후)
1. 프로덕션 `console.*` 44건 제거 — Vite `esbuild.drop: ['console','debugger']`. 특히 `ThemeDetail`이 구절 데이터를 통째 로깅(정보 노출·성능).
2. `fetch` 실패 공통 로딩/에러/재시도 UI (현재 `.catch(console.error)`만 4곳).
3. README/`package.json` name을 실제 앱으로 정리.
4. CI에 lint+typecheck 최소 게이트, 태그 매칭·TTS 유닛 테스트.
