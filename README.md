# prplay — review-page 스킬

PR 설명과, PR에서 바뀐 컴포넌트와 페이지를 리뷰어가 직접 만져 볼 수 있는 플레이그라운드를 담은 **HTML 파일 하나**를 PR마다 만들고, Claude 아티팩트로 공유하는 도구다. 설계와 결정 근거는 [`plan.md`](plan.md)에 있다.

결과 화면 (PR 하나에 HTML 하나. 맨 위 탭 `[개요] [대상 1] [대상 2] ...`)
- 개요 탭: AI가 정리한 PR 설명. 좋은 리뷰에 필요한 7가지 순서다: 맥락(왜), 길잡이(어디부터), 증거(테스트·CI), 직접 만져 보기, 크기(줄 수·커밋), 위험과 영향 범위, 리뷰 방법(must/nit/question)
- 대상 탭: 리뷰 대상(컴포넌트·페이지)마다 아래 플레이그라운드
- 미리보기: 실제 컴포넌트·페이지가 렌더링된다. 폭 슬라이더, 페이지는 주소 표시줄
- props 편집: 타입에서 자동으로 만든 컨트롤, 엣지 케이스 프리셋, 함수 props 호출 기록
- 네트워크 목: 시나리오(정상·빈 상태·로딩·500 에러) 전환, 응답 JSON·상태 코드·지연 편집, 요청 기록
- 코드 패널: 소스(문법 강조), PR diff, 커밋 SHA 기준 GitHub 링크, 영향 범위
- 편집 상태는 브라우저에 저장되고 JSON 복사/붙여넣기로 다른 리뷰어에게 넘긴다

역할 분담: 틀(리뷰 화면, 모킹 엔진, 빌드)은 스킬 폴더에 들어 있고, PR마다 바뀌는 **PR 폴더**(`pr.ts`와 케이스 파일)는 AI(`/review-page` 스킬)가 쓴다. npm 패키지로 배포하지 않고 스킬 폴더 하나(`review-page/`)를 복사해서 쓴다(plan.md 11장).

## 요구 사항

- Node 22.18 이상 (`.ts` 파일을 Node 타입 제거로 바로 실행한다)
- npm (스킬 폴더에 빌드 도구를 설치한다)
- 대상 프로젝트에 `react`, `react-dom`, `msw` 설치 (리뷰 화면이 프로젝트 것을 같이 쓴다)
- React 컴포넌트. 빌드는 Vite로 하므로 webpack 프로젝트는 설정 파일의 `plugins`, `svgr`, `define`으로 로더를 맞춘다
- (선택) `rg`(ripgrep): 영향 범위 스크립트, `playwright`: 스모크 테스트

## 스킬 복사

이 저장소의 `review-page/`를 대상 프로젝트(`package.json`이 있는 폴더)의 `.claude/skills/review-page/`로 복사한다.

```sh
mkdir -p <프로젝트>/.claude/skills
rsync -a --exclude node_modules review-page/ <프로젝트>/.claude/skills/review-page/
```

- 빌드 도구(Vite, 플러그인, react-docgen)와 리뷰 화면 라이브러리(CodeMirror, `@mswjs/interceptors`, prism)는 **스킬 폴더 안에** 설치된다. 처음 빌드할 때 `cli.ts`가 스킬 폴더에서 `npm ci`를 돌린다(약 66MB). 대상 `package.json`은 바뀌지 않는다.
- `package-lock.json`의 해시가 바뀌면(스킬을 새로 복사하면) 다음 실행 때 다시 설치한다. 스킬 업데이트는 다시 복사하는 것이다.

## 처음 설정

Claude Code에서 `/review-page`를 부르면 설정 파일이 없을 때 처음 설정부터 한다(동의를 받고 `init` → 설정 채우기 → 예시 빌드). 직접 하려면:

```sh
node .claude/skills/review-page/src/cli.ts init
```

`init`은 현재 폴더에 아래를 만든다. 이미 있는 파일은 건너뛴다(`--force`면 덮어쓴다).

| 파일 | 용도 |
| --- | --- |
| `review.config.ts` | 설정. git remote가 GitHub면 `repoUrl`을 채운다 |
| `review/Example.tsx`, `review/cases/example/`(`pr.ts`, `example.tsx`) | 바로 빌드해 볼 수 있는 예시 PR 폴더. 확인 후 지워도 된다 |

`tsconfig`·`.gitignore`·`package.json`은 고치지 않고 넣을 내용을 출력한다.
- tsconfig `compilerOptions.paths`: `"review-kit": ["./.claude/skills/review-page/src/index.ts"]` (케이스·설정 파일의 `review-kit` import를 스킬 폴더로 돌린다. Node와 Vite 쪽은 `cli.ts`가 알아서 돌린다)
- tsconfig `include`에 `review`, `review.config.ts` (스킬이 `tsc`로 케이스를 검사한다. 넓은 glob이면 이미 들어 있다)
- `.gitignore`: `review/dist/`, `.claude/skills/review-page/node_modules/`

## 설정 (`review.config.ts`)

경로는 모두 이 파일이 있는 폴더 기준이다.

```ts
import { defineConfig } from "review-kit";

export default defineConfig({
  alias: { "@": "./src" },                  // tsconfig paths와 같게
  plugins: [],                              // 필요한 Vite 플러그인
  svgr: { include: "**/*.svg" },            // vite-plugin-svgr 옵션. 없으면 svgr을 쓰지 않는다
  jsxImportSource: "@emotion/react",        // 기본 "react"
  define: { "process.env.API_BASE_URL": JSON.stringify("") },
  sharedPackages: ["@emotion/react", "@tanstack/react-query", "react-router"], // 프로젝트 node_modules에서 가져올 패키지
  styles: ["./review/fonts.css"],           // 미리보기에 넣을 CSS(폰트 @font-face 등). 번들에 인라인된다
  wrapper: "./review/Wrapper.tsx",          // Provider 묶음
  mockHandlers: "./src/mocks/handlers.ts",  // 기존 MSW 핸들러. 시나리오에 없는 요청에 쓴다
  casesDir: "./review/cases",
  outDir: "./review/dist",
  repoUrl: "https://github.com/<owner>/<repo>",
  baseBranch: "origin/main",                // diff 비교 기준
});
```

- `sharedPackages`: Context를 쓰는 라이브러리(CSS-in-JS, 라우터, 서버 상태)는 리뷰 화면과 컴포넌트가 같은 인스턴스를 써야 한다. `react`, `react-dom`, `msw`는 항상 포함된다.
- `wrapper`: `({ initialPath, address, children }: WrapperProps) => ReactNode`를 default export한다. 라우터는 `MemoryRouter`를 쓴다(단일 HTML에서는 History API 라우팅이 안 된다). `QueryClient`는 `useState`로 만들고 `retry: false`로 둔다. 주소 표시줄을 쓰려면 라우터 안에서 `address.report`, `address.connect`를 연결한다 (plan.md 4.1 예시).

## PR 폴더

PR 하나는 `casesDir` 안의 폴더 하나이고, 빌드하면 HTML 하나가 된다.

```
review/cases/366/
  pr.ts            # 개요 탭
  breadcrumb.tsx   # 대상 탭 (파일 이름 순서)
  stepper.tsx
```

```ts
// review/cases/366/pr.ts
import { definePr } from "review-kit";

export default definePr({
  title: "[FE] 문서 경로·문서 넘기기 컨트롤 구현",
  summary: "문서 화면 상단의 경로 Breadcrumb과 문서 넘기기 Stepper를 공용 컴포넌트로 추가한다.",
  context: {                                        // 1. 맥락
    problem: ["문서 위치를 보여 줄 방법이 없었다."],
    decisions: [{ choice: "Breadcrumb은 링크 없이 div로 그린다.", why: "표시 전용이다." }],
    scope: { does: ["Breadcrumb을 추가한다."], doesNot: [] },
  },
  guide: {                                          // 2. 길잡이
    changes: ["Breadcrumb의 지금 항목은 자리가 모자라면 말줄임된다."],
    readingOrder: [],
    focus: ["'아주 긴 제목' 프리셋에서 말줄임 위치를 봐 주세요."],
    skim: [],
  },
  evidence: { tests: [], manual: [], ci: [] },      // 3. 증거
  risk: { impact: [], compatibility: [], deploy: [], securityPerf: [] }, // 6. 위험
  // 4. 플레이그라운드 목록과 5. 줄 수·커밋은 빌드가 채운다
});
```

```tsx
// review/cases/366/breadcrumb.tsx
import { defineCase } from "review-kit";
import Breadcrumb from "@/shared/components/primitives/ui/Breadcrumb";

export default defineCase({
  title: "Breadcrumb",                                                   // 탭 이름
  sources: ["src/shared/components/primitives/ui/Breadcrumb/index.tsx"], // 첫 파일이 props 컨트롤 대상
  props: { parent: "문서", current: "회원 탈퇴 정책" },
  render: (props, actions) => <Breadcrumb {...props} {...actions} />,
  presets: { "아주 긴 제목": { current: "…" }, "빈 제목": { current: "" } },
  scenarios: { 정상: [{ method: "GET", path: "/api/me", status: 200, body: {} }] },
  initialPath: "/",
  impacts: [],
});
```

`pr.ts`가 없으면 개요 탭 없이 첫 대상 탭이 열린다. 형식과 규칙은 `plan.md` 3·5·6장과 스킬(`review-page/SKILL.md`)에 있다.

## 명령

설정 파일이 있는 폴더에서 `node .claude/skills/review-page/src/cli.ts <명령>`으로 실행한다. PR 폴더는 폴더 경로나 `casesDir` 안의 이름(`366`)이다.

| 명령 | 하는 일 |
| --- | --- |
| `build <PR 폴더>... [--pr 번호]` | PR 폴더마다 `outDir/review-<폴더 이름>.html` 단일 파일. 크기를 출력하고 14MB를 넘으면 경고 |
| `dev <PR 폴더> [--port 5173]` | 같은 설정의 Vite dev 서버(HMR). 케이스를 쓰는 동안 확인용 |
| `init [--force]` | 위 '처음 설정' 참고 |

`--pr`은 PR 링크, 제목의 `#번호`, 브라우저 저장 키(`review-kit:{PR}:{케이스}`)에 쓰인다. 없으면 폴더 이름 앞 숫자를 쓴다.

## 스킬로 케이스 만들기

Claude Code에서 PR 브랜치를 체크아웃하고 설정 파일 폴더에서:

```
/review-page          # 현재 브랜치의 PR
/review-page 371      # 번호 지정
```

스킬은 PR 본문·커밋·diff를 읽어 `review/cases/<PR번호>/`에 `pr.ts`(개요)와, 바뀐 컴포넌트·페이지마다 케이스 파일(최대 3개)을 쓴다. `tsc` → `build` → 스모크 테스트를 통과할 때까지 PR 폴더 파일만 고친다(3번 실패하면 멈춘다). `src/`는 고치지 않는다.

스킬 폴더의 스크립트는 따로 써도 된다.
- `bash .claude/skills/review-page/scripts/find-impacts.sh <파일>...`: 그 파일을 import하는 다른 파일
- `node .claude/skills/review-page/scripts/smoke.mjs <html>...`: `file://`로 열어 첫 화면, 대상 탭마다 프리셋·시나리오마다 렌더링 오류, 콘솔 오류, 외부 요청 확인

## 아티팩트로 공유하기

1. 결과 HTML을 먼저 `file://`로 열어(더블클릭) 확인한다.
2. Claude Code에서 "이 HTML을 아티팩트로 게시해 줘"라고 하면 Artifact 도구로 올라가고 `claude.ai/artifact/...` 링크가 나온다. 같은 파일을 다시 게시하면 같은 링크가 갱신된다. claude.ai에서 직접 올려도 된다.
3. 게시 직후에는 **비공개**다. 아티팩트 페이지의 Share 메뉴에서 공유 범위를 바꿔야 리뷰어가 열 수 있다.
4. PR 본문이나 댓글에 링크를 붙인다. HTML 파일을 PR에 첨부하면 렌더링되지 않는다.

## 아티팩트 실행 환경 제약 (plan.md 1장)

| 제약 | 그래서 |
| --- | --- |
| HTML 파일 하나, 16MB 이하(`data:` URI 포함) | JS·CSS·폰트·이미지·SVG를 모두 파일 안에 넣는다 |
| Service Worker 등록 불가 | MSW 브라우저 모드 대신 `@mswjs/interceptors`로 fetch·XHR을 가로챈다 |
| 외부 요청(API, 이미지, CSS) 차단 | 실제 API는 호출할 수 없다. 목 데이터의 원격 이미지 URL은 깨진다 |
| `#key=value` hash·쿼리 문자열이 전달되지 않음 | 상태를 URL로 공유하지 않고 JSON 복사/붙여넣기로 넘긴다 |
| `window.open`은 대부분 `null`, `alert`·`confirm`·`prompt`는 보이지 않음 | 링크는 `<a target="_blank">`, 확인 단계는 화면 안 UI. 이것을 쓰는 컴포넌트는 아티팩트에서 동작이 다르다 |
| 클립보드 읽기·다운로드 차단 | 붙여넣기는 텍스트 영역에, 파일 내려받기 기능은 없다 |
| `localStorage` 동작 | 편집한 props와 시나리오를 브라우저에 저장한다 |

## 개발

```sh
pnpm install                          # 루트: 타입 검사 도구만
(cd review-page && npm ci)             # 스킬 폴더 의존성 (build·dev를 한 번 돌려도 설치된다)
pnpm typecheck                        # review-page/src와 targets/knot PR 폴더
```

- 스킬 원본은 `review-page/`다. 컴파일하지 않고 `.ts` 그대로 둔다. 리뷰 화면(`src/runtime/`)은 사용자 컴포넌트와 같은 Vite 번들에서 변환되고, Node 쪽(`cli.ts`, `init.ts`, `build/`)은 Node 타입 제거로 바로 실행된다.
- 의존성을 바꾸면 `review-page/`에서 `npm install`로 `package-lock.json`을 갱신한다.
- `targets/knot/`은 Knot에 둘 설정·wrapper·케이스 원본이다. 확인은 Knot 복사본에 스킬 폴더와 이 파일들을 복사해서 한다(plan.md 11.4).
- 개발 순서와 진행 상황은 `/roadmap` 스킬과 `progress.md`를 본다.
