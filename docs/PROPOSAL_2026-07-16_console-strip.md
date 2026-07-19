# 개선 제안 — 프로덕션 `console.*` 44건 제거/게이팅 (정보노출·성능·빌드 위생)

> 작성: 현황분석·개선점제안 에이전트 · 기준일 **2026-07-16** · 대상 커밋 **`135b404`**(HEAD)
> 범위: 저비용·고확실성의 위생 개선 1건을 실행 수준으로 구체화. (데이터 품질은 별도 실측 결과 양호 — 아래 §2 참조.)

---

## 1. 프로젝트 개관 (한 문단)

한국어 성경 학습용 **하이브리드 Android 앱**(React 19 + Vite 7 + Tailwind 4 SPA를 Capacitor 8로 패키징, 배포 대상은 WebView 기반 Android). 4개 탭(오늘의 위로·테마성경·어와나 암송·성경읽기). 규모 `src` 약 3,664 LOC / 컴포넌트 24개.

## 2. 현재 상황

HEAD 최근 커밋은 계속 comfort 데이터 확장(창세기 1–9장, 구절 118개). **참고로 이번 점검에서 comfort 데이터 품질을 실측한 결과는 양호**: 태그 어휘가 설문↔구절 양방향 완전 일치(각 17종, 고아 0), 중복 id/reference/text 0건, 태그 커버리지 6~39로 균형적 — **여기엔 개선 불필요**. 앞서 문서화한 6건(부팅 크래시·fetch 복원력·추천 스코어 중복·bible_theme 지연로드·타입 중앙화·priority 연결)은 모두 미착수. 본 문서는 남은 **저비용·확실** 항목인 프로덕션 로그를 다룬다.

---

## 3. 제안하는 개선점 (단 1건) — 44개 `console.*`가 그대로 프로덕션 번들에 실린다

### 문제 (실측)

`vite.config.ts`에 `esbuild.drop`/`terser drop_console` **설정이 없다**(현재 build 옵션은 `outDir`, `sourcemap:false`뿐). 따라서 `src`의 **`console.*` 44건 전량이 프로덕션 빌드에 포함**된다.

파일별 분포(상위):

| 파일 | 건수 | 성격 |
|---|---|---|
| `ThemeDetail.tsx` | 16 | **성경 구절 데이터·데이터 키를 통째 로깅** (`'[ThemeDetail] Filtered verses:', verses.length, verses`) — 구절 클릭마다 실행(hot path) |
| `AdContext.tsx` | 12 | **광고 서빙 내부 노출**: 포인트 id·카운터·확률·배너 페이로드(`[Ad] Counter:...`, `showBanner called {...}`) |
| `VerseButton.tsx` | 4 | 오디오 경로 로깅 |
| `App.tsx` | 2 | UI 상태 흐름(`showWelcome` 등) |
| useTTS·adConfig·ThemeList·ComfortChat·ChapterContent·BibleReader·AwanaRecital | 각 1~2 | 혼합(일부는 `.catch(console.error)` 형태의 유일한 에러 처리) |

### 왜 문제인가 (3축)
1. **정보 노출/프라이버시**: 배포된 Android WebView는 원격 디버깅·`logcat`으로 콘솔이 관찰 가능하다. 성경 구절 데이터·**광고 로직(확률·임계값·포인트)** 이 그대로 드러나면 광고 정책 우회·리버스엔지니어링 단서가 된다.
2. **성능**: hot path(구절 클릭 시 `ThemeDetail`이 `verses` 배열 전체를 로깅) + 총 44콜이 저사양 단말에서 불필요한 직렬화·I/O 비용.
3. **빌드 위생**: 디버그 `console.log`가 릴리스에 남는 것은 성숙도 신호 부족. 로그 노이즈로 실제 오류 관측을 방해.

### 왜 지금 우선순위인가
- **1줄 설정 + 소폭 정리**로 끝나는 최고 ROI 위생 작업.
- 정보 노출(특히 광고 로직)은 배포 앱에서 즉시 실효.
- 단, **주의점**: `.catch(console.error)`가 여러 fetch에서 *유일한* 에러 처리라(§관계의 P1 fetch 복원력과 연동), 무차별 제거 시 에러 신호까지 사라진다 → 아래 해법은 이를 분리 처리한다.

---

## 4. 구체적 해결안 — 프로덕션 드롭 + 의도적 에러는 dev 로거로 보존

### (A) 빌드 시 `console`/`debugger` 제거 (`vite.config.ts`)
```ts
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': '/src' } },
  esbuild: {
    // 프로덕션 번들에서 console.*·debugger 제거 (dev 서버에는 영향 없음)
    drop: ['console', 'debugger'],
  },
  build: { outDir: 'dist', sourcemap: false },
})
```
> `esbuild.drop`은 프로덕션 빌드에만 적용되고 `vite dev`에는 영향이 없어 개발 편의는 유지된다.

### (B) 진짜 에러는 dev 게이팅 로거로 이전 (신호 보존)
무차별 드롭으로 사라지면 곤란한 **의도적 에러 로깅**(fetch 실패, 오디오 로드 실패 등)은 공통 로거로 옮긴다:
```ts
// src/utils/log.ts
export const logError = (...a: unknown[]) => { if (import.meta.env.DEV) console.error(...a); };
```
- `.catch(console.error)` → `.catch(logError)` (BibleReader:39, ComfortChat:122, ThemeDetail:83 등).
- 이렇게 하면 (A)가 프로덕션에서 제거해도 dev에서는 관측 가능하고, **사용자 대응은 P1(fetch 복원력)의 에러 UI가 담당**하도록 역할 분리.

### (C) 순수 디버그 `console.log` 직접 제거 (권장)
`ThemeDetail`의 16건 등 데이터 덤프성 `console.log`는 (A)가 어차피 지우지만, **소스에서도 제거**해 hot path 노이즈와 오해를 없앤다(리뷰 시 "왜 데이터를 로깅하지?" 방지).

---

## 5. 수용 기준 (Acceptance Criteria)
1. `vite build` 산출물(`dist`)에서 `console.log`/`console.error`/`console.warn` 검색 시 **0건**.
2. `vite dev`에서는 개발용 에러 로깅(`logError`)이 정상 출력.
3. fetch/오디오 실패 시 앱 동작 회귀 없음(에러 처리 로직 유지).
4. `npm run build`(`tsc -b && vite build`) 통과.

## 6. 영향도·비용
- 변경: `vite.config.ts` 1줄 블록 + (선택) `utils/log.ts` 신규 + `.catch(console.error)` 소수 치환 + `ThemeDetail` 디버그 로그 정리. 신규 런타임 의존성 0.
- 작업량: 약 20~40분. 위험 매우 낮음(빌드 옵션 + 방어적 치환).
- 효과: **광고 로직·구절 데이터의 프로덕션 노출 차단** + hot path 성능·빌드 위생 개선.

## 7. 관계 (미착수 부채 링크)
- **연동:** `PROPOSAL_2026-07-16_fetch-resilience.md` — 여러 `.catch(console.error)`는 로그 문제이자 에러 처리 부재 문제. 본 건의 (B)와 P1의 에러 UI를 함께 넣으면 "로깅 정리 + 사용자 대응"이 동시에 해결된다.
- 독립·미착수: P0 부팅 크래시, 추천 스코어 중복, bible_theme 지연 로드, 타입 중앙화, priority 연결(각 별도 문서).
- 후속 저비용: README/`package.json` name(`react_app_new`) 정리.
