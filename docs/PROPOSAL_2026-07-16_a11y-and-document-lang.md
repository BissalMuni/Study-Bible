# 개선 제안 — 접근성(a11y): 문서 언어 `lang="ko"` + 아이콘 전용 버튼 접근명

> 작성: 현황분석·개선점제안 에이전트 · 기준일 **2026-07-16** · 대상 커밋 **`135b404`**(HEAD)
> 범위: 이 앱의 사용자층(교회·고령층 성경학습, 스크린리더·TTS 사용자)에 직접 작용하는 접근성 개선 1건.

---

## 1. 프로젝트 개관 (한 문단)

한국어 성경 학습용 **하이브리드 Android 앱**(React 19 + Vite 7 + Tailwind 4 SPA를 Capacitor 8로 패키징). 4개 탭(오늘의 위로·테마성경·어와나 암송·성경읽기). **핵심 기능에 TTS 음성 낭독**이 포함되고, 예상 사용자층에 **고령층·시각 보조기술 사용자**가 상당하다. 규모 `src` 약 3,664 LOC / 컴포넌트 24개.

## 2. 현재 상황

HEAD 최근 커밋은 계속 comfort 콘텐츠·심리이론 정교화(창세기 11장까지, 구절 118개). 앞서 문서화한 7건(부팅 크래시·fetch 복원력·추천 스코어 중복·bible_theme 지연로드·타입 중앙화·priority 연결·console 정리)은 모두 미착수. **접근성은 지금까지 어떤 문서에서도 다루지 않은 축**이며, 실측 결과 앱의 데모그래픽 대비 취약하다.

---

## 3. 제안하는 개선점 (단 1건) — 스크린리더·TTS가 한국어를 영어로 처리하고, 아이콘 조작부에 이름이 없다

### 문제 (실측)

**(가) 문서 언어가 잘못 선언됨 — `index.html`**
```html
<html lang="en">        <!-- ← 앱 콘텐츠는 100% 한국어인데 영어로 선언 -->
<title>react_app_new</title>   <!-- ← 스캐폴드 잔재(패키지 name과 동일 부채) -->
```
- `lang="en"`이면 **스크린리더(Android TalkBack)·브라우저 TTS가 영어 발음 엔진으로 한국어 텍스트를 읽는다.** 성경 본문 낭독이 핵심인 앱에서 치명적 오작동(한국어를 영어 음소로 오독). 앱 내 `useTTS`는 한국어 음성을 쓰더라도, **문서·보조기술 계층의 언어 힌트는 여전히 영어**다.
- `<title>`이 `react_app_new` — 브라우저 탭·PWA·최근앱 목록·공유 시 스캐폴드 이름 노출.

**(나) 아이콘 전용 버튼에 접근명(accessible name)이 거의 없음**
- 전 앱 `aria-label` **≤1건**, `alt=` **0건**인데, **`motion.button` 70개** 중 다수가 **아이콘만** 담고 텍스트가 없다(lucide 아이콘 사용 파일 14개).
- 구체 좌표(대표): `TTSSettings.tsx`
  - `:54-61` 설정 열기 버튼 = `<Settings/>`만
  - `:87-93` 닫기 버튼 = `<X/>`만
  - `:163-174` 재생 버튼 = `<Play/>`만
  → TalkBack이 "버튼"으로만 읽어 **무슨 버튼인지 알 수 없다.** TTS 조작부(재생/일시정지/설정/닫기)가 정작 시각 보조기술 사용자에게 조작 불가.

**(정확성 메모 — 문제 아닌 부분은 배제):** `BottomNav.tsx`는 실제 텍스트 라벨(`오늘의위로`·`테마성경` 등, `:12-15`·`:55`)을 함께 렌더하므로 **접근 가능**하다. 대부분의 상호작용 요소도 `motion.button`(시맨틱 `<button>`)이라 키보드/역할 자체는 문제없다. **결함은 "아이콘 전용 컨트롤의 이름 부재"와 "문서 언어 오선언"에 국한**된다.

### 왜 우선순위가 높은가
- **사용자층 정합성**: 고령·시각보조 사용자 비중이 높은 성경 앱에서 a11y는 부가기능이 아니라 핵심 사용성.
- **TTS 앱인데 언어 오선언**: 핵심 가치(낭독)와 정면 충돌하는 1줄 버그.
- **초저비용·고확실**: `lang` 1줄 + 아이콘 버튼에 `aria-label` 추가. 회귀 위험 0.

---

## 4. 구체적 해결안

### (A) 문서 메타데이터 교정 (`index.html`)
```html
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#2563eb" />
    <meta name="description" content="한국어 성경 학습 앱 — 오늘의 위로·테마성경·어와나 암송·성경읽기" />
    <title>오늘의 위로 성경</title>  <!-- 실제 앱명으로 -->
  </head>
```

### (B) 아이콘 전용 버튼에 접근명 부여
장식용 아이콘은 `aria-hidden`, 버튼엔 한국어 `aria-label`:
```tsx
// 예: TTSSettings.tsx
<motion.button aria-label="음성 설정 열기" onClick={...}><Settings size={18} aria-hidden /></motion.button>
<motion.button aria-label="닫기" onClick={...}><X size={20} aria-hidden /></motion.button>
<motion.button aria-label={isPlaying ? '일시정지' : '재생'} onClick={...}>
  {isPlaying ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
</motion.button>
```
- 적용 대상(아이콘 전용): `TTSSettings`(설정/닫기/재생·정지), `ComfortResult`(구절 TTS 버튼), `ThemeDetail`·기타 닫기/네비 아이콘 버튼. 텍스트가 이미 보이는 버튼(BottomNav 등)은 **제외**.
- 재생/정지처럼 상태가 바뀌는 컨트롤은 라벨을 상태에 따라 갱신(또는 `aria-pressed`).

### (C) (선택) 터치 타깃·대비 점검
아이콘 버튼 최소 44×44px 터치 영역, 다크모드 텍스트 대비(회색-회색 조합) WCAG AA 확인. 별도 후속 가능.

---

## 5. 수용 기준 (Acceptance Criteria)
1. 배포 HTML의 `<html lang="ko">`, `<title>`이 실제 앱명. TalkBack/브라우저가 한국어로 처리.
2. TTS 조작부(재생/정지/설정/닫기) 등 아이콘 전용 버튼이 TalkBack에서 **의미 있는 한국어 이름**으로 읽힘.
3. 시각적 회귀 없음(아이콘 표시 그대로), 동작 회귀 없음.
4. `npm run build`(`tsc -b && vite build`) 통과.

## 6. 영향도·비용
- 변경: `index.html`(메타) + 아이콘 전용 버튼 다수에 `aria-label`/`aria-hidden` 추가(주로 `TTSSettings`·`ComfortResult`·`ThemeDetail`). 신규 의존성 0.
- 작업량: 약 40~60분(버튼 수에 비례). 위험 매우 낮음(속성 추가·1줄 교정).
- 효과: **TTS·스크린리더가 한국어를 정상 처리** + 시각보조 사용자가 핵심 조작 가능 → 사용자층 정합 사용성 대폭 개선. 부수로 브라우저/PWA 타이틀 정상화.

## 7. 관계 (미착수 부채 링크)
- `<title>`/스캐폴드명은 `package.json` name(`react_app_new`)·README 정리와 함께 처리하면 좋음(후속 저비용 묶음).
- 독립·미착수: P0 부팅 크래시, fetch 복원력, 추천 스코어 중복, bible_theme 지연 로드, 타입 중앙화, priority 연결, console 정리(각 별도 문서).
