# 단계별 작업

각 작업의 `§`는 plan.md의 절 번호다. 작업 번호(`1.3` 등)는 `progress.md`와 같다.

---

## 1단계. 스파이크

**목표**: prplay에서 Knot을 대상으로 손으로 쓴 케이스 두 개(#365 Breadcrumb, Stepper)를 단일 HTML로 빌드하고 Claude 아티팩트에서 실제로 도는지 확인한다. 이 단계의 결과로 plan.md의 설계가 맞는지 판단한다.

**선행 조건**: Knot 저장소 경로, Knot의 API 호출 방식과 서버 상태 라이브러리 파악.

| 번호 | 작업 | 참고 |
| --- | --- | --- |
| 1.1 | Knot 구조 조사: 번들러 설정(webpack svgr 옵션, alias, `process.env` 사용처, CSS-in-JS 설정), API 호출 방식(fetch/axios), 서버 상태 라이브러리, 라우터 종류, 전역 Provider 목록을 정리해 `progress.md` 메모에 남긴다 | §2.3, §14 |
| 1.2 | prplay에 `package.json` 생성, Vite·`vite-plugin-svgr`·`vite-plugin-singlefile` 설치(이미 있는 것은 재사용). Vite 8이면 JSX는 `oxc.jsx`로 처리하므로 `@vitejs/plugin-react`는 넣지 않는다 | §2.1, §2.2 |
| 1.3 | `src/build/build.ts` 작성: 케이스 경로를 받아 가상 모듈 `virtual:review-case`로 주입, `assetsInlineLimit`, `resolve.dedupe`, alias 설정 | §2.2 |
| 1.4 | Knot webpack 설정과 같은 결과가 나오도록 svgr 옵션(svgo 포함), `define`, JSX importSource(Emotion), 폰트 인라인을 Vite 쪽에 맞춘다 | §2.3 |
| 1.5 | `src/runtime/` 최소 화면: `ReviewCase` 타입과 `defineCase`, 미리보기 영역 + Provider wrapper(ThemeProvider, GlobalStyle, QueryClient, MemoryRouter) + Error Boundary | §3.1, §4.1, §4.3 |
| 1.6 | 케이스 두 개 작성: `targets/knot/cases/365.tsx`(Stepper, Harness 포함)와 Breadcrumb 케이스 | §3.2 |
| 1.7 | 빌드 → `dist/review-*.html` 하나만 생기는지, `file://`로 열었을 때 아이콘·폰트·테마가 Knot과 같은지 확인 | §2.1, §10 |
| 1.8 | 아티팩트에 업로드하고 plan.md 14장 미확인 항목 확인: 파일 크기 상한, 외부 이미지·폰트 로딩, 부모 URL hash 전달, `window.open`, 비로그인 열람, Claude Code에서 바로 게시하는 경로 | §1, §14 |
| 1.9 | (선택) React Cosmos, Ladle 빌드 결과에 vite-plugin-singlefile을 붙일 수 있는지 30분 안에서 확인하고, 되면 직접 만들지 말지 사용자와 결정 | §12 |

**완료 기준**
- 케이스 두 개가 각각 단일 HTML 파일로 빌드된다.
- `file://`와 아티팩트 양쪽에서 콘솔 오류 없이 렌더링되고, Stepper의 이전/다음 버튼이 동작한다.
- SVG 아이콘이 Knot 앱과 같은 크기와 속성으로 보인다.
- plan.md 14장에서 아티팩트 관련 항목의 결과가 plan.md에 반영돼 있다.

---

## 2단계. props 컨트롤

**목표**: 컴포넌트 타입에서 편집 컨트롤을 자동으로 만들고, 프리셋과 함수 호출 기록을 붙인다.

| 번호 | 작업 | 참고 |
| --- | --- | --- |
| 2.1 | 빌드 시점에 `react-docgen`을 실행해 props 메타데이터를 가상 모듈 `virtual:review-props`로 주입 (TS 7에는 JS API가 없어 react-docgen-typescript 대신 사용) | §5.1 |
| 2.2 | 타입별 컨트롤: string, number, boolean, 리터럴 유니온(셀렉트), 객체·배열(JSON 편집기). `ReactNode` props는 제외 | §5.1 |
| 2.3 | 함수 props를 로거로 바꿔 끼우고 호출 기록 패널(이름, 인자, 시각) 표시 | §5.1 |
| 2.4 | 프리셋 버튼: 기본 props 위에 `Partial<P>`를 덮어쓰기 | §5.2 |
| 2.5 | props가 바뀌면 미리보기 루트 `key`를 바꿔 다시 마운트 | §4.2 |
| 2.6 | 편집 상태를 `localStorage`의 `review-kit:{PR번호}:{케이스}` 키에 저장, JSON 복사/붙여넣기, 초기화 버튼 | §7 |
| 2.7 | 미리보기 폭 조절 슬라이더. 리뷰 화면 CSS를 접두사 클래스(또는 Shadow DOM)로 격리 | §4.3 |

**완료 기준**
- Stepper 케이스에서 `total`을 숫자 입력으로 바꾸면 미리보기가 즉시 바뀐다.
- 프리셋 "문서 1개", "문서 12개"가 버튼 한 번에 적용된다.
- 새로고침 후에도 편집한 값이 남고, 초기화하면 기본값으로 돌아간다.
- 컴포넌트가 에러를 던져도 편집 패널은 살아 있다.

---

## 3단계. 네트워크 모킹

**목표**: Service Worker 없이 fetch와 XHR을 가로채 시나리오별 응답을 주고, 웹에서 목 데이터를 편집한다.

| 번호 | 작업 | 참고 |
| --- | --- | --- |
| 3.1 | `@mswjs/interceptors` 브라우저 프리셋 + `BatchInterceptor` + MSW `getResponse`로 `startMocking` 구현. 목 없는 요청은 501 + 요청 주소 | §6.1 |
| 3.2 | 요청 기록 패널(메서드, URL, 상태, 걸린 시간) | §6.1 |
| 3.3 | 네트워크를 쓰는 Knot 페이지 하나를 골라 페이지 케이스 작성: `initialPath`, 인증 Context 목, 시나리오 4개(정상, 빈 응답, 로딩 2000ms, 500 에러). body는 API 응답 타입으로 `satisfies` | §4.1, §6.2 |
| 3.4 | 시나리오 선택 버튼과 라우트별 상태 코드·지연·body 편집 UI. JSON 편집기는 CodeMirror 6 | §6.3 |
| 3.5 | "적용" 시 `new QueryClient()`(`retry: false`)로 캐시를 새로 만들고 다시 마운트 | §4.2, §6.3 |
| 3.6 | 저장소에 기존 MSW 핸들러가 있으면 편집 시나리오 핸들러 뒤에 이어 붙여 재사용 | §6.1 |
| 3.7 | 편집한 시나리오도 2.6의 localStorage 저장에 포함 | §7 |

**완료 기준**
- axios(XHR)와 fetch 요청이 모두 가로채진다.
- 네 시나리오가 각각 정상, 빈 화면, 로딩, 에러 상태를 보여준다.
- body JSON을 고치고 적용하면 이전 캐시 없이 새 응답이 화면에 나온다.
- 아티팩트에 올려도 모킹이 동작한다.

---

## 4단계. 코드 패널

**목표**: 리뷰어가 코드 저장소를 열지 않고도 소스, diff, 결정, 영향 범위를 볼 수 있게 한다.

| 번호 | 작업 | 참고 |
| --- | --- | --- |
| 4.1 | `sourcesModule` 가상 모듈: 케이스의 `sources`를 정적 파싱(또는 `tsx`/`jiti`)해 파일 내용, `git diff <base>...HEAD`, 커밋 SHA 기준 GitHub 링크 주입 | §3.3 |
| 4.2 | 탭 UI: 소스 전체, PR diff, 결정 목록, 영향 범위 | §8 |
| 4.3 | 문법 강조 라이브러리 선택: `prism-react-renderer`와 Shiki를 각각 넣었을 때 HTML 크기를 비교해 고른다. diff는 `+`/`-` 줄 색만 칠한다 | §8 |
| 4.4 | 파일 경로 클릭 시 GitHub 링크 새 창 열기. 1.8에서 막힌 것으로 확인됐으면 링크 복사 버튼으로 대신 | §8, §14 |
| 4.5 | `decisions`(최대 5개), `impacts` 표시. 영향 범위는 `rg`로 import 검색하는 스크립트를 만들어 둔다(5단계에서 스킬이 쓴다) | §3.1, §9.3 |

**완료 기준**
- 1~3단계 케이스 모두 코드 패널에 소스와 diff가 나온다.
- GitHub 링크가 브랜치 이름이 아닌 SHA를 가리킨다.
- 문법 강조를 넣은 뒤 HTML 크기가 기록돼 있다.

---

## 5단계. 스킬

**목표**: PR마다 케이스 파일을 AI가 만들게 하는 Claude Code 스킬을 완성한다.

| 번호 | 작업 | 참고 |
| --- | --- | --- |
| 5.1 | prplay `templates/review-page/SKILL.md` 작성(Knot을 대상으로 돌려 검증)(plan.md 9.2 초안에서 시작). `disable-model-invocation: true`, `allowed-tools` 지정 | §9.1, §9.2 |
| 5.2 | 1~4단계 케이스를 `example-component.tsx`(컴포넌트용)와 `example-page.tsx`(페이지+네트워크용) 두 개로 정리해 스킬 폴더에 넣는다 | §9.2 |
| 5.3 | 프리셋 엣지 케이스 목록(빈 값, 아주 긴 값, 경계 숫자, 빈/긴 배열, 비활성)과 시나리오 규칙을 스킬 규칙에 고정 | §5.2, §9.2 |
| 5.4 | 검증 단계: `tsc --noEmit` → 빌드 → 실패 시 케이스만 고쳐 재시도, 3회 실패 시 중단 | §9.2 |
| 5.5 | (선택) Playwright로 결과 HTML을 `file://`로 열어 Error Boundary 문구 없음과 프리셋별 렌더링을 확인하는 스모크 테스트 | §9.4 |
| 5.6 | 다른 PR 두세 개에 스킬을 돌리고, 사람이 고친 부분을 스킬 규칙에 반영 | §13 |

**완료 기준**
- 처음 보는 PR 두 개 이상에서 `/review-page` 한 번으로 빌드되는 케이스가 나온다.
- 스킬이 `src/`를 건드리지 않는다.
- 생성된 decisions가 5개 이하, 한 문장씩이다.

---

## 6단계. 라이브러리 분리

**목표**: `targets/knot/`의 설정을 `review.config.ts` 형식으로 바꾸고, prplay를 다른 프로젝트도 쓸 수 있는 `review-kit` 패키지로 정리한다.

| 번호 | 작업 | 참고 |
| --- | --- | --- |
| 6.1 | 패키지 구조 생성: `src/runtime`, `src/build`, `src/cli.ts`, `templates/` | §11.1 |
| 6.2 | `defineConfig`와 `review.config.ts` 로딩: alias, plugins, svgr, wrapper, repoUrl, baseBranch | §11.2 |
| 6.3 | CLI: `review-kit build <case>`, `review-kit dev <case>`(Vite dev 서버, HMR), `review-kit init`(설정 파일과 스킬 템플릿 복사) | §11.1 |
| 6.4 | `react`, `react-dom`, 프로젝트의 CSS-in-JS 라이브러리(Knot는 Emotion)를 peerDependencies로, 런타임은 ESM 라이브러리로 배포 | §11.3 |
| 6.5 | Knot 적용: PR #366 worktree에 `link:`로 연결하고 `review.config.ts`와 케이스만 두어 빌드·dev 서버를 확인한다(사용자 승인). develop에 넣을지는 사용자가 결정한다 | §11.4 |
| 6.6 | README: 설치, 설정, 스킬 사용법, 아티팩트 게시 방법, 1장 제약 요약 | §1, §10 |

**완료 기준**
- Knot 전용 내용은 `review.config.ts`, 케이스 파일, 스킬뿐이다.
- 패키지로 바꾼 뒤 기존 케이스의 HTML이 이전과 같이 동작한다.
- 빈 Vite + React 프로젝트에서 `review-kit init` 후 예시 케이스가 빌드된다.
