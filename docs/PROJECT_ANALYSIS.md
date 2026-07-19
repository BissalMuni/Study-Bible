# Study-Bible — 현황분석 및 개선점 제안

> 작성: 현황분석·개선점제안 에이전트 · 기준일 2026-07-11 · 대상 커밋 `c2952dd`
> **v2 (2026-07-11): 전 항목 실제 코드로 재검증 — 수치 정정 및 근거(파일:라인) 부여. §5 검증 로그 참조.**

## 1. 프로젝트 개요

한국어 성경 학습용 **하이브리드 모바일 앱**(웹뷰 기반 Android). React SPA를 Capacitor로 감싸 배포하며, TTS/오디오 재생과 광고를 네이티브 브리지로 연동한다.

| 항목 | 내용 |
|---|---|
| 스택 | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, framer-motion 12 |
| 패키징 | Capacitor 8 (`@capacitor/android`) |
| 규모 | `src` 기준 약 3,625 LOC / 컴포넌트 24개 |
| 데이터 | 정적 JSON `public/data/*` (총 ~1.7MB) + 어와나 암송 MP3 다수 |
| 상태관리 | Context 2종(GlobalState·Ad) + `localStorage` 영속화 |
| 테스트/CI | 없음 |

### 기능 탭 (4)
- **오늘의 위로**(comfort): 감정 질문 4단계 → 태그 매칭으로 성경 구절 추천
- **테마성경**(theme): 주제별 구절 모음, `bible_theme.json`(1.3MB) 로드
- **어와나 암송**(awana): 구절별 MP3/TTS 재생·반복 암송
- **성경읽기**(bible): 장 단위 본문 읽기(`/biblerhv/*.txt`)

### 아키텍처 특징
- TTS는 `window.AndroidAudio` 네이티브 브리지 우선, 미탐지 시 Web Speech API 폴백(`useTTS`).
- 광고는 `adConfig`로 포인트별 확률·임계값 설정(TAB_CHANGE, THEME_SELECT 등), 인터스티셜/배너 구분.
- 모든 콘텐츠는 런타임 `fetch`로 정적 JSON을 읽어오는 데이터 주도 설계.

---

## 2. 강점

- **관심사 분리가 명확**: `components/{awana,bible,comfort,theme,...}` 도메인별 폴더, `hooks·contexts·config·types` 분리.
- **데이터/코드 분리**: 콘텐츠가 JSON으로 외부화되어 성경 데이터 갱신이 코드 수정 없이 가능.
- **네이티브/웹 폴백 설계**: TTS가 앱·브라우저 양쪽에서 동작하도록 추상화됨.
- **광고 정책의 설정화**: 하드코딩 대신 `adConfig`로 포인트·확률을 조정 가능.

---

## 3. 개선점 (우선순위순)

### P1 — 즉시, 저비용·고효과
1. **README가 기본 Vite 템플릿 그대로**
   실제 앱(성경 학습·TTS·광고·Capacitor)을 전혀 설명하지 않는다. 신규 참여자/유지보수 진입장벽. → 프로젝트 실체 반영한 README로 교체.
2. **디버그 `console.*` 호출 44개가 프로덕션에 잔존** *(v2 정정: 27→44)*
   특히 `ThemeDetail`은 데이터 키·구절을 통째로 로깅. → dev 전용 로거로 게이팅하거나 제거, Vite `esbuild.drop`로 빌드 시 제거.
3. **`package.json`의 name이 `react_app_new`**(스캐폴드 잔재) → 실제 앱명으로 정리.

### P2 — 안정성
4. **`fetch` 실패 시 사용자 대응 부재**
   8개 fetch 대부분이 `.catch(console.error)`만 처리. 네트워크/파싱 실패 시 화면이 빈 채로 멈춤(로딩·에러·재시도 UI 없음). → 공통 로딩/에러 상태 컴포넌트 도입.
5. **에러 바운더리 없음**
   렌더 중 예외 하나로 앱 전체가 백스크린. → 최상위 `ErrorBoundary`로 폴백 UI 제공.
6. **`localStorage` 파싱 미방어 — 3곳 모두** *(v2 정정: 1곳→3곳)*
   `GlobalStateContext.tsx:25`, `AdContext.tsx:77`, `config/adConfig.ts:95`가 각각 `JSON.parse(saved)`를 try 없이 호출 — 저장값 손상 시 앱 부팅/광고초기화 실패. 특히 `GlobalStateContext`는 최상위 상태라 손상 시 **화이트스크린**. → 3곳 공통 `safeParse<T>(raw, fallback)` 헬퍼로 방어.

### P3 — 성능
7. **`bible_theme.json` 1.3MB를 테마 상세 진입마다 전체 로드**
   웹뷰·저사양 단말에서 메모리/지연 부담. → 테마 단위 분할 로드 또는 인덱스+지연 로드, 캐시.

### P4 — 유지보수성
8. **타입 중복 정의**(확정): `types/index.ts`에 `Verse`·`Book`이 있는데도 컴포넌트가 자체 재정의. 실측: `Verse` → `ComfortChat.tsx:21`·`ComfortResult.tsx:6`, `BibleBook` → `BibleReader.tsx:9`·`ChapterContent.tsx:8`(동일 형태 2중복), `Option`/`Question`/`EncouragementMessage`도 comfort 2파일에 각각 중복. 정의 드리프트 위험. → `types/index.ts`로 승격 후 import 통일.
9. **테스트/린트 파이프라인 부재**: `node_modules` 미설치 상태로 `eslint`·`tsc`가 로컬에서 실행 불가, 테스트 0건. → CI에서 lint+typecheck 최소 게이트 구성.

---

## 4. 권장 로드맵

1. **Sprint 0 (반나절)**: README 교체, `console.log` 정리, package name 수정, localStorage 방어 코드. — 위험 낮고 즉시 체감.
2. **Sprint 1**: 공통 로딩/에러 컴포넌트 + ErrorBoundary 도입, fetch 훅 통일.
3. **Sprint 2**: `bible_theme.json` 분할·지연 로드로 진입 성능 개선.
4. **Sprint 3**: 타입 중앙화, CI(lint/typecheck) 도입, 핵심 로직(태그 매칭·TTS) 유닛 테스트.

> 가장 ROI 높은 첫걸음: **P1(문서/로그 정리) + P2-6(localStorage 방어)**. 하루 안에 신뢰성과 가독성을 동시에 끌어올린다.

---

## 5. 검증 로그 (v2 · 2026-07-11)

v1의 주장을 `grep`/파일 열람으로 실제 코드 대조한 결과. 근거 없는 서술을 실측 수치·좌표로 대체.

| # | v1 주장 | 검증 결과 | 근거 |
|---|---|---|---|
| 2 | console.log 27개 | ❌ 과소 → **44개** | `grep -rn "console\." src \| wc -l` = 44 |
| 4 | fetch 실패 무대응 | ✅ 확정 | `BibleReader:39`, `ComfortChat:83`, `ThemeDetail:83`, `ThemeList` 등 다수 `.catch(console.error)` |
| 6 | localStorage 미방어(1곳) | ⚠️ 과소 → **3곳** | `GlobalStateContext:25`, `AdContext:77`, `adConfig:95` |
| 8 | 타입 중복 | ✅ 확정·심화 | `Verse` 2재정의, `BibleBook` 2재정의(§3-8) |
| 1/3 | README 템플릿·name `react_app_new` | ✅ 확정 | `README.md:1` = "# React + TypeScript + Vite", `package.json:2` |

**결론**: 개선 방향은 v1 그대로 유효하나, 실제 부채 규모는 v1보다 **크다**(로그 1.6배, 크래시 지점 3배). 착수 시 §5 좌표를 그대로 작업 티켓으로 사용 가능.
