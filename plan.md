# 리뷰 플레이그라운드 개발 지식 정리

PR 설명과, PR에서 바뀐 컴포넌트와 페이지를 리뷰어가 직접 만져 볼 수 있는 플레이그라운드를 담은 HTML 파일 하나를 AI가 PR마다 만들고, Claude 아티팩트로 공유하는 도구를 만들기 위해 필요한 지식을 모은 문서다.

참고 링크
- vite-plugin-singlefile: https://github.com/richardtallent/vite-plugin-singlefile
- @mswjs/interceptors: https://github.com/mswjs/interceptors
- MSW getResponse: https://mswjs.io/docs/api/get-response
- Claude Code Skills: https://code.claude.com/docs/en/skills

---

## 0. 만들려는 것

리뷰어가 링크 하나를 열면 아래 화면이 나온다. PR 하나에 HTML은 하나다(3.4).

- 개요 탭: AI가 정리한 PR 설명을 보여준다. 요약, 화면 사진, 배경, 핵심 아이디어와 예시, 구조 그림, 바뀐 점, 코드 흐름, 결정 목록, 리뷰 포인트, 플레이그라운드 목록 순서다. 처음 열면 이 탭이 보인다.
- 대상 탭: 리뷰 대상(컴포넌트나 페이지)마다 탭이 하나씩 있고, 탭 안에 아래 플레이그라운드가 있다.
- 미리보기: PR에서 바뀐 실제 컴포넌트나 페이지가 렌더링된다.
- props 편집: 타입에 맞는 입력 컨트롤로 props를 바꾼다.
- 프리셋: "아주 긴 제목", "문서 1개" 같은 엣지 케이스를 버튼 하나로 적용한다.
- 목 데이터 편집: 네트워크 응답(JSON, 상태 코드, 지연)을 웹에서 수정한다.
- 코드 패널: 실제 소스, PR diff, 파일 경로와 GitHub 링크를 보여준다.
- 결정 목록: 작성자가 내린 결정을 이유·버린 대안과 함께 최대 5개만 개요 탭에 보여준다.

역할 분담

| 구분 | 누가 만드나 | 언제 | 예시 |
| --- | --- | --- | --- |
| 틀 (shell) | 사람 | 한 번 | 화면 배치, Provider 설정, 모킹 엔진, 빌드 스크립트 |
| 내용 (PR 폴더) | AI | PR마다 | `review/cases/366/`(`pr.ts` + 대상마다 케이스 파일) |
| 결과물 | 빌드 | PR마다 | `dist/review-366.html` |

---

## 1. Claude 아티팩트 실행 환경 (2026-09-27 직접 확인)

`claude.ai/artifact/...` 페이지 안의 iframe(`*.frame.claudeusercontent.com`)에서 테스트한 결과다.

| 항목 | 결과 | 설계에 주는 영향 |
| --- | --- | --- |
| 올릴 수 있는 형태 | HTML 파일 하나 | JS, CSS, 이미지를 모두 파일 안에 넣어야 한다. 폰트 파일은 넣지 않는다(1.1 표 '폰트 파일') |
| Service Worker 등록 | 실패 (`sw.js`는 403, blob URL은 "protocol not supported") | MSW 브라우저 모드(`setupWorker`)를 쓸 수 없다 |
| 외부 URL `fetch` | `TypeError: Failed to fetch` | 실제 API 호출 불가, 외부 CDN 폰트나 이미지도 막힐 가능성이 높다 |
| 같은 origin `fetch` | 200 | 의미 있는 용도는 없다 |
| `localStorage` | 동작 | 편집한 props와 목 데이터를 저장할 수 있다 |
| Secure context | true | `crypto.randomUUID` 같은 API 사용 가능 |

### 1.1 추가 확인 (2026-09-27, 1.8 작업)

근거는 두 가지다. **게시**는 Claude Code의 Artifact 도구로 점검 페이지를 실제로 올려 확인했고, **표시**는 Artifact 도구가 알려 주는 아티팩트 실행 환경 규칙(CSP, iframe 제한)이다. 브라우저 안의 실행 결과는 점검 페이지(`review-kit-probe`)를 열어 다시 확인한다.

| 항목 | 결과 | 근거 | 설계에 주는 영향 |
| --- | --- | --- | --- |
| Claude Code에서 바로 게시 | 가능. Artifact 도구에 HTML 경로를 넘기면 `claude.ai/artifact/...` 링크가 나오고, 같은 경로로 다시 올리면 같은 링크가 갱신된다 | 게시 | 스킬 마지막 단계에서 수동 업로드 없이 게시할 수 있다(5단계) |
| 파일 크기 상한 | 페이지 16MB. `data:` URI도 포함해서 센다. 12.6MB 파일 게시는 성공 | 게시 + 규칙 | 빌드 스크립트에서 크기를 출력해 16MB에 가까우면 경고한다(14MB 넘으면 경고, 16MB 넘으면 "아티팩트에 올릴 수 없음"을 알린다. 빌드는 실패시키지 않는다) |
| 외부 이미지·CSS | 막힌다. 외부 스크립트는 cdnjs, jsdelivr 등 일부 CDN만, 외부 CSS는 Google Fonts만 허용되고 그 외 요청은 오류 없이 막힌다 | 규칙 | 이미지·SVG를 모두 파일 안에 넣는다. CDN 폰트는 막히므로 미리보기는 시스템 글꼴로 보인다. 원격 이미지 URL이 들어간 목 데이터는 화면에서 깨진다 |
| 폰트 파일(`data:font/*`) | 게시는 되지만 공개 공유가 막힌다. Share에서 "공개 공유를 위한 검토를 할 수 없는 파일 형식이 포함되어 있습니다"가 뜬다. Pretendard woff2를 인라인한 #452 페이지에서 확인(2026-10-04) | 게시 | 폰트 파일을 HTML에 넣지 않는다. 미리보기는 프로젝트 `font-family`의 대체 글꼴(시스템 글꼴)로 보인다. 빌드 결과에 `data:font/`가 있으면 경고한다(2026-10-04 사용자 결정) |
| `data:`·`blob:` 자원 | 허용 | 규칙 | vite-plugin-singlefile의 base64 인라인 방식이 동작한다 |
| 부모 URL hash 전달 | 영문·숫자·`.` `_` `~` `-`로만 된 `#anchor`만 전달된다. `#key=value`와 쿼리 문자열은 전달되지 않는다 | 규칙 | 편집 상태를 URL로 공유할 수 없다. 7장의 JSON 복사/붙여넣기가 유일한 공유 방법이다. `#code`처럼 탭을 고르는 용도로만 쓸 수 있다 |
| `window.open` | 같은 조직의 일부 로그인 사용자에게만 동작하고 나머지는 `null`을 돌려준다 | 규칙 | 쓰지 않는다 |
| `<a href target="_blank">` 링크 | 새 탭으로 열린다 | 규칙 | GitHub 링크는 `<a>`로 만든다. 링크 복사 버튼도 같이 둔다(8장) |
| 클립보드 | 클릭 핸들러 안의 `navigator.clipboard.writeText`는 동작하고(일부 앱 화면은 거부), 읽기(`readText`)는 항상 막힌다. 사용자의 붙여넣기(`paste` 이벤트)는 동작한다 | 규칙 | "JSON 복사"는 `writeText` + 실패 시 텍스트 선택, "JSON 붙여넣기"는 텍스트 영역에 붙여넣게 한다(7장) |
| `alert`·`confirm`·`prompt` | 보이지 않는다. `confirm()`은 `false`, `prompt()`는 `null`을 바로 돌려준다 | 규칙 | "초기화" 확인은 화면 안 UI로 만든다. 리뷰 대상 컴포넌트가 `confirm`을 쓰면 아티팩트에서 동작이 다르다 |
| 다운로드 | `<a download>`와 스크립트 저장이 막힌다 | 규칙 | 편집 상태를 파일로 내려받는 기능은 만들지 않는다 |
| Web Worker(blob) | 동작 | 규칙 | 필요하면 무거운 작업을 워커로 옮길 수 있다 |
| 로그인하지 않은 사람의 열람 | 게시 직후에는 비공개(소유자와 공유받은 사람만). 소유자가 페이지의 Share 메뉴에서 공유 범위를 바꾼다. 실행 환경 규칙은 익명 사용자와 공개 링크 열람을 전제로 한다 | 게시 + 규칙 | 리뷰어에게 링크를 보내기 전에 Share 메뉴에서 공유해야 한다. README(6.6)에 적는다 |

아직 확인하지 않은 것
- 점검 페이지를 브라우저에서 열어 위 규칙 기반 항목이 실제와 같은지 (Chrome 확장 연결 필요)
- 로그아웃 상태에서 공개 링크가 실제로 열리는지

---

## 2. 단일 HTML 빌드

### 2.1 vite-plugin-singlefile

- Vite 빌드 결과의 JS와 CSS를 `index.html` 안에 인라인해서 파일 하나만 남긴다.
- 진입점이 여러 개인 앱은 지원하지 않는다. 진입점은 하나로 두고, PR 폴더의 케이스 파일들은 가상 모듈 하나(`virtual:review-cases`)가 모두 import한다(3.4).
- `public/` 폴더의 정적 파일은 인라인하지 않는다. 이미지는 `import`로 가져와야 인라인된다.
- SVG는 Vite가 직접 인라인하지 않으므로 svgr 같은 로더로 컴포넌트화해야 한다.
- History API 기반 라우팅은 동작하지 않고 hash 라우팅이나 메모리 라우터를 써야 한다.

### 2.2 Vite JS API로 빌드하기

CLI에서 케이스 파일 경로를 받아 Vite를 코드로 실행한다. 케이스 파일은 가상 모듈로 주입한다.

```ts
// review/build.ts (Vite 8 기준)
import { build, type Plugin } from 'vite';
import svgr from 'vite-plugin-svgr';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';

function caseModule(casePath: string): Plugin {
  const id = 'virtual:review-case';
  return {
    name: 'review-case',
    resolveId: (source) => (source === id ? path.resolve(casePath) : null),
  };
}

export async function buildCase(casePath: string, outDir: string) {
  await build({
    root: path.resolve('review/shell'),
    plugins: [
      svgr({ include: '**/*.svg', svgrOptions: { exportType: 'default' } }),
      caseModule(casePath),
      sourcesModule(casePath), // 3.3 참고
      viteSingleFile(),
    ],
    // Vite 8은 JSX를 oxc로 변환하므로 빌드만 할 때는 @vitejs/plugin-react가 필요 없다
    oxc: { jsx: { runtime: 'automatic', importSource: '@emotion/react' } },
    resolve: {
      alias: { '@': path.resolve('src') },
      dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled'],
    },
    build: { outDir, assetsInlineLimit: Number.MAX_SAFE_INTEGER },
  });
}
```

주의할 점
- `assetsInlineLimit`을 크게 잡아야 이미지가 base64로 들어간다. 폰트 파일은 공개 공유를 막으므로 넣지 않는다(1.1 표).
- `resolve.dedupe`에 React와 CSS-in-JS 라이브러리(Knot는 Emotion)를 넣지 않으면 인스턴스가 두 개 생겨서 hooks 오류나 테마 Context 누락이 생긴다.
- vite-plugin-svgr 기본값은 `?react` 접미사가 붙은 import만 변환한다. 프로젝트가 `import Icon from './a.svg'` 형태를 쓰면 `include`와 `exportType`을 위처럼 바꿔야 하고, 이 옵션 이름은 사용하는 버전 문서에서 다시 확인한다. (vite-plugin-svgr 5.2 확인: `include`는 플러그인 옵션, `exportType`은 `svgrOptions` 안의 `@svgr/core` 옵션)
- vite-plugin-svgr는 기본으로 svgo를 돌리지 않는다. webpack의 `@svgr/webpack`처럼 svgo까지 거치려면 `svgrOptions.plugins`에 `@svgr/plugin-svgo`, `@svgr/plugin-jsx`를 순서대로 넣는다.

### 2.3 webpack 프로젝트(Knot)에서 필요한 작업

Knot는 webpack과 svgr을 쓰므로 Vite 빌드에서 같은 결과가 나오게 맞춰야 한다.

1. 경로 alias를 `tsconfig.json`의 `paths`와 맞춘다.
2. svgr 옵션을 webpack 설정과 맞춘다. Knot는 SVG의 `width`, `height`를 지우고 `size` prop으로 채우며 `aria-hidden="true"`를 붙이므로, 같은 svgr 옵션(svgo 플러그인, `svgProps`, `template` 등)을 Vite 쪽에도 넣는다.
3. `process.env.*`를 쓰는 코드가 있으면 Vite의 `define`으로 채운다.
4. CSS-in-JS의 JSX 설정(Knot는 Emotion의 `jsxImportSource: '@emotion/react'`)을 Vite의 `oxc.jsx.importSource`에 맞춘다.
5. `index.html`에서 CDN으로 불러오는 폰트는 아티팩트에서 막히고, 폰트 파일을 인라인하면 공개 공유가 막힌다(1.1 표). 그래서 폰트는 넣지 않고 시스템 글꼴로 보여 준다. 스킬도 폰트 파일을 갖지 않는다(2026-10-04 사용자 결정).

Knot에서 확인한 값 (2026-09-27, `frontend/` develop 기준)

| 항목 | Knot 설정 | Vite 쪽 대응 |
| --- | --- | --- |
| 패키지 관리자 | pnpm 11, Node 22, `"type": "module"` | `review/` 스크립트는 `node`로 실행하는 `.ts`(Node 22 타입 제거) 또는 `.mjs` |
| 번들러 | webpack 5 + babel(preset-react `importSource: '@emotion/react'`) | Vite 8 `oxc.jsx` (vitest가 이미 Vite 8.2, vite-plugin-svgr 5.2를 씀) |
| 스타일 | Emotion(`@emotion/react`, `@emotion/styled`), babel 플러그인은 쓰지 않음 | `dedupe`에 Emotion 추가 |
| svgr | `@svgr/webpack` 8, default export, `dimensions: false`, `expandProps: 'end'`, `svgProps: { width/height: '{size}', focusable: 'false', 'aria-hidden': 'true' }`, `size = 24` 템플릿, svgo `preset-default`(`removeViewBox`, `cleanupIds` 끔), `?url`이면 파일 URL | 같은 옵션을 vite-plugin-svgr `svgrOptions`로 옮긴다(`vitest.config.ts`에 svgo를 뺀 같은 설정이 있다) |
| alias | `@`, `@pages`, `@widgets`, `@features`, `@routes`, `@api`, `@composites`, `@primitives`, `@constants`, `@provider`, `@hooks`, `@utils`, `@store` | `vitest.config.ts`와 같은 목록 |
| `process.env` | `API_BASE_URL`, `API_MOCKING` 두 개 | `define`으로 `""`, `"false"` |
| API 호출 | axios 인스턴스(`@api/httpClient`, `withCredentials`, CSRF 인터셉터), SSE만 `fetch` | 6장처럼 XHR과 fetch를 모두 가로챈다 |
| 서버 상태 | TanStack Query v5 | 4.2대로 시나리오마다 `new QueryClient()` |
| 라우터 | react-router 8 `createBrowserRouter` | 미리보기는 `MemoryRouter` |
| 전역 Provider | `ThemeProvider`(Emotion) + `GlobalStyle` + `QueryClientProvider` (`@provider/themeProvider`, `@provider/queryClient`) | 4.1 wrapper와 같다 |
| 폰트 | `index.html`의 jsDelivr CDN `<link>`로 Pretendard Variable | 5번대로 넣지 않는다. 미리보기는 Pretendard 대신 시스템 글꼴로 보인다(2026-10-04 사용자 결정) |
| MSW | msw 2.15, 핸들러는 `@api/mock/handlers` | 6.1 `getResponse`로 재사용 |

그 밖에
- `package.json`에 이미 `review` 스크립트(`scripts/review.mjs`)가 있으므로 다른 이름(`review:build` 등)을 쓴다.
- `tsconfig.json`의 `include`가 `./**/*.ts(x)`라서 `review/`도 Knot 타입 체크 대상이 된다.
- #365는 이슈 번호이고 Stepper·Breadcrumb 구현 PR은 #366(`fe/feature/#365` 브랜치)이다. 처음에는 케이스 파일 이름에 이슈 번호를 썼고, PR 폴더(3.4)로 바꾸며 PR번호 `366`으로 옮겼다(PR 링크와 저장 키가 PR번호를 쓴다).

스파이크 결과 (2026-09-27, PR #366 브랜치)
- 처음에는 Knot worktree(`2026-Knot-pr366/frontend/review/`)에서 만들었고, 같은 날 13장 '작업 위치'에 따라 prplay로 옮겼다. 아래 `review/...` 경로는 옮기기 전 이름이다(`review/build.ts` → `src/build/build.ts`, `review/shell/` → `src/runtime/`, `review/cases/` → `targets/knot/cases/`).
- 빌드: `pnpm review:build review/cases/365.tsx` → `review/dist/review-365.html`. `review/build.ts`는 Node 22의 타입 제거로 바로 실행한다. pnpm은 간접 의존성을 import할 수 없으므로 `vite`를 직접 devDependency로 둔다.
- `review-kit` alias는 Knot tsconfig에 없으므로, 타입은 `review/shell/virtual.d.ts`의 ambient 선언으로 두고 런타임만 alias로 연결한다. 이렇게 해서 Knot `tsc --noEmit`이 그대로 통과한다.
- svgr: webpack 옵션 그대로 옮긴 결과 Stepper 화살표 `width/height=14`, Breadcrumb 화살표 `12`, `aria-hidden="true"`, `focusable="false"`, `viewBox` 유지로 webpack 설정과 같다.
- 폰트: `pretendard` 패키지의 `PretendardVariable.woff2`(2.0MB)를 인라인해서 HTML 하나가 약 2.9MB가 됐다. 이후 폰트 파일이 공개 공유를 막는 것을 확인해 폰트를 넣지 않게 바꿨다(2026-10-04, 1.1 표).

대안으로 webpack에 `html-webpack-plugin`과 스크립트 인라인 플러그인을 붙여 기존 설정을 재사용하는 방법도 있다. 라이브러리로 뺄 생각이면 Vite 쪽이 설정 주입이 쉽다.

---

## 3. 케이스 파일

### 3.1 형식

```ts
// review-kit 타입
export type MockRoute = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;          // '/api/documents/:id'
  status: number;
  delayMs?: number;
  body: unknown;
};

export type ReviewCase<P> = {
  title: string;
  sources: string[];                       // 코드 패널에 보여줄 파일 경로
  render: (props: P, actions: Actions) => React.ReactNode; // 상태가 필요한 컴포넌트를 감싸는 자리. actions는 5.1
  props: P;                                // 기본 props
  presets?: Record<string, Partial<P>>;    // 엣지 케이스
  controls?: Controls<P>;                  // 컨트롤의 범위·선택지 (5.1)
  scenarios?: Record<string, MockRoute[]>; // 네트워크 시나리오
  initialPath?: string;                    // 페이지 케이스의 시작 URL
  impacts?: string[];                      // 영향받는 다른 파일
};

// PR 개요 (3.4). 좋은 리뷰에 필요한 7가지(맥락·길잡이·증거·만져 보기·크기·위험·리뷰 편의) 순서로 쓴다
export type ReviewPr = {
  title: string;            // PR 제목
  summary: string;          // 무엇을 왜 바꿨는지 한두 문장
  revisions?: PrRevision[]; // 7. 리뷰 반영 후 바뀐 점. 최신이 앞
  context: PrContext;       // 1. 맥락
  intuition?: PrIntuition;  // 1. 핵심 아이디어와 예시
  diagrams?: PrDiagram[];   // 1. 구조 그림. 최대 2개
  guide: PrGuide;           // 2. 길잡이
  evidence: PrEvidence;     // 3. 증거
  previews?: PrLink[];      // 4. 프리뷰 배포·스토리북 링크
  size?: string;            // 5. 크기 한마디. 관심사가 여럿이거나 리팩터링이 섞였을 때만
  risk: PrRisk;             // 6. 위험과 영향 범위
};

export type PrLink = { label: string; url: string };

export type PrContext = {
  problem: string[];       // 풀려는 문제와 바뀌기 전 모습. 최대 3문장
  links?: PrLink[];        // 관련 이슈·티켓
  basics?: string[];       // 처음 보는 사람을 위한 기존 구조 설명. 최대 4문장. 접혀 있다
  decisions: PrDecision[]; // 설계급 결정. 최대 3개
  scope: { does: string[]; doesNot: string[] }; // 이번에 하는 것, 일부러 하지 않은 것. 각 최대 3개
};

export type PrDecision = {
  question: string;  // 이 결정이 답하는 질문. 기능 언어로, 코드 이름 없이 한 문장
  choice: string;    // 작성자가 고른 답. 동작·구조 말로 한 문장
  why: string;       // 고른 이유(제약 포함) 한 문장
  rejected?: string; // 검토했다가 버린 대안과 버린 이유 한 문장
  code?: string[];   // 이 결정이 드러나는 코드 이름(props·타입·함수). 최대 4개
};

export type PrIntuition = {
  idea: string;          // 왜 이렇게 바꿨는지 본질 한두 문장
  examples: PrExample[]; // 작은 예시 데이터로 보여 주는 그림. 최대 2개
};

// flow: 단계가 화살표로 이어지는 흐름 그림. compare: 전/후 나란히 비교
export type PrExample =
  | { kind: "flow"; caption: string; steps: { label: string; data?: string }[] } // 단계 2~5개
  | { kind: "compare"; caption: string; before: PrSide; after: PrSide };

export type PrSide = { label: string; data: string }; // data는 여러 줄 텍스트나 코드

// 시퀀스·아키텍처처럼 그림이 있어야 이해가 쉬울 때 쓰는 그림. Mermaid 금지, SVG를 직접 쓴다 (3.4)
export type PrDiagram = {
  caption: string; // 그림 설명 한 문장
  svg: string;     // 직접 쓴 <svg viewBox="...">...</svg> 문자열
};

export type PrGuide = {
  changes: string[];          // 변경 요약. 동작·화면 단위, 최대 5개
  readingOrder: PrCodeStep[]; // 읽는 순서. 최대 5단계
  focus: string[];            // 집중해서 봐 줬으면 하는 곳(작성자가 확신이 없거나 논의하고 싶은 곳). 최대 3개
  skim: string[];             // 대충 봐도 되는 곳(자동 생성, 이름만 바꾼 곳, 포맷팅). 최대 3개
};

export type PrCodeStep = {
  role: "core" | "side"; // core: 리뷰어가 판단할 약속·동작(props·타입·상태 위치·데이터 흐름), side: 구현 세부나 따라 고친 곳
  title: string;    // 이 묶음이 하는 일
  files: string[];  // 설정 파일 폴더 기준 경로
  explain: string;  // 1~3문장
  snippet?: string; // 핵심 줄. 15줄 이내, 원본 그대로
};

export type PrEvidence = {
  tests: { file: string; guarantees: string }[]; // 추가·바꾼 테스트와 그 테스트가 보장하는 것. 최대 5개
  manual: string[]; // 직접 확인한 방법(재현 절차, 환경, 엣지 케이스). 최대 3개
  ci: { name: string; state: "pass" | "fail" | "pending" | "skip" }[]; // gh pr checks 결과
};

export type PrRisk = {
  impact: string[];        // 건드리는 다른 기능·모듈
  compatibility: string[]; // API·DB 마이그레이션·설정 변경
  deploy: string[];        // 피처 플래그, 배포 순서, 롤백 방법
  securityPerf: string[];  // 보안·성능 고려와 측정값
}; // 각 최대 3개. 없으면 빈 배열이고 화면에 "해당 없음"으로 보인다

export type PrRevision = {
  since: string;     // 지난 리뷰 때 커밋 SHA
  changes: string[]; // 그 뒤로 반영한 것. 최대 5개
};

export type Actions = Record<string, (...args: unknown[]) => void>; // 함수 props 이름 → 호출 기록 로거

// props 키마다 컨트롤을 좁힌다 (5.1). 값 타입이 props 타입에서 오므로 틀린 선택지·범위는 tsc가 잡는다
export type Controls<P> = { [K in keyof P]?: PropControl<P[K]> };
export type PropControl<T> = {
  options?: readonly T[];  // 이 값들 중 하나만 고르는 셀렉트
} & ([NonNullable<T>] extends [number]
  ? { min?: number; max?: number; step?: number } // 숫자 범위. step이 정수면 정수만 받는다
  : {});

export const defineCase = <P,>(c: ReviewCase<P>) => c;
export const definePr = (pr: ReviewPr) => pr;
```

### 3.2 예시 (#365)

```tsx
// review/cases/366/stepper.tsx
import { useState } from 'react';
import Stepper from '@/shared/components/primitives/ui/Stepper';
import { defineCase } from 'review-kit';

export default defineCase({
  title: 'Stepper',
  sources: ['src/shared/components/primitives/ui/Stepper/index.tsx'],
  props: { total: 3 },
  render: ({ total }, actions) => <Harness total={total} actions={actions} />,
  presets: { '문서 1개': { total: 1 }, '문서 12개': { total: 12 } },
  controls: { total: { min: 1, max: 20, step: 1 } },
  impacts: [],
});

function Harness({ total, actions }: { total: number; actions: Actions }) {
  const [current, setCurrent] = useState(1);
  return (
    <Stepper
      current={current}
      total={total}
      onPrev={() => { setCurrent((c) => c - 1); actions.onPrev?.(); }}
      onNext={() => { setCurrent((c) => c + 1); actions.onNext?.(); }}
    />
  );
}
```

제어 컴포넌트(부모가 상태를 들고 콜백만 받는 컴포넌트)는 props만 바꿔서는 동작을 볼 수 없으므로, 위처럼 케이스 안에 상태를 가진 Harness를 둔다. Harness가 콜백을 직접 채울 때도 `actions`의 로거를 같이 불러야 호출 기록 패널에 남는다.

### 3.3 소스 코드와 diff 주입

빌드 시점에 파일 내용과 diff를 읽어 가상 모듈로 넣는다.

```ts
import { execSync } from 'node:child_process';
import fs from 'node:fs';

function sourcesModule(casePath: string): Plugin {
  const id = 'virtual:review-sources';
  return {
    name: 'review-sources',
    resolveId: (s) => (s === id ? '\0' + id : null),
    async load(resolved) {
      if (resolved !== '\0' + id) return null;
      const { default: c } = await import(path.resolve(casePath)); // 또는 정적 파싱
      const sha = execSync('git rev-parse HEAD').toString().trim();
      const files = c.sources.map((p: string) => ({
        path: p,
        code: fs.readFileSync(p, 'utf8'),
        diff: execSync(`git diff origin/main...HEAD -- ${p}`).toString(),
        url: `https://github.com/woowacourse-teams/2026-Knot/blob/${sha}/${p}`,
      }));
      return `export default ${JSON.stringify({ sha, files })}`;
    },
  };
}
```

- 케이스 파일은 TSX라서 Node에서 바로 `import`할 수 없다. `sources` 목록만 정규식이나 TypeScript AST로 읽거나, `tsx`/`jiti` 같은 로더를 쓴다.
- GitHub 링크에 브랜치 이름 대신 커밋 SHA를 넣어야 PR이 머지되거나 수정돼도 링크가 같은 코드를 가리킨다. 줄 범위는 `#L10-L25`로 붙인다.
- 구현(4.1): 저장소 URL과 비교 기준은 `review.config.ts`의 `repoUrl`, `baseBranch`(없으면 `origin/main`)를 쓴다. `sources`는 설정 파일 폴더 기준 경로이고, Knot처럼 설정 폴더가 git 루트가 아니면(`frontend/`) `git rev-parse --show-prefix`를 앞에 붙여 GitHub 경로를 만든다. `git`을 쓸 수 없거나 비교 기준이 없으면 diff와 SHA는 비우고 빌드는 계속한다. `repoUrl`이 없으면 링크를 만들지 않는다. 가상 모듈은 `{ sha, base, files: [{ path, code, diff, url }] }`이고, dev에서는 파일이 바뀌면 다시 읽는다.
- 모듈 이동(8장)을 위해 파일마다 `imports`(import 경로 문자열 → 함께 넣은 파일의 `path`)를 붙이고, 케이스마다 `sources`가 import하는 파일을 같은 모양으로 `linked`에 넣는다.

### 3.4 PR 폴더와 개요 (2026-09-29 변경, 사용자 결정)

처음에는 케이스 파일 하나를 HTML 하나로 빌드해서 대상이 여럿인 PR은 HTML도 여럿이었고, 화면에는 플레이그라운드만 있었다. 지금은 **PR 하나를 HTML 하나**로 빌드하고 PR 설명을 같이 넣는다.

- PR 폴더: `<casesDir>/<PR번호>/` 하나가 PR 하나다. 안에 `pr.ts`(개요)와 대상마다 케이스 파일 `<이름>.tsx`를 둔다. `<이름>`은 컴포넌트 이름의 kebab-case이고, 대상은 최대 9개다(2026-10-04 사용자 결정, 처음에는 3개였다).

  ```
  review/cases/366/
    pr.ts            # export default definePr({ ... })
    stepper.tsx      # export default defineCase({ ... })
    breadcrumb.tsx
  ```
- `pr.ts`는 3.1의 `ReviewPr`를 `definePr`로 default export한다. 스킬은 늘 만들고, 빌드는 없어도 된다(없으면 개요 탭 없이 첫 대상 탭을 연다. `init` 예시처럼 PR이 아닌 폴더용).
- 케이스 파일은 폴더 안의 `pr.ts`를 뺀 `*.tsx`이고, 탭은 파일 이름 순서다. 탭 이름은 케이스 `title`이다.
- 빌드: `build <PR 폴더>` → `<outDir>/review-<폴더 이름>.html` 하나. 인자는 폴더 경로나 `casesDir` 안의 폴더 이름(`366`)이다. PR번호는 `--pr`, 없으면 폴더 이름 앞의 숫자다.
- 가상 모듈 `virtual:review-cases`가 폴더의 케이스 파일을 모두 import하고, 케이스마다 docgen props(5.1)와 소스·diff(3.3)를 함께 내보낸다. `pr.ts`가 있으면 그것도 import한다. PR번호가 숫자이고 `repoUrl`이 있으면 PR 링크(`<repoUrl>/pull/<번호>`)도 만든다. 개요의 크기 섹션을 위해 비교 기준과의 `git diff --shortstat`(파일 수, 추가·삭제 줄 수)과 `git log`(커밋 SHA·제목, 오래된 것부터)도 `meta`에 넣는다. git을 쓸 수 없으면 비운다.
- 화면 맨 위에 제목(`<title>`과 같은 `#PR번호 제목`, PR 링크가 있으면 링크)과 탭을 둔다: `[개요] [대상 1] [대상 2] ...`. 처음 열면 개요 탭이다. 탭이 하나뿐이면 탭 줄을 숨긴다.
  - 개요 탭: 리뷰어가 PR을 처음 보더라도 이 탭만 읽고 무엇을 왜 바꿨는지, 어디부터 볼지, 무엇이 위험한지 알게 하는 것이 목표다(2026-09-29 사용자 결정). 좋은 리뷰에 필요한 7가지 순서로 섹션을 둔다(2026-09-29 사용자 결정).
    - 맨 위: `summary`. 바로 아래 화면 사진, 그 아래 `revisions`가 있으면 "리뷰 반영 후 바뀐 점"을 최신부터 보여 주고, 항목마다 `<repoUrl>/compare/<since>...<sha>` 링크를 달아 그 뒤로 바뀐 부분만 볼 수 있게 한다.
    - 화면 사진(2026-10-05 사용자 결정): 개요만 읽어도 무엇이 바뀌었는지 눈으로 보이게, 대상 탭의 미리보기를 찍은 사진을 요약 바로 아래 "화면" 칸에 둔다. 바뀐 뒤 모습만 찍고 비교 기준(바뀌기 전) 화면은 찍지 않는다.
      - 찍기: `build`가 HTML을 만든 뒤, 설정 파일 폴더 프로젝트의 `playwright`나 `@playwright/test`로 그 HTML을 `file://`로 열어 찍는다(스모크와 같은 방식, 9.4). 대상마다 기본 상태(기본 props와 첫 시나리오), 프리셋(파일에 적힌 순서), 첫 시나리오를 뺀 시나리오 순서로 최대 4장, PR 전체 최대 12장이다. 장마다 저장된 편집 상태를 지우고 새로 연 뒤 그 대상 탭을 누르고 프리셋이나 시나리오 버튼 하나만 누른다.
      - 화면 폭 1024px(좁은 화면 배치라 미리보기가 위에 가득 찬다), 픽셀 배율 2로 찍는다. 미리보기 영역(`.review-preview`) 안에서 실제로 그려진 곳(글자, 이미지·SVG·입력 요소, 배경이나 테두리가 있는 요소)을 모두 감싸는 사각형에 16px 여백을 더해 자르고(작은 컴포넌트가 넓은 빈 공간 속에 작게 찍히지 않게), 미리보기 영역 밖으로는 넘기지 않으며 높이는 최대 1200px이다. JPEG(품질 80)를 data URL로 HTML 안 `<script type="application/json" id="review-shots">`에 `[{ case, state, kind, src, width, height }]`로 넣는다(`kind`는 `default`·`preset`·`scenario`, `state`는 프리셋·시나리오 이름이고 기본 상태는 "기본", `width`·`height`는 자른 크기(CSS px)). 다시 빌드하지 않고 결과 HTML에 이 태그만 끼워 넣는다.
      - playwright가 없거나 찍다가 실패하면 사진 없이 빌드를 끝내고 그 사실을 출력한다. 렌더링 오류가 난 상태도 찍지 않고 건너뛴다. `build --no-shots`면 찍지 않는다. dev 서버에서는 찍지 않는다.
      - 화면: 사진이 있으면 "화면" 칸에 격자로 둔다(넓은 화면 2열, 좁은 화면 1열). 사진은 찍힌 크기(`width`·`height`) 그대로 보여 주고 칸보다 넓으면 칸 폭에 맞춰 줄인다(작은 컴포넌트를 키우지 않는다). 사진마다 아래에 "대상 title · 상태 이름"을 쓰고, 누르면 그 대상 탭을 그 상태(프리셋 적용 또는 그 시나리오 선택)로 연다. 사진이 없으면 칸을 그리지 않는다.
    - 1. 맥락: 풀려는 문제(`problem`)와 이슈 링크(`links`), "처음이라면" 접힌 영역(`<details>`)의 `basics`, 결정 목록(`decisions`. 질문, 고른 답, 이유, 버린 대안, 코드 이름), 범위(하는 것 / 일부러 하지 않은 것 두 칸). 이어서 핵심 아이디어(`intuition`)와 구조 그림(`diagrams`)을 그린다.
      - 결정과 이유(2026-10-04 사용자 결정): 코드를 모르는 리뷰어도 읽히도록 결정마다 그 결정이 답하는 질문(`question`)을 굵게 먼저 두고, 고른 답(`choice`), 이유, 버린 대안을 잇는다. 질문과 답은 기능·동작 말로 쓰고 props·함수 이름은 쓰지 않으며, 코드 이름은 맨 아래 "코드" 줄(`code`)에 작게 모은다. 결정은 잘못 이해하면 PR 전체 판단이 바뀌는 설계급만 최대 3개 고르고, 그보다 작은 결정은 읽는 순서의 `side` 단계 설명으로 보낸다. 결정에 쓴 이유는 핵심 아이디어·읽는 순서·집중해서 봐 줄 곳에서 다시 쓰지 않는다.
      - 핵심 아이디어: `idea` 아래에 예시 그림을 그린다. `flow`는 단계 상자를 화살표로 잇고 상자마다 예시 데이터를 고정폭 글꼴로 보여 준다. `compare`는 전/후 상자를 나란히(좁은 화면에서는 위아래로) 둔다.
      - 구조 그림(2026-09-29 사용자 결정): 시퀀스(모듈·서버 사이 호출 순서)나 아키텍처(컴포넌트·모듈의 관계)처럼 그림이 있어야 이해가 쉬울 때만 `diagrams`에 넣고, 핵심 아이디어 다음에 그린다. **Mermaid 같은 다이어그램 문법·라이브러리는 쓰지 않고 SVG를 직접 쓴다.** SVG는 `viewBox`만 두고 화면 폭에 맞춰 줄어든다(최대 720px). 색은 리뷰 화면 색을 따르도록 `rv-d-*` 클래스(`rv-d-box` 상자, `rv-d-accent` 이번 PR에서 바뀐 상자, `rv-d-line` 선, `rv-d-arrow` 화살표 머리, `rv-d-muted` 보조 글자)를 쓴다. 화면은 넣기 전에 `<script>`, `<foreignObject>`, `on*` 속성, `#`로 시작하지 않는 `href`를 지운다. 읽을 수 없는 SVG면 그 자리에 "그림을 그릴 수 없습니다"를 보여 준다.
    - 2. 길잡이: 변경 요약(`changes`), 읽는 순서(`readingOrder`), 집중해서 봐 줄 곳(`focus`), 대충 봐도 되는 곳(`skim`).
      - 읽는 순서: 단계마다 번호, 핵심/부수 표시(`role`), 제목, 파일 경로, 설명, `snippet`(코드 패널과 같은 문법 강조, 첫 `files` 확장자 기준)을 보여 준다.
      - 단계의 `files` 중 하나가 어떤 대상의 `sources`에 있으면 제목 옆에 "플레이그라운드에서 보기" 버튼을 둔다. 누르면 그 대상 탭으로 간다(2026-09-29 사용자 결정). 겹치는 대상이 여럿이면 버튼도 여럿이고, 버튼에는 대상 `title`을 쓴다.
    - 3. 증거: 테스트(파일과 보장하는 것), 직접 확인한 방법, CI 결과(상태 표시와 이름). 바뀐 뒤 화면은 맨 위 화면 사진이 보여 주고, 바뀌기 전과의 비교는 `compare` 예시와 대상 탭이 맡는다. 테스트·CI가 비었으면 "추가한 테스트 없음", "CI 결과 없음"을 보여 준다.
    - 4. 직접 만져 보기: 플레이그라운드 목록(대상 `title`, 첫 `sources` 경로, 프리셋·시나리오 이름. 누르면 그 탭으로 간다)과 `previews` 링크.
    - 5. 크기: 빌드가 비교 기준과의 차이로 바뀐 파일 수와 추가·삭제 줄 수, 커밋 목록(`repoUrl`이 있으면 커밋 링크)을 채운다. 추가+삭제가 400줄을 넘으면 "커밋 단위로 나눠 읽어 주세요"를 보여 준다. `size`가 있으면 같이 보여 준다.
    - 6. 위험과 영향 범위: 영향 범위, 호환성, 배포 주의사항, 보안·성능 네 칸. 빈 칸은 "해당 없음"이다.
    - 7. 리뷰 방법: 코멘트 앞에 `must`(머지 전에 고쳐야 함), `nit`(사소한 제안), `question`(질문)을 붙여 달라는 안내와, 린트·포맷·타입은 CI에 맡기고 설계와 로직을 봐 달라는 안내. 고정 문구다.
    - 맨 아래: PR 링크, 커밋 SHA와 비교 기준.
    - `intuition`·`diagrams`·`revisions`·`previews`·`size`가 없으면 그 부분을 그리지 않는다. 나머지는 스킬이 늘 쓴다.
    - 글 안의 인라인 코드: `pr.ts` 문장 안에서 백틱(`` ` ``)으로 감싼 부분은 백틱을 지우고 인라인 코드(고정폭 글꼴, 옅은 배경)로 보여 준다. 다른 마크다운 문법은 해석하지 않는다. 이미 고정폭으로 보여 주는 칸(`flow`·`compare`의 `data`, `snippet`, 파일 경로)과 SVG는 그대로 둔다.
  - 대상 탭: 플레이그라운드를 좌우로 나눈다(2026-10-04 사용자 결정). 왼쪽은 코드 패널(소스 전체, PR diff, 영향 범위), 오른쪽은 미리보기와 그 아래 편집 패널(Props, 프리셋, 호출 기록, 시나리오, 요청 기록, 편집 상태)이다. 오른쪽이 길어져도 코드를 보며 만질 수 있게 왼쪽은 화면에 붙어 따라온다. 좁은 화면(1024px 이하)에서는 위아래로 쌓고 오른쪽(미리보기와 편집 패널)을 먼저 둔다.
    - 자리 바꾸기(2026-10-04 사용자 결정): 두 칸 맨 위에 손잡이(⠿와 칸 이름 "코드", "미리보기")를 둔다. 손잡이를 끌어 반대쪽 칸 위에 놓으면 두 칸의 좌우가 바뀐다. 끄는 동안 놓을 칸에 테두리를 그린다.
    - 폭 조절(2026-10-04 사용자 결정): 두 칸 사이에 세로 디바이더를 둔다. 끌면 왼쪽 칸 폭이 바뀌고(전체의 20%~80%), 두 번 누르면 반반으로 돌아간다. 키보드로는 디바이더에 포커스를 두고 ←/→로 5%씩 바꾼다.
    - 좌우 순서와 폭은 열람자 취향이라 케이스와 상관없이 `localStorage`의 `review-kit:layout` 키에 `{ codeFirst, ratio }`로 저장한다(7장). "초기화"는 이 값을 지우지 않는다.
    - 좁은 화면에서는 손잡이와 디바이더를 숨기고 위의 쌓는 순서를 따른다.
- 탭을 바꾸면 그 대상의 플레이그라운드를 새로 마운트한다. props와 편집한 시나리오는 케이스마다 저장돼 있어(7장) 그대로 돌아오고, 시나리오 선택·호출 기록·요청 기록은 처음부터 시작한다. 모킹 엔진은 하나이고 탭을 바꿀 때 그 대상의 첫 시나리오 라우트로 바꾼다. 개요 탭에서는 미리보기를 그리지 않는다.

---

## 4. 미리보기 렌더링

### 4.1 Provider 감싸기

프로젝트마다 다른 Provider를 설정 파일의 `wrapper`로 받는다.

```tsx
wrapper: ({ children }) => (
  <ThemeProvider theme={theme}>
    <GlobalStyle />
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath ?? '/']}>{children}</MemoryRouter>
    </QueryClientProvider>
  </ThemeProvider>
)
```

- 라우터는 `MemoryRouter`(또는 사용하는 라우터의 메모리 히스토리)를 쓴다. 단일 HTML에서는 History API 라우팅이 안 되고, 페이지 케이스는 `initialPath`로 시작 URL을 정한다.
- URL 표시줄: 미리보기 툴바에 라우터의 현재 URL(경로+쿼리+hash)을 보여 준다. 링크나 버튼으로 이동하면 바로 바뀌고, URL을 직접 입력하고 Enter를 누르면 그 URL로 이동한다. `↺`는 `initialPath`로 이동한다. props나 시나리오가 바뀌어 다시 마운트될 때(4.2)는 `initialPath`로 돌아가지 않고 보고 있던 URL에서 다시 시작한다. 라우터는 프로젝트마다 다르므로 review-kit은 wrapper에 `address` prop(`report(path)`, `connect(navigate)`)을 넘기고, wrapper가 라우터 안에서 현재 URL을 알리고 이동 함수를 연결한다. wrapper가 연결하지 않으면 URL 표시줄을 숨긴다.

  ```tsx
  function AddressSync({ address }: { address: ReviewAddress }) {
    const location = useLocation();
    const navigate = useNavigate();
    useEffect(() => address.report(location.pathname + location.search + location.hash), [location]);
    useEffect(() => address.connect((path) => navigate(path)), [navigate]);
    return null;
  }
  ```
- 로그인 상태가 필요한 페이지는 인증 Context도 목으로 채운다. Knot은 인증 Context 없이 `GET /api/v1/auth/me` 조회로 로그인 여부를 판단하므로, 시나리오의 `me` 응답이 곧 인증 목이다(3.3 확인).
- 상태를 바꾸는 요청(POST 등) 앞에 CSRF 토큰 조회(`GET /api/v1/auth/csrf`)가 먼저 나가므로, POST를 쓰는 화면의 시나리오에는 CSRF 라우트도 넣는다. Knot 홈의 초대 카드는 조회에도 `POST /workspaces/:id/invitations`를 쓴다.

### 4.2 다시 그리기와 캐시 초기화

- props나 시나리오가 바뀌면 미리보기 루트에 `key`를 바꿔 끼워 전체를 다시 마운트한다.
- React Query 같은 캐시가 있으면 이전 응답이 남으므로, 시나리오가 바뀔 때마다 `new QueryClient()`를 새로 만들어 넘긴다. 재시도 옵션(`retry`)은 꺼야 에러 시나리오가 바로 보인다.

### 4.3 격리

- 미리보기를 Error Boundary로 감싸서 컴포넌트가 터져도 편집 패널은 살아 있게 한다.
- 리뷰 화면의 CSS와 컴포넌트 CSS가 섞이지 않게, 리뷰 화면 스타일은 접두사가 붙은 클래스나 Shadow DOM에 둔다. 전역 스타일(`GlobalStyle`)은 미리보기 쪽만 적용되게 한다.
  - 구현(2단계): 리뷰 화면은 `#review-root`의 Shadow DOM 안에 그리고, 미리보기는 일반 DOM의 `div[slot="preview"]`에 `createPortal`로 그린 뒤 Shadow DOM의 `<slot name="preview">`로 꽂는다. Knot `GlobalStyle`처럼 `button`, `ul`을 초기화하는 전역 스타일과 Emotion 스타일은 일반 DOM에만 닿으므로 리뷰 화면이 깨지지 않는다.
  - slot으로 꽂힌 미리보기는 Shadow DOM 쪽에서 글꼴과 색을 물려받으므로 `:host`에 `all: initial`을 쓰지 않는다. 리뷰 화면 요소에만 글꼴과 색을 직접 준다.
- 폭 조절 슬라이더로 미리보기 컨테이너 폭을 바꿀 수 있게 하면 반응형과 말줄임 문제를 바로 확인할 수 있다. 미디어 쿼리까지 확인하려면 미리보기를 `srcdoc` iframe에 넣어야 한다.
  - 슬라이더 범위는 240px부터 미리보기 영역의 실제 좌우 폭까지다. 기본값 "가득"은 미리보기 영역 폭을 그대로 쓰고, 글자 대신 그 폭을 `NNNpx`로 보여 준다. 창 크기가 바뀌면 최댓값과 표시 값도 따라 바뀐다. 직접 고른 폭이 영역보다 넓어지면 영역 폭으로 줄여 보여 준다.

---

## 5. props 편집

### 5.1 타입에서 컨트롤 자동 생성

`react-docgen` 8(Babel 파서 기반, Storybook도 쓰는 도구)을 빌드 시점에 실행하면 컴포넌트 props의 이름, 타입, 필수 여부, 기본값, JSDoc 설명, 유니온 리터럴 목록을 얻을 수 있다.

- `react-docgen-typescript`는 TypeScript JS API(`ts.createProgram`)가 필요한데, TypeScript 7(Knot가 쓰는 7.0.2)에는 이 API가 없다. `react-docgen`은 TypeScript 버전과 무관하므로 이쪽을 쓴다 (2026-09-27 결정).
- `react-docgen`은 파일 하나를 문법으로만 읽는다. 다른 파일에서 가져온 타입이나 `ButtonHTMLAttributes` 같은 상속 props는 풀지 못하므로, 풀지 못한 타입은 JSON 편집기로 보여준다. 다만 케이스 기본값이 문자열·숫자·boolean이면 JSON 편집기 대신 기본값의 `typeof` 컨트롤을 쓰고, 정해진 값만 받는 타입이면 스킬이 `controls`의 `options`를 채운다.
- 케이스의 `sources` 첫 파일을 대상 컴포넌트로 보고, 그 파일의 default export 컴포넌트 props를 가상 모듈 `virtual:review-props`로 주입한다.

| props 타입 | 컨트롤 |
| --- | --- |
| `string` | 텍스트 입력 |
| `number` | 숫자 입력(`type="number"`). 범위가 있으면 `min`·`max`·`step`을 걸고, 양끝이 다 있으면 슬라이더를 같이 둔다 |
| `boolean` | 체크박스 |
| `'a' \| 'b'`, `1 \| 2` 리터럴 유니온 | 셀렉트 |
| `controls`에 `options`가 있는 키 | 셀렉트 (타입과 상관없이) |
| 함수 (`onClick` 등) | 편집 대신 호출 기록 패널에 표시 |
| 객체, 배열, 그 외 | JSON 편집기 |

- 컨트롤은 케이스 `props`에 있는 키에만 만든다. 타입은 docgen 결과에서 같은 이름을 찾아 쓰고, 없으면(Harness 전용 props 등) 기본값의 `typeof`로 정한다. docgen에만 있고 케이스 `props`에 없는 값(예: Harness가 들고 있는 `current`)은 편집하지 않는다.
- 함수 props는 호출될 때 이름과 인자를 기록하는 로거로 바꿔 끼운다(Storybook의 actions와 같은 방식). docgen에서 함수 타입인 props마다 로거를 만들어 `render`의 두 번째 인자 `actions`로 넘기고, 컴포넌트를 바로 그리는 케이스는 `<C {...props} {...actions} />`처럼 펼쳐 넣는다.
- `ReactNode` 같은 props는 편집 대상에서 빼고 케이스의 `render`에서 채운다.
- 타입에 맞지 않는 값은 넣을 수 없게 한다(2026-10-04 사용자 결정). 문자열이 아닌 값은 자유 입력창으로 받지 않는다. 고를 값이 정해져 있으면 셀렉트, 숫자는 숫자 입력이다.
- 범위·선택지는 케이스의 `controls`에 적는다. 타입만으로는 `total`이 1 이상인지, 케이스 전용 문자열 키가 어떤 값을 받는지 알 수 없고, 대상 저장소 코드에 JSDoc 태그를 더할 수도 없기 때문이다. 스킬이 대상 코드(분기, 검증, 상수)를 읽고 채운다.
  - `options`: 셀렉트로 바꾼다. docgen 리터럴 유니온보다 앞선다. 케이스 전용 키도 셀렉트로 만들 수 있다.
  - `min`·`max`·`step`: 숫자 키에만 쓸 수 있다(타입이 막는다). 입력값이 범위 밖이거나 `step`에 맞지 않으면 반영하지 않고 입력칸 아래에 이유("1 이상", "정수만")를 보여 준다. 빈 칸도 반영하지 않는다.
  - `controls`의 값 타입은 `props`에서 추론한 `P`를 쓰고 추론에는 쓰지 않는다(`NoInfer`). 그래서 `options: ["xl"]`처럼 `ButtonSize`에 없는 값은 tsc 오류다.
- 프리셋·붙여넣기·저장된 값이 범위를 벗어나도 그대로 그린다(경계 밖 동작을 보는 것도 리뷰다). 이때 컨트롤에 범위 밖이라고 표시한다.

### 5.2 프리셋

- 프리셋은 기본 props 위에 덮어쓰는 `Partial<P>`다.
- AI가 만들 엣지 케이스 목록을 스킬에 고정해 두면 빠뜨리는 경우가 줄어든다. 예: 빈 문자열, 아주 긴 문자열, 0과 1과 큰 숫자, 빈 배열, 긴 배열, 비활성 상태.

---

## 6. 네트워크 모킹 (Service Worker 없이)

### 6.1 구조

아티팩트에서는 Service Worker를 못 쓰므로 페이지 안에서 `fetch`와 `XMLHttpRequest`를 가로챈다.

1. `@mswjs/interceptors`의 브라우저 프리셋(`FetchInterceptor` + `XMLHttpRequestInterceptor`)을 `BatchInterceptor`로 적용한다. axios는 브라우저에서 XHR을 쓰므로 fetch만 가로채면 놓친다.
2. 가로챈 요청을 MSW의 `getResponse(handlers, request)`로 넘겨 MSW 핸들러 형식 그대로 응답을 만든다.
3. 핸들러는 편집 중인 시나리오 JSON에서 매 요청마다 새로 만든다. 그래서 JSON을 고치고 다시 그리면 새 응답이 나간다.

```ts
import { BatchInterceptor } from '@mswjs/interceptors';
import { FetchInterceptor } from '@mswjs/interceptors/fetch';
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest';
import { http, HttpResponse, delay, getResponse } from 'msw';
import type { MockRoute } from './types';

const toHandlers = (routes: MockRoute[]) =>
  routes.map((r) =>
    http[r.method.toLowerCase() as 'get'](r.path, async () => {
      if (r.delayMs) await delay(r.delayMs);
      return HttpResponse.json(r.body as never, { status: r.status });
    }),
  );

export function startMocking(getRoutes: () => MockRoute[]) {
  const interceptor = new BatchInterceptor({
    name: 'review-kit',
    // presets/browser와 같은 구성. 프리셋은 exports에 타입 조건이 없어 tsc가 못 찾으므로 직접 묶는다
    interceptors: [new FetchInterceptor(), new XMLHttpRequestInterceptor()],
  });
  interceptor.on('request', async ({ request, controller }) => {
    const res = await getResponse(toHandlers(getRoutes()), request);
    controller.respondWith(
      res ?? HttpResponse.json({ message: `목 없음: ${request.method} ${request.url}` }, { status: 501 }),
    );
  });
  interceptor.apply();
  return () => interceptor.dispose();
}
```

- 목이 없는 요청은 어차피 외부 fetch가 막혀 있으므로 501과 요청 URL을 돌려줘서 어떤 목이 빠졌는지 화면에서 보이게 한다.
- 요청 URL이 상대 경로(`baseURL: ''`)여도 `file://`과 http 양쪽에서 핸들러의 `/api/...` 경로와 맞는다(2026-09-27 확인, 3.1).
- 요청 기록 패널(메서드, URL, 상태, 걸린 시간)을 두면 페이지가 어떤 API를 부르는지 리뷰어가 코드 없이 알 수 있다.
  - 구현: `startMocking(getRoutes, onRecord)`가 응답을 돌려줄 때마다 `{ method, url, status, ms }`를 `onRecord`로 넘기고, 리뷰 화면은 최근 100개를 새것부터 보여준다. 목이 없어 501이 된 요청은 빨간색으로 표시한다.
  - 모킹은 리뷰 화면을 그리기 전에 한 번 시작한다. 시나리오가 없는 컴포넌트 케이스도 켜 두어, 예상하지 못한 요청이 기록에 드러나게 한다. 시나리오 선택 UI(3.4)가 생기기 전에는 첫 시나리오를 쓴다.
- `delay`로 로딩 상태를, `status: 500`으로 에러 상태를, `HttpResponse.error()`로 네트워크 끊김을 재현한다.
- 이미 저장소에 MSW 핸들러가 있다면 `getResponse`에 그 핸들러를 같이 넘겨 재사용할 수 있다. 편집한 시나리오 핸들러를 배열 앞에 두면 우선 적용된다.
  - 구현 (3.6): `review.config.ts`의 `mockHandlers`에 핸들러 파일 경로를 적으면 `virtual:review-handlers`로 주입한다. 파일은 핸들러 배열을 default export나 `handlers` 이름으로 export한다. 요청마다 시나리오 핸들러를 먼저 보고, 없으면 기존 핸들러, 둘 다 없으면 501이다. 요청 기록에는 응답 출처(시나리오/기존 핸들러/목 없음)를 표시한다.
  - 기존 핸들러가 응답하는 요청은 501이 되지 않으므로, 시나리오에서 빠진 라우트는 요청 기록의 출처 표시로 확인한다.

### 6.2 목 데이터와 API 타입 맞추기

- 시나리오의 `body`를 API 응답 타입으로 타이핑한다. 예: `body: [] satisfies DocumentListResponse`. AI가 잘못된 모양을 만들면 타입 체크에서 걸린다.
- OpenAPI 명세가 있으면 명세에서 타입을 생성하고, 웹 편집기에서도 JSON Schema로 검증할 수 있다. 명세가 없으면 편집기는 JSON 문법 검사까지만 한다.

### 6.3 시나리오 편집 UI

- 시나리오 선택 버튼(정상, 빈 목록, 로딩, 에러)과 선택된 시나리오의 라우트 목록을 보여준다.
- 라우트마다 상태 코드, 지연(ms), body JSON을 편집한다. JSON 편집기는 CodeMirror 6을 쓰면 문법 강조와 오류 표시가 된다.
- "적용" 버튼을 누르면 캐시를 새로 만들고 미리보기를 다시 마운트한다.
- 구현 (2026-09-27, 3.4)
  - 시나리오 버튼을 누르면 그 시나리오를 바로 적용한다(요청 기록을 비우고 다시 마운트). 기록을 비우기 전에 시작된 요청(이전 시나리오의 지연 응답)은 끝나도 기록하지 않는다. 라우트 편집은 "적용"을 눌러야 반영된다. 편집 중인 값이 적용된 값과 다르면 "적용 전" 표시를 띄운다.
  - 모킹 엔진은 "지금 적용된 라우트"를 담은 변수 하나를 읽고, 적용할 때 그 변수를 바꾼다. 다시 마운트는 `renderKey`로 하며, 이때 `Providers`가 `new QueryClient()`를 새로 만든다(3.5).
  - body가 JSON으로 읽히지 않으면 그 라우트 아래에 오류를 보여주고 "적용"을 막는다.
  - "원래대로" 버튼은 선택한 시나리오의 편집을 케이스 기본값으로 되돌린다.

---

## 7. 편집 상태 저장과 공유

- 편집한 props와 시나리오는 `localStorage`에 `review-kit:{PR번호}:{케이스}` 키로 케이스마다 저장한다(아티팩트에서 동작 확인). PR번호는 빌드 옵션 `--pr`로 받고, 없으면 PR 폴더 이름 앞의 숫자를 쓴다(숫자가 없으면 `local`). 케이스는 확장자를 뺀 케이스 파일 이름이다(3.4). 값은 `{ props, scenarios }` JSON이다. 플레이그라운드 좌우 순서와 폭은 따로 `review-kit:layout` 키에 저장한다(3.4).
  - `scenarios`는 시나리오 이름 → 라우트 배열이고, 케이스 기본값과 다른 시나리오만 넣는다. 불러올 때는 케이스에 있는 시나리오 이름만 받는다. 선택한 시나리오는 저장하지 않고 늘 첫 시나리오로 시작한다(3.7).
  - JSON 복사/붙여넣기도 같은 `{ props, scenarios }` 모양을 쓴다. 붙여넣은 JSON에 있는 키만 바꾼다.
- 다른 리뷰어에게 같은 상태를 보여주려면 "JSON 복사"와 "JSON 붙여넣기"를 둔다. 아티팩트는 `#key=value` hash와 쿼리 문자열을 iframe에 전달하지 않으므로(1.1) URL 공유는 하지 않는다.
  - 복사: 클릭 핸들러 안에서 `navigator.clipboard.writeText`를 부르고, 실패하면 JSON을 텍스트 영역에 띄워 선택해 둔다.
  - 붙여넣기: 클립보드 읽기는 막혀 있으므로 텍스트 영역에 붙여넣고 "적용"을 누르게 한다.
- "초기화" 버튼으로 케이스 기본값으로 되돌린다. `confirm()`은 아티팩트에서 항상 `false`이므로 확인 단계는 화면 안 UI로 만든다.

---

## 8. 코드 패널

- 탭: 소스 전체, PR diff, 영향 범위. 패널은 플레이그라운드 왼쪽에 두고(3.4), `sources`가 여러 개면 소스·diff 탭 안에서 파일을 고른다. 결정 목록은 PR 단위라 개요 탭으로 옮겼다(3.4). diff가 비어 있으면 "비교 기준과 달라진 내용 없음"을 보여준다.
- 문법 강조: Shiki는 결과가 정확하지만 문법과 테마를 번들에 넣으면 파일이 커진다. `prism-react-renderer`가 가볍다. 단일 파일이므로 크기를 보고 고른다.
  - 비교 결과(2026-09-29, 4.3, `review-365.html`): 강조 없음 3705KB, `prism-react-renderer` 2.4.1(`themes.github`) 3789KB(+84KB), Shiki 4.4.3(`shiki/core` + JavaScript 정규식 엔진 + tsx 문법 + github-light 테마 하나) 4046KB(+341KB). **`prism-react-renderer`를 쓴다.**
  - 언어는 확장자로 고른다: `.tsx`·`.jsx`는 `tsx`, `.ts`·`.js`는 `typescript`, `.css`는 `css`, 그 외는 강조 없이 보여준다. 줄 번호를 붙인다.
- diff는 `+`, `-` 줄 색만 칠해도 충분히 읽힌다.
- 파일 경로는 커밋 SHA 기준 GitHub 링크로 만든다. `window.open`은 대부분의 열람자에게 `null`을 돌려주므로 쓰지 않고, `<a href target="_blank" rel="noopener">` 링크로 새 탭을 연다(1.1). 옆에 링크 복사 버튼을 같이 둔다.
  - 구현(4.4): 파일이 하나면 경로 자체가 링크이고, 여러 개면 파일 선택 옆에 "GitHub에서 보기" 링크를 둔다. 링크 복사는 7장 JSON 복사와 같이 `writeText`가 실패하면 URL을 읽기 전용 입력칸에 띄워 선택해 둔다. `repoUrl`이나 SHA가 없으면 링크와 복사 버튼을 숨긴다.
- 모듈 이동(2026-10-04 사용자 결정): 소스 탭에서 Cmd(맥)나 Ctrl을 누른 채 클릭하면 그 import가 가리키는 파일로 이동한다. 에디터의 정의로 이동과 같은 동작이다.
  - 클릭할 수 있는 곳: `import`·`export ... from`의 경로 문자열과, import로 들여온 이름(default, `{ a, b as c }`, `* as ns`)이 코드에 나오는 자리.
  - 함께 넣는 파일: 빌드 때 `sources` 파일이 import하는 파일을 Vite 해석기(alias 포함)로 찾아 **한 단계만** 넣는다. `node_modules` 안이나 설정 폴더 밖 파일, `.ts`·`.tsx`·`.js`·`.jsx`·`.mjs`·`.cjs`·`.css`가 아닌 파일은 넣지 않는다. 들여온 파일 안의 import는 이미 들어 있는 파일을 가리킬 때만 이동한다.
  - Cmd나 Ctrl을 누르고 있는 동안 이동할 수 있는 토큰에 마우스를 올리면 밑줄과 손가락 커서를 보여 준다.
  - 이동하면 파일 줄에 그 파일 경로(GitHub 링크)와 "← 뒤로" 버튼을 둔다. 뒤로는 이동한 순서를 거꾸로 따라가고, 파일 선택에서 다른 `sources` 파일을 고르면 이동 기록을 비운다. diff 탭은 지금 보고 있는 파일의 diff를 보여 준다.
- 코드 접기(2026-10-04 사용자 요청): 소스 탭의 코드를 VS Code처럼 접고 펼 수 있다. 파서 없이 들여쓰기로 접는 범위를 구한다(VS Code의 들여쓰기 기반 접기와 같은 규칙).
  - 접는 범위: 바로 다음의 빈 줄이 아닌 줄이 더 깊이 들여써진 줄이 시작 줄이다. 그 뒤로 시작 줄과 같거나 얕은 들여쓰기의 줄(빈 줄 제외)이 나오기 전까지가 범위이고, 끝의 빈 줄은 범위에서 뺀다. 그래서 `}`처럼 시작 줄과 같은 깊이의 닫는 줄은 접혀도 보인다.
  - import 묶음: 파일 맨 위처럼 `import` 문이 연달아 있으면(사이의 빈 줄 포함) 그 묶음(첫 import 줄부터 마지막 import 줄까지)을 하나의 범위로 접는다. 같은 줄에서 시작하는 들여쓰기 범위가 있으면 import 묶음을 우선한다.
  - 표시: 줄 번호 옆 여백에 접기 표시(`›`/`⌄`)를 둔다. 코드에 마우스를 올린 동안만 보이고, 접힌 줄은 항상 보인다. 접으면 시작 줄 끝에 `⋯` 표시를 붙이고 범위 안 줄을 숨긴다. 표시나 `⋯`를 클릭하면 펼친다. 범위가 겹치면 바깥을 펼쳐도 안쪽은 접힌 채로 남는다.
  - 상태는 파일마다 따로 두고, 다른 파일로 바꾸거나 모듈 이동을 하면 모두 펼친 상태로 시작한다. 줄 번호는 숨긴 줄을 빼지 않고 원래 번호를 그대로 보여 준다.

---

## 9. AI 생성: Claude Code 스킬

### 9.1 스킬 기본 지식

- 위치: `.claude/skills/<name>/SKILL.md`. `/<name>`으로 직접 부르거나 Claude가 필요할 때 불러온다. 플러그인에 든 스킬은 `<플러그인>/skills/<name>/SKILL.md`에 두고 `/<플러그인>:<name>`으로 부른다(11장). 이 도구의 스킬은 `/prplay:review-page`다.
- 스킬 본문은 부를 때만 컨텍스트에 들어간다.
- frontmatter 주요 필드
  - `description`: 언제 쓰는 스킬인지
  - `disable-model-invocation: true`: 사용자가 `/이름`으로 부를 때만 실행된다. 빌드처럼 부수 효과가 있는 작업에 쓴다.
  - `allowed-tools`: 스킬을 부른 턴 동안 허락 없이 쓸 도구. 예: `Bash(gh pr diff *) Bash(npx tsc *)`
  - `arguments`, `$ARGUMENTS`, `$0`: 인자 전달
- `` !`명령` `` 문법: 스킬 내용이 Claude에게 전달되기 전에 셸 명령을 실행해 결과로 바꿔 넣는다. 줄 맨 앞이나 공백 뒤에 있어야 인식된다. 여러 줄 명령은 ` ```! ` 코드 블록을 쓴다.
- 스킬 폴더에 `scripts/`, 예시 파일을 같이 두고 본문에서 `${CLAUDE_SKILL_DIR}`로 참조할 수 있다.

### 9.2 스킬 초안

````markdown
---
name: review-page
description: 현재 브랜치 PR의 리뷰 플레이그라운드 HTML을 만든다
disable-model-invocation: true
allowed-tools: Bash(gh pr *) Bash(git diff *) Bash(npx tsc *) Bash(npx review-kit *)
---

## PR 정보
- 번호와 제목: !`gh pr view --json number,title -q '.number + " " + .title'`
- 바뀐 파일: !`gh pr diff --name-only`

## 할 일
1. 바뀐 파일 중 컴포넌트와 페이지를 찾는다.
2. `review/cases/<PR번호>.tsx` 파일 하나만 작성한다. `src/`는 절대 수정하지 않는다.
3. 형식은 `${CLAUDE_SKILL_DIR}/example-case.tsx`를 따른다.

## 규칙
- presets에는 빈 값, 아주 긴 값, 경계 숫자, 비활성 상태 중 해당하는 것을 모두 넣는다.
- 네트워크를 쓰는 페이지는 정상, 빈 응답, 로딩(2000ms), 500 에러 시나리오를 넣는다.
- 목 body는 API 응답 타입으로 `satisfies` 검사한다.
- decisions는 최대 5개, 한 문장씩 쓴다. 설명 글은 쓰지 않는다.
- impacts에는 바뀐 파일을 import하는 다른 파일 경로를 적는다.

## 검증
1. `npx tsc --noEmit`
2. `npx review-kit build review/cases/<PR번호>.tsx`
3. 실패하면 오류를 읽고 케이스 파일만 고쳐 다시 실행한다. 3번 실패하면 멈추고 오류를 보고한다.
4. 마지막에 결과 HTML 경로를 알려준다.
````

구현(5.1~5.4, 2026-09-29): 실제 스킬은 `review-page/SKILL.md`(11.1)이고 위 초안에서 아래가 바뀌었다.
- 케이스 파일: 처음에는 대상마다 `review/cases/<PR번호>-<이름>.tsx`를 따로 빌드했으나, 지금은 PR 폴더 `review/cases/<PR번호>/`에 `pr.ts`와 대상마다 `<이름>.tsx`(최대 9개)를 쓰고 폴더 하나를 HTML 하나로 빌드한다(3.4). 폴더 이름이 저장 키의 PR번호가 된다(7장).
- PR 개요(`pr.ts`): PR 본문·커밋·diff와 바뀐 파일 주변 코드를 읽고 요약, 배경, 핵심 아이디어와 예시, 구조 그림(필요할 때만, 직접 쓴 SVG), 바뀐 점, 코드 흐름, 결정, 리뷰 포인트를 쓴다. 결정은 케이스에서 여기로 옮겼다. 예시 데이터는 PR 코드의 실제 타입·필드 이름으로 만든다.
- `gh pr diff --name-only`는 git 루트 기준 경로라 `git rev-parse --show-prefix`를 떼고 `sources`에 넣는다.
- 예시는 `example-component.tsx`(컴포넌트)와 `example-page.tsx`(페이지+네트워크) 두 개다.
- 엣지 케이스 프리셋 목록과 시나리오 규칙을 스킬 본문에 고정한다(5.2, 6장).
- 검증은 `npx tsc --noEmit` → 글쓰기 규칙 검사(`scripts/check-writing.mjs`)와 대조(`writing-rules.md`) → `node ${CLAUDE_SKILL_DIR}/src/cli.ts build`(11.1) → `scripts/smoke.mjs`(9.4) 순서다. 실패하면 케이스 파일만 고쳐 처음부터 다시 돌리고, 3번 실패하면 멈추고 오류를 보고한다. 케이스 파일 밖(`src/`, `review.config.ts`, wrapper)을 고쳐야 할 것 같으면 고치지 않고 사용자에게 묻는다.
- 처음 설정(6단계, 11장): `review.config.ts`가 없으면 사용자 동의를 받아 `cli.ts init`을 실행하고, 프로젝트의 번들러 설정·tsconfig·`package.json`을 읽어 `alias`, `jsxImportSource`, `define`, `svgr`, `sharedPackages`를 채운다. `wrapper`·`styles`·`mockHandlers`가 필요해 보이면 무엇을 넣을지 사용자에게 제안만 한다. `init`이 안내한 tsconfig·`.gitignore` 변경은 보여 주고 동의를 받아 넣는다. 그다음 예시 케이스를 빌드해 확인하고 PR 케이스 작업으로 넘어간다. 이 단계에서만 케이스 파일 밖을 고친다.
- 마지막에 결과 HTML 경로와 크기를 알리고, 사용자가 원하면 Artifact 도구로 게시한다(1.1). 게시 후 Share 메뉴로 공유해야 리뷰어가 열 수 있다고 알린다.
- 사용자 결정(처음 설정 동의, 대상 고르기, 기존 PR 폴더 덮어쓰기, PR 폴더 밖 수정, 아티팩트 게시)은 글로 묻지 않고 AskUserQuestion 선택지로 묻는다. 추천을 첫 선택지에 `(추천)`으로 두어 사용자가 엔터만 눌러도 진행되게 한다.
- 글쓰기 규칙(2026-09-29 사용자 결정): 스킬이 쓰는 모든 글(`pr.ts` 문자열, 케이스 `title`과 프리셋·시나리오 이름, AskUserQuestion 문구, 끝난 뒤 보고)은 `review-page/writing-rules.md`를 지킨다. 이어지는 맥락의 문장은 한 문장으로 잇고, 요약 선언문 뒤에 같은 묘사를 반복하지 않으며, 금지 표현 목록의 표현을 쓰지 않는다. 검증 단계에서 `pr.ts`를 쓴 뒤 목록과 대조해 고친다.
  - 자동 검사(2026-10-04 사용자 결정): 금지 표현은 정규식 목록 `review-page/banned-patterns.txt`(사용자의 글쓰기 훅 `banned-patterns.txt`와 같은 내용)로 기계 검사한다. `review-page/scripts/check-writing.mjs <PR 폴더>`가 폴더 안 `.ts`, `.tsx` 파일을 `@babel/parser`로 읽어 한글이 든 문자열, 템플릿 문자열, JSX 글자, 주석만 꺼내고, 그 안의 백틱 인라인 코드를 지운 뒤 줄마다 목록과 맞춰 본다. 코드 이름과 원문을 그대로 두는 값(`pr.ts`의 맨 위 `title`, `url`, `file`, `files`, `since`, `code`, `snippet`, `data`, 이슈 제목인 `links`, CI `name`, import 경로)은 검사하지 않고, `svg`는 `<text>` 안 글자만 검사한다. 위반이 있으면 `파일:줄`, 걸린 글, 걸린 패턴을 출력하고 1로 끝난다. 스킬은 위반 문장을 뜻을 바꾸지 않고 고쳐 쓴 뒤 통과할 때까지 다시 돌리고, 그다음 정규식으로 잡을 수 없는 규칙(문장 잇기, 요약 선언 반복, 뜻이 맞지 않는 단어)을 눈으로 대조한다.
- 병렬 작성(2026-10-04 사용자 결정): 페이지 하나를 만드는 데 시간이 오래 걸려, 대상을 고른 뒤 서로 기다릴 필요가 없는 일을 동시에 돌린다. 넓은 맥락 조사(`Explore`)와 대상마다 케이스 에이전트 하나(최대 9개)를 한 번에 띄운다. 케이스 에이전트는 '케이스 규칙'을 따라 PR 폴더의 자기 케이스 파일 하나만 쓰고, `find-impacts.sh`를 돌리고, `tsc` 결과에서 자기 파일 오류를 고친 뒤 프리셋·시나리오 이름, 넣지 못한 엣지 케이스, 확인할 수 없는 동작, `impacts`를 돌려준다. 그동안 메인은 CI·리뷰 기록·diff를 읽어 맥락 조사 없이 쓸 수 있는 `pr.ts` 칸부터 쓰고, 맥락 조사 결과가 오면 나머지를 쓴다. 사용자에게 묻는 일과 검증(tsc → 글쓰기 규칙 → build → smoke)은 메인만 한다. `pr.ts`는 개요의 일관성을 위해 메인이 쓴다.
- 5.6 시험(2026-09-29): Knot #362(Chip + 유틸), #368(컴포넌트 두 개, props 없는 애니메이션), #346(네트워크 위젯)을 scratchpad 클론에서 스킬 본문만 주고 돌렸다. 셋 다 tsc·빌드·스모크를 첫 시도에 통과했다. 헷갈렸다고 보고된 점을 스킬에 반영했다: 대상 고르기(바뀐 가장 작은 단위, 컴포넌트+유틸, 품는 대상), 케이스 전용 props의 컨트롤 종류와 ReactNode 대체 prop 이름, props 없는 대상, `actions` 범위, 숫자 경계값·비유한 값, 프리셋 12개 상한, 시나리오 4개는 최소이고 조작 뒤 요청·이어지는 id·전역 캐시, 에러 body, PR 본문 읽기(`--json body,commits`)와 본문·diff 불일치 시 diff 우선, `find-impacts.sh`에 넘길 파일과 테스트·목 제외, 빌드 경고 처리, 확인할 수 없는 동작 보고.

### 9.3 영향 범위 찾기

- 바뀐 파일을 import하는 곳은 `rg "from ['\"].*Breadcrumb['\"]" src` 같은 검색으로 찾는다.
  - 구현(4.5): `review-page/scripts/find-impacts.sh <파일>... [--dir src]`. 파일마다 모듈 이름(확장자를 뺀 파일 이름, `index`면 폴더 이름)으로 `from '…/이름'`, `import('…/이름')`을 `rg`로 찾고, 입력 파일을 뺀 경로를 한 줄씩 출력한다. 경로는 명령을 실행한 폴더(설정 파일 폴더) 기준이라 케이스 `impacts`에 그대로 넣는다. 이름만 보므로 같은 이름의 다른 모듈도 걸릴 수 있어, 스킬이 결과를 훑어 관계없는 파일을 뺀다.
- 정확도를 높이려면 `madge`나 TypeScript 컴파일러 API로 import 그래프를 만든다.

### 9.4 추가 검증 (선택)

- Playwright로 결과 HTML을 `file://`로 열어 Error Boundary 문구가 없는지, 프리셋마다 렌더링이 되는지 확인하는 스모크 테스트를 스킬 검증 단계에 넣을 수 있다.
- 구현(5.5): `review-page/scripts/smoke.mjs <html>...`. Playwright는 스킬 의존성에 넣지 않고 명령을 실행한 프로젝트의 `playwright`나 `@playwright/test`를 쓴다(없으면 건너뛴다고 알리고 0으로 끝낸다). 파일마다 `file://`로 열어 첫 화면을 확인하고, 대상 탭마다(3.4) 탭을 누른 뒤 프리셋 버튼 하나씩, 시나리오 버튼 하나씩을 누르고 각각 확인한다.
  - 실패: "미리보기 렌더링 오류" 문구, 페이지의 잡히지 않은 오류(`pageerror`), 콘솔 `error`, `file:`·`data:`·`blob:`이 아닌 외부 요청
  - 경고: 요청 기록의 501(목이 없는 요청)
  - 실패가 하나라도 있으면 1로 끝난다.
  - 대상 탭마다 누른 프리셋·시나리오 개수를 출력한다(5.6: 통과 한 줄만으로는 실제로 눌렀는지 알 수 없었다).

---

## 10. 배포

| 방법 | 수고 | 특징 |
| --- | --- | --- |
| Claude 아티팩트 | PR마다 HTML을 claude.ai에 올리는 수동 작업 | 외부 서비스 설정이 없다. 1장의 제약을 모두 지켜야 한다 |
| GitHub Pages + Actions | 처음 한 번 설정 | 이후 PR마다 자동. 파일 하나로 만들 필요가 없다 |
| Chromatic | 처음 한 번 설정 | Storybook 전제. 시각 비교(before/after)가 기본 제공된다 |

- HTML 파일은 GitHub PR에 첨부해도 브라우저에서 렌더링되지 않으므로 공유 수단이 되지 않는다.
- 단일 HTML은 로컬에서 더블클릭으로도 열리므로, 아티팩트 게시 전 확인은 `file://`로 한다.
- 아티팩트 갤러리와 탭 이름은 HTML의 정적 `<title>`에서 나온다. 그래서 빌드할 때 `pr.ts`의 `title`을 넣어 `Review · #{PR번호} {title}`로 만든다(PR번호가 숫자가 아니면 `#` 부분을 뺀다. 실행 중 `document.title`과 같은 값). `pr.ts`가 없으면 첫 케이스의 `title`, 그것도 읽지 못하면 폴더 이름을 쓴다. 파일은 `sources`처럼 정규식으로 읽는다.

---

## 11. 플러그인으로 배포

방향(2026-09-29 변경, 사용자 결정): 이 도구는 **Claude Code 플러그인 `prplay` 하나**로 배포하고, 최종 목표는 플러그인 마켓플레이스 출시다. 플러그인에는 스킬 `review-page` 하나가 들어가며, 리뷰 화면, 빌드, 스크립트, 예시를 모두 그 스킬 폴더에 넣는다. 스킬은 `/prplay:review-page`로 부른다(플러그인 스킬은 `/<플러그인>:<스킬>` 이름을 쓴다). npm 패키지로 배포하지 않고, 대상 프로젝트에 설치하는 패키지도 없다.

바뀐 과정
- 처음에는 `review-kit` npm 패키지(CLI, `peerDependencies`, `dist/` 컴파일)로 만들었다.
- 2026-09-29 스킬 폴더 하나를 대상 프로젝트 `.claude/skills/review-page/`로 복사하는 방식으로 바꿨다. 스파이크에서 스킬 폴더만 복사한 Knot 복사본으로 기존 4케이스의 빌드·스모크·`tsc`가 모두 통과했다.
- 2026-09-29 플러그인 마켓플레이스 배포로 바꿨다(사용자 결정). 복사 방식은 없애고 플러그인 설치만 지원한다.

플러그인 기본 지식 (공식 문서 https://code.claude.com/docs/en/plugins/ , 2026-09-29 확인)
- 플러그인은 `.claude-plugin/plugin.json`(필수 `name`, 그 밖에 `version`, `description`, `author` 등)과 `skills/<이름>/SKILL.md`로 이뤄진다.
- 마켓플레이스는 git 저장소 루트의 `.claude-plugin/marketplace.json`(`name`, `owner`, `plugins[]`)이다. 플러그인 `source`는 같은 저장소 안 상대 경로(`./plugins/prplay`)로 줄 수 있다.
- 설치: `/plugin marketplace add <owner>/prplay` → `/plugin install prplay@prplay`. 팀 전체에 켜려면 대상 프로젝트 `.claude/settings.json`의 `extraKnownMarketplaces`와 `enabledPlugins`에 넣는다.
- 설치하면 플러그인 폴더가 `~/.claude/plugins/` 캐시로 **복사**된다. 업데이트하면 이 복사본이 새것으로 교체되므로 플러그인 폴더(`${CLAUDE_PLUGIN_ROOT}`)에 쓴 파일은 남지 않는다. 업데이트 뒤에도 남는 폴더는 `${CLAUDE_PLUGIN_DATA}`(`~/.claude/plugins/data/<id>/`)다.
- `plugin.json`에 `version`을 적으면 그 값을 올려야 사용자가 업데이트를 받는다. 서드파티 마켓플레이스는 자동 업데이트가 기본으로 꺼져 있다.
- 검증: `claude plugin validate <폴더> [--strict]`.

플러그인 실행 환경 (8.1 스파이크, 2026-09-29 Claude Code 2.1.284에서 확인)
- SKILL.md 본문의 `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`는 모델에게 보이기 전에 실제 경로로 바뀐다. 캐시 설치면 `~/.claude/plugins/cache/<마켓플레이스>/<플러그인>/<버전>/skills/<스킬>`, 데이터 폴더는 `~/.claude/plugins/data/<플러그인>-<마켓플레이스>`이고, 데이터 폴더는 설치할 때 빈 폴더로 만들어진다.
- Bash 도구 환경과 `!` 명령 환경에는 `CLAUDE_PLUGIN_DATA`, `CLAUDE_PLUGIN_ROOT`, `CLAUDE_SKILL_DIR`가 **없다**. 그래서 스크립트에 필요한 경로는 본문 치환으로 명령 인자에 넣어 넘긴다(11.3 `--data`).
- `!` 명령 안의 셸 변수(`$VAR`)는 기본 권한 모드에서 "Contains simple_expansion"으로 막히고 스킬 전체가 실패한다. `!` 명령에는 셸 변수를 쓰지 않는다. `$ARGUMENTS`는 셸보다 먼저 치환되므로 써도 된다.
- `allowed-tools`의 `Bash(node *probe/probe.mjs *)`처럼 앞에 `*`를 둔 패턴은 캐시 절대 경로 명령과 맞는다. 패턴에 없는 명령은 승인을 요구한다.
- 로컬 폴더(`directory`) 마켓플레이스로 설치하면 설치 기록은 캐시 경로여도 실제로는 **원본 폴더에서** 실행된다. 캐시 경로 동작은 git 소스(GitHub, 또는 플러그인 소스를 `{ "source": "url", "url": "file://..." }`로 준 경우)로 설치해야 확인된다.

### 11.1 저장소와 플러그인 구성

prplay 저장소가 마켓플레이스이고, 플러그인은 `plugins/prplay/`에 둔다. 저장소 루트를 플러그인으로 쓰지 않는 것은, 설치할 때 `plan.md`·`targets/` 같은 개발 파일까지 캐시로 복사되지 않게 하려는 것이다.

```
.claude-plugin/
  marketplace.json         # name "prplay", owner, plugins: [{ name "prplay", source "./plugins/prplay" }]
plugins/prplay/
  .claude-plugin/
    plugin.json            # name "prplay", version, description, author, repository, license
  README.md                # 플러그인 설명(설치, 처음 설정, 사용법)
  LICENSE
  skills/review-page/      # 스킬 원본 (이전 prplay `review-page/`)
    SKILL.md               # /prplay:review-page
    example-component.tsx  # 컴포넌트 케이스 예시
    example-page.tsx       # 페이지 + 네트워크 케이스 예시
    example-pr.ts          # PR 개요(pr.ts) 예시
    package.json           # 빌드 도구와 리뷰 화면 의존성 (11.3)
    package-lock.json      # 같은 버전이 설치되도록 함께 둔다
    src/
      index.ts     # defineCase, defineConfig, 타입. 케이스·설정 파일이 `review-kit`이라는 이름으로 import한다
      cli.ts       # build, dev, init
      init.ts      # 설정 파일과 예시 케이스 만들기
      runtime/     # 리뷰 화면, 모킹 엔진, 상태 저장
      build/       # Vite 빌드·dev 서버, 가상 모듈 플러그인, docgen, 설정 파일 로딩
    scripts/
      find-impacts.sh
      smoke.mjs
    templates/
      review.config.ts       # init이 복사하는 설정 파일
      example/               # init이 review/로 복사하는 예시 컴포넌트와 PR 폴더
        Example.tsx
        cases/example/pr.ts
        cases/example/example.tsx
```

명령 (설정 파일이 있는 프로젝트 폴더에서 실행한다. 스킬 안에서는 `node ${CLAUDE_SKILL_DIR}/src/cli.ts <명령> --data ${CLAUDE_PLUGIN_DATA}`(11.3). 플러그인 설치 경로는 사용자 컴퓨터마다 다르므로, 사람이 직접 실행할 때는 스킬에게 부탁하거나 스킬이 보여 준 경로를 쓴다)
- `build <PR 폴더>... [--pr 번호]`: PR 폴더마다 단일 HTML 하나를 `outDir`에 만든다(3.4). 아티팩트에 올리는 결과물이다.
  - 번들러의 `MODULE_LEVEL_DIRECTIVE`(`"use client"`) 경고는 단일 HTML에서 의미가 없으므로 숨긴다. 기존 MSW 핸들러 파일은 default와 `handlers` 중 있는 것을 쓰되, 없는 export를 정적으로 참조해 경고가 나지 않게 한다(5.6에서 스킬이 설정 문제로 오해했다).
- `dev <PR 폴더> [--port 5173]`: 같은 설정으로 Vite dev 서버를 띄운다. 케이스 파일이나 컴포넌트를 고치면 바로 반영(HMR)되므로 케이스를 쓰는 동안 확인용으로 쓴다. 단일 파일 플러그인은 빼고, 나머지 플러그인·가상 모듈·alias는 build와 같다. 최종 확인은 build 결과를 `file://`로 연다(10장).
- `init [--force]`: 현재 폴더에 `review.config.ts`(`templates/review.config.ts`, `git remote get-url origin`이 GitHub면 `repoUrl`을 채움)와 바로 빌드해 볼 수 있는 `review/cases/example/`(`pr.ts`, `example.tsx`)와 `review/Example.tsx`(`templates/example/`)를 만든다. 이미 있는 파일은 건너뛰고 알린다(`--force`면 덮어쓴다). `tsconfig`·`.gitignore`·`package.json`은 고치지 않고 넣을 내용을 출력한다(11.2의 tsconfig 두 줄, `.gitignore`의 `review/dist/`). `msw`·`react`·`react-dom`이 설치돼 있지 않으면 설치하라고 알린다. 스킬은 설정 파일이 없을 때 이 명령으로 처음 설정을 한다(9.2).
- 세 명령 모두 시작할 때 `review/review-kit.d.ts`(11.2)가 스킬의 타입과 다르면 새로 쓴다.

### 11.2 프로젝트 설정 파일

```ts
// review.config.ts (프로젝트 루트)
import { defineConfig } from 'review-kit';

export default defineConfig({
  alias: { '@': './src' },                 // 설정 파일 기준 상대 경로
  plugins: [/* 프로젝트에 필요한 Vite 플러그인 */],
  svgr: { /* vite-plugin-svgr 옵션. 없으면 svgr을 쓰지 않는다 */ },
  jsxImportSource: '@emotion/react',       // 기본값 'react'
  define: { 'process.env.API_BASE_URL': '""' },
  sharedPackages: ['@emotion/react'],      // 대상 node_modules에서 가져올 패키지. react, react-dom, msw는 항상 포함
  styles: ['./review/preview.css'],        // 미리보기에 넣을 CSS 파일. 번들에 인라인된다. 폰트 파일은 넣지 않는다
  wrapper: './review/Wrapper.tsx',         // 4.1 Provider 묶음 컴포넌트 파일
  mockHandlers: './src/shared/api/mock/handlers', // 6.1 기존 MSW 핸들러 파일. 시나리오에 없는 요청에 쓴다
  casesDir: './review/cases',              // 케이스 이름만 줄 때 찾는 폴더
  outDir: './review/dist',
  repoUrl: 'https://github.com/woowacourse-teams/2026-Knot',
  baseBranch: 'origin/main',
});
```

- 설정 파일은 Node 타입 제거로 바로 import하고, 미리보기는 브라우저 번들에서 돈다. 그래서 `wrapper`는 함수가 아니라 컴포넌트 파일 경로로 받아 `virtual:review-wrapper`로 주입한다. 파일은 `({ initialPath, address, children }: WrapperProps) => ReactNode` 컴포넌트를 default export한다. `address`는 4.1 URL 표시줄 연결용이다. 리뷰 화면이 key로 다시 마운트하므로 `QueryClient`는 wrapper 안에서 `useState`로 만들면 된다(4.2).
- `sources`, `impacts` 경로는 설정 파일이 있는 폴더 기준이다.
- `styles`는 `virtual:review-styles`에서 순서대로 import한다. 리뷰 화면(Shadow DOM)은 시스템 글꼴을 쓰므로 여기 넣은 CSS는 미리보기 쪽 문서에만 적용된다. `url()`의 패키지 경로는 그 CSS 파일 위치(프로젝트 `node_modules`)에서 찾는다.
  - 폰트 파일(`@font-face`의 `url()`)은 넣지 않는다. 인라인된 폰트 파일은 아티팩트 공개 공유를 막는다(1.1 표). 빌드 결과에 `data:font/`가 있으면 빌드가 경고한다. 미리보기는 프로젝트 `font-family`의 대체 글꼴로 보인다(2026-10-04 사용자 결정. 그 전에는 스킬이 Pretendard woff2를 갖고 `review-kit/fonts/pretendard.css`로 넣었다).

`review-kit` 이름 풀기: 설치된 패키지가 없으므로 케이스·설정 파일의 `import ... from 'review-kit'`은 아래 세 곳에서 따로 푼다. Node와 Vite는 실행 중인 스킬 폴더의 `src/index.ts`로 돌리고, 대상 `tsc`는 프로젝트에 둔 타입 선언 파일을 본다. 플러그인은 사용자마다 다른 캐시 경로에 설치되므로 tsconfig에 스킬 경로를 적을 수 없기 때문이다(2026-09-29 사용자 결정).

| 누가 읽나 | 방법 |
| --- | --- |
| Node(설정 파일 로딩) | `cli.ts`가 맨 처음 `module.registerHooks`로 `review-kit`을 `src/index.ts`로 돌리는 resolve hook을 건다 |
| Vite(케이스·wrapper 번들) | `resolve.alias`의 `review-kit` |
| 대상 `tsc`(스킬 검증 1번) | 대상 tsconfig `compilerOptions.paths`에 `"review-kit": ["./review/review-kit.d.ts"]` 한 줄, `include`에 `review`, `review.config.ts`(넓은 glob이면 이미 덮는다). `init`이 안내하고 스킬이 처음 설정에서 사용자 동의를 받아 넣는다 |

타입 선언 파일 `review/review-kit.d.ts`
- `cli.ts`가 `init`·`build`·`dev`를 시작할 때 스킬의 `src/index.ts` 공개 타입으로 만든 선언을 이 파일에 쓴다. 내용이 같으면 쓰지 않는다. 맨 위에 "자동 생성 파일, 고치지 않는다"는 주석을 둔다.
- 대상 프로젝트에 `vite`, `vite-plugin-svgr`가 없을 수 있으므로 선언 파일은 `react` 타입만 참조한다. `plugins`, `svgr`처럼 Vite 타입을 쓰는 설정 필드는 느슨한 타입으로 바꾼다.
- 커밋해 둔다. 그래야 플러그인이 없는 CI나 다른 사람의 `tsc`도 통과한다. 플러그인이 업데이트돼 타입이 바뀌면 다음 실행 때 파일이 바뀌어 git diff로 보인다.

### 11.3 의존성과 주의할 점

- 빌드 도구(Vite, 플러그인, react-docgen)와 리뷰 화면이 쓰는 라이브러리(CodeMirror, `@mswjs/interceptors`, prism)는 스킬 폴더의 `package.json`에 둔다. 대상 프로젝트의 `package.json`은 건드리지 않는다. 설치 크기는 약 66MB다.
  - 설치 위치는 `${CLAUDE_PLUGIN_DATA}/node_modules/`다. 플러그인 폴더는 업데이트할 때 교체되므로, 여기에 설치해야 lockfile이 같은 업데이트에서 다시 설치하지 않는다.
  - `cli.ts`는 Node 기본 모듈만 먼저 쓰고, 스킬 폴더의 `package-lock.json` 해시가 데이터 폴더의 `.review-page-lock`에 적힌 값과 다르면(처음 실행이거나 lockfile이 바뀐 업데이트면) `package.json`·`package-lock.json`을 데이터 폴더로 복사해 `npm ci`를 돌린 뒤 해시를 적는다.
  - 그다음 스킬 폴더의 `node_modules`를 데이터 폴더 `node_modules`로 가리키는 심볼릭 링크로 만든다(없거나 다른 곳을 가리키면 다시 만든다). 스킬 소스(`src/`)의 import가 Node·Vite 기본 탐색으로 패키지를 찾게 하려는 것이다. 그 뒤에 빌드 모듈을 동적 import한다.
  - 데이터 폴더 경로는 `--data <경로>` 옵션으로 받는다. Bash 도구 환경에 `CLAUDE_PLUGIN_DATA`가 들어오지 않으므로(11장 '플러그인 실행 환경') SKILL.md 명령에 `--data ${CLAUDE_PLUGIN_DATA}`를 붙이고, 본문 치환으로 실제 경로가 들어간다. 옵션이 없고 `CLAUDE_PLUGIN_DATA` 환경 변수도 없으면(prplay에서 개발할 때) 스킬 폴더에 바로 설치한다.
  - 심볼릭 링크 `node_modules`는 8.1 스파이크에서 확인했다: 스킬 복사본의 `node_modules`를 데이터 폴더(`npm ci`)로 링크한 상태에서 Knot 복사본 `build 366` 결과가 실제 `node_modules`로 빌드한 것과 바이트 단위로 같았고, 스모크와 dev 서버도 같았다.
  - lockfile은 꼭 같이 둔다. 스파이크에서 `npm install`로 `^` 범위의 더 새 CodeMirror가 들어와 결과 HTML이 링크 방식과 달랐다.
- `react`, `react-dom`, `msw`와 CSS-in-JS 라이브러리(Knot는 `@emotion/react`)처럼 컴포넌트와 같은 인스턴스를 써야 하는 패키지는 스킬에 넣지 않고 대상 프로젝트 것을 쓴다. 구현은 `sharedPackages`에 적힌 패키지를 대상 프로젝트 `node_modules`에서 찾는 resolve 플러그인이다(13장 '작업 위치'와 같다). 대상 `tsc`가 `src/index.ts`를 검사할 때 `react` 타입도 대상 것을 쓴다.
- 리뷰 화면(`src/runtime/`)은 사용자 컴포넌트와 같은 Vite 번들에서 변환되므로 미리 빌드하지 않고 소스 그대로 둔다. Node에서 도는 부분(`cli.ts`, `init.ts`, `build/`)도 컴파일하지 않고 Node 타입 제거로 바로 실행한다. 스킬 폴더는 `node_modules` 안이 아니므로 `.ts` 실행 제한에 걸리지 않는다.
- Node 22.18 이상이 필요하다(타입 제거가 플래그 없이 켜지는 버전. `module.registerHooks`는 22.15부터).
- 리뷰 화면 스타일이 사용자 앱 스타일과 충돌하지 않게 CSS 접두사나 Shadow DOM을 쓴다.
- 처음에는 Vite 빌드만 지원하고, webpack 프로젝트는 설정 파일의 `plugins`와 `svgr` 옵션으로 맞추게 한다.
- 업데이트는 플러그인 업데이트(`/plugin update prplay@prplay` 또는 자동 업데이트)다. 새 버전을 낼 때는 `plugin.json`의 `version`을 올린다. `node_modules`는 lockfile 해시가 바뀐 경우에만 다음 실행 때 다시 설치된다.

### 11.4 Knot에 적용하기

Knot 저장소에는 파일을 쓰지 않으므로(13장 '작업 위치') 확인은 scratchpad에 clone한 Knot 복사본에서 한다. 사용자와 같은 경로로 설치해 확인한다.

1. prplay 로컬 경로를 마켓플레이스로 추가하고 플러그인을 설치한다: `claude plugin marketplace add <prplay 경로>` → `claude plugin install prplay@prplay`. 설치 전에 `claude plugin validate <prplay 경로>`가 통과해야 한다. 로컬 폴더 마켓플레이스는 원본 폴더에서 실행되므로(11장 '플러그인 실행 환경'), 캐시 경로와 업데이트 동작은 scratchpad 마켓플레이스에 플러그인 소스를 `file://` git URL로 줘서 따로 확인한다.
2. Knot 복사본 `frontend/`에 `review.config.ts`, `review/Wrapper.tsx`, `review/cases/<폴더>/`를 둔다. 원본은 prplay `targets/knot/`에 같은 구조로 있다. 폰트는 넣지 않으므로 복사본에 패키지나 파일을 더하지 않는다(2.3 표, 11.2).
3. tsconfig `paths`에 `review-kit` 한 줄(`./review/review-kit.d.ts`)을 넣는다(11.2). Knot tsconfig `include`는 `./**/*.ts(x)`라 `review/`가 이미 들어간다.
4. Claude Code에서 `/prplay:review-page 366` 또는 스킬 폴더의 `cli.ts`로 `build 366` → `review/dist/review-366.html`(Stepper·Breadcrumb 탭 하나씩), `dev 366` → localhost.

이전 방식
- 2026-09-27~29: PR #366 worktree에 `"review-kit": "link:<prplay 경로>"`를 devDependency로 넣고 `review:build`·`review:dev` 스크립트로 빌드했다(사용자 승인). 스킬 방식으로 바꾸며 그 worktree의 설정은 치웠다.
- 2026-09-29: Knot 복사본에 스킬 폴더를 `.claude/skills/review-page/`로 복사하고 tsconfig `paths`를 스킬 폴더 `src/index.ts`로 걸었다. 플러그인 방식으로 바꾸며 없앤다.

### 11.5 출시

1. **자체 마켓플레이스**: prplay 저장소를 GitHub에 공개하고 `claude plugin validate`가 통과하는 상태로 푸시한다. 사용자는 `/plugin marketplace add <owner>/prplay` → `/plugin install prplay@prplay`로 설치한다. 심사가 없다.
2. **Anthropic 디렉터리 제출**: https://claude.ai/directory/manage 에서 제출한다(유료 claude.ai 플랜 필요). 승인되면 claude.ai, Cowork, Claude Code에 함께 노출된다. 제출 절차와 요구 사항(라이선스, 설명, 아이콘, 보안 검토 등)은 제출 직전에 https://claude.com/docs/directory/publish 에서 다시 확인한다(14장 확인 항목).
- `claude-plugins-official` 마켓플레이스는 Anthropic이 직접 관리하며 외부 제출을 받지 않는다.
- README에는 설치 명령, 요구 사항(Node 22.18 이상, 대상 프로젝트의 `react`·`react-dom`·`msw`), 처음 설정, 아티팩트 게시 방법, 1장 제약 요약을 둔다.

---

## 12. 참고할 기존 도구

| 도구 | 참고할 부분 | 한계 |
| --- | --- | --- |
| Storybook | args와 Controls, actions, docgen 기반 props 추론, `msw-storybook-addon`, `play` 함수 | 빌드 결과가 여러 파일이라 아티팩트에 못 올린다 |
| React Cosmos | fixture 파일 형식, props 패널 | playground가 미리 빌드된 번들이고 renderer는 별도 HTML(iframe + postMessage)이라 singlefile만으로는 파일 하나가 안 된다. 직접 합치면 1.1MB 한 파일이 되지만 `file://`에서는 renderer가 `blob:null` origin이 되어 멈춘다. fixture 선택은 `?fixture=` 쿼리 + `pushState` |
| Ladle | Vite 기반의 가벼운 스토리 실행 | `viteConfig`에 singlefile을 넣고 `inlineDynamicImports: true`를 직접 주면 479KB 한 파일이 된다(Ladle 5.1.1은 내부 vite 6을 쓴다). 스토리 선택은 `?story=` 쿼리 + `pushState`이고 hash·메모리 라우팅 옵션이 없다. `srcdoc` iframe에서는 `pushState` 실패 후 페이지가 이동해 깨진다 |
| Chromatic | before/after 시각 비교 | Storybook 전제, 외부 서비스 |

직접 만들기 전에 Cosmos나 Ladle의 빌드 결과에 vite-plugin-singlefile을 붙일 수 있는지 먼저 확인하면 틀을 새로 만드는 비용을 줄일 수 있다.

확인 결과(2026-09-27, 1.9): 두 도구 모두 스토리 선택이 쿼리 문자열과 History API에 묶여 있어, 단일 HTML에서는 History API 라우팅을 쓰지 않는다는 2.1의 제약과 맞지 않는다. 아티팩트는 쿼리 문자열을 iframe에 전달하지 않으므로 특정 스토리로 바로 여는 링크도 쓸 수 없다. 쓰려면 라우터를 패치해야 하므로, PR 하나를 파일 하나로 빌드하는 지금 방식(직접 만들기)을 유지한다. 참고할 부분(fixture 형식, Controls, actions)만 가져온다.

---

## 13. 개발 순서

작업 위치 (2026-09-27 변경)
- 코드는 처음부터 이 저장소(prplay)에서 개발한다. Knot 저장소에는 파일을 만들거나 고치지 않는다.
- Knot은 빌드 대상이다. 컴포넌트 소스, `node_modules`, tsconfig를 경로로만 참조한다. 경로는 `KNOT_DIR` 환경 변수로 정하고, 기본값은 `progress.md`의 Knot 경로다.
- 예외였던 것(2026-09-27~29, 사용자 승인): 라이브러리 링크 테스트를 위해 PR #366 worktree에 `review-kit` 링크, `review.config.ts`, 케이스, `pretendard` devDependency를 넣었다. 스킬 방식(11장)으로 바꾸며 치웠고, 이후 Knot 확인은 scratchpad에 clone한 복사본에 스킬 폴더를 복사해서 한다(11.4).
- 구조: `.claude-plugin/marketplace.json`(마켓플레이스), `plugins/prplay/`(플러그인. 스킬 원본은 `plugins/prplay/skills/review-page/`이고 빌드 스크립트 `src/build/`, 리뷰 화면과 모킹 엔진 `src/runtime/`을 포함한다, 11.1), `targets/knot/`(Knot 전용 `review.config.ts`, `review/Wrapper.tsx`, `review/cases/`. Knot 복사본에 복사해 쓰는 원본, 11.4).
- 런타임이 쓰는 `react`, `react-dom`, `@emotion/react`, `@tanstack/react-query`, `react-router`, `msw`는 대상 프로젝트의 `node_modules`에서 가져온다(11.3 `sharedPackages`). 그래야 컴포넌트와 리뷰 화면이 같은 인스턴스를 쓴다. 빌드 도구(Vite, 플러그인, react-docgen)와 `@mswjs/interceptors`는 스킬 폴더 의존성으로 설치한다(11.3).

1. **스파이크**: prplay에서 Knot을 대상으로, #365 Breadcrumb과 Stepper 케이스를 손으로 작성해 단일 HTML로 빌드한 뒤 아티팩트에 올려 실제로 도는지 확인한다. 1장의 미확인 항목(크기 상한, hash 전달, 공개 범위)도 여기서 확인한다.
2. **props 컨트롤**: react-docgen으로 컨트롤을 자동 생성하고 프리셋과 호출 기록 패널을 붙인다.
3. **네트워크 모킹**: interceptors와 getResponse로 모킹 엔진을 만들고 네트워크를 쓰는 페이지 하나로 시나리오 편집을 확인한다.
4. **코드 패널**: 소스, diff, GitHub 링크, 결정 목록, 영향 범위를 붙인다.
5. **스킬**: 1~4에서 만든 케이스 파일을 예시로 넣어 스킬을 작성하고, 다른 PR 두세 개에 돌려 결과를 고친다.
6. **스킬로 묶기**: `targets/knot/`의 설정을 `review.config.ts`(`defineConfig`) 형식으로 바꾸고, 리뷰 화면·빌드·스크립트를 스킬 폴더 하나(`review-page/`)에 넣어 복사만으로 쓰게 한다(11장). 복사 방식은 8단계에서 플러그인 설치로 바꾼다. 처음에는 `review-kit` npm 패키지로 분리했다가 2026-09-29 사용자 결정으로 바꿨다.
7. **PR 하나에 HTML 하나**: PR 폴더(`pr.ts` + 대상별 케이스)를 HTML 하나로 빌드하고, 맨 위 탭에 개요(PR 설명)와 대상 플레이그라운드를 둔다(3.4). 결정 목록은 케이스에서 개요로 옮긴다.
8. **플러그인 출시**: 스킬 폴더를 플러그인 `prplay`로 묶어 prplay 저장소를 마켓플레이스로 만들고, 설치 경로에 맞게 의존성 설치 위치와 `review-kit` 타입 파일을 바꾼 뒤, 자체 마켓플레이스로 공개하고 Anthropic 디렉터리에 제출한다(11장). 2026-09-29 사용자 결정.

---

## 14. 확인이 필요한 항목

- [x] 아티팩트 파일 크기 상한 → 16MB, data: URI 포함 (1.1 표)
- [x] 아티팩트에서 외부 이미지와 폰트 로딩이 막히는지 → 막힘. Google Fonts CSS와 일부 CDN 스크립트만 허용 (1.1 표)
- [x] 인라인한 폰트 파일로 공개 공유가 되는지 → 안 됨. 공개 공유 검토에서 막힌다 (1.1 표)
- [x] 부모 URL hash가 iframe으로 전달되는지 → 단순 `#anchor`만 전달, `#key=value`·쿼리 문자열은 전달 안 됨 (1.1 표)
- [x] 아티팩트 iframe에서 `window.open`과 새 창 링크가 동작하는지 → `window.open`은 대부분 `null`, `<a target="_blank">`는 새 탭으로 열림 (1.1 표)
- [x] 로그인하지 않은 사람의 아티팩트 열람 가능 여부 → 게시 직후 비공개, Share 메뉴로 공유하면 가능 (1.1 표, 로그아웃 상태 실제 열람은 미확인)
- [x] Claude Code에서 아티팩트로 바로 게시하는 경로 → Artifact 도구로 게시, 같은 경로로 재게시하면 링크 유지 (1.1 표)
- [x] Knot의 API 호출 방식(fetch인지 axios인지)과 서버 상태 라이브러리 → axios(SSE만 fetch), TanStack Query v5 (2.3 표)
- [x] Knot webpack svgr 옵션을 Vite로 옮겼을 때 아이콘 결과가 같은지 → 같다 (2.3 스파이크 결과)
- [x] React Cosmos, Ladle에 단일 파일 빌드를 붙일 수 있는지 → Ladle은 가능, Cosmos는 직접 합쳐야 가능. 둘 다 쿼리 문자열 + `pushState` 라우팅이라 직접 만들기 유지 (12장)
- [x] Claude Code가 Bash 도구 환경에 `CLAUDE_PLUGIN_DATA`를 넣어 주는지, SKILL.md 본문의 `${CLAUDE_PLUGIN_DATA}`·`${CLAUDE_SKILL_DIR}`가 플러그인 설치 경로로 바뀌는지 → 본문은 바뀌고, Bash·`!` 환경에는 변수가 없다. `--data`로 넘긴다 (11장 '플러그인 실행 환경', 11.3)
- [x] 플러그인 스킬의 `allowed-tools` 패턴(`Bash(node *review-page/src/cli.ts *)`)이 캐시 경로의 명령과 맞는지 → 맞는다. 로컬 폴더 마켓플레이스는 캐시가 아니라 원본에서 실행된다 (11장 '플러그인 실행 환경')
- [x] 데이터 폴더 `node_modules`를 심볼릭 링크로 건 스킬 폴더에서 Node·Vite가 패키지를 찾는지 → 찾는다. 빌드 결과 바이트 동일, 스모크·dev 서버 정상 (11.3)
- [ ] Anthropic 디렉터리 제출 요구 사항과 심사 기간 (11.5)
