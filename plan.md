# 리뷰 플레이그라운드 개발 지식 정리

PR에서 바뀐 컴포넌트와 페이지를 리뷰어가 직접 만져 볼 수 있는 HTML 파일 하나를 AI가 PR마다 만들고, Claude 아티팩트로 공유하는 도구를 만들기 위해 필요한 지식을 모은 문서다.

참고 링크
- vite-plugin-singlefile: https://github.com/richardtallent/vite-plugin-singlefile
- @mswjs/interceptors: https://github.com/mswjs/interceptors
- MSW getResponse: https://mswjs.io/docs/api/get-response
- Claude Code Skills: https://code.claude.com/docs/en/skills

---

## 0. 만들려는 것

리뷰어가 링크 하나를 열면 아래 화면이 나온다.

- 미리보기: PR에서 바뀐 실제 컴포넌트나 페이지가 렌더링된다.
- props 편집: 타입에 맞는 입력 컨트롤로 props를 바꾼다.
- 프리셋: "아주 긴 제목", "문서 1개" 같은 엣지 케이스를 버튼 하나로 적용한다.
- 목 데이터 편집: 네트워크 응답(JSON, 상태 코드, 지연)을 웹에서 수정한다.
- 코드 패널: 실제 소스, PR diff, 파일 경로와 GitHub 링크를 보여준다.
- 결정 목록: 작성자가 내린 결정을 한 줄씩 최대 5개만 보여준다.

역할 분담

| 구분 | 누가 만드나 | 언제 | 예시 |
| --- | --- | --- | --- |
| 틀 (shell) | 사람 | 한 번 | 화면 배치, Provider 설정, 모킹 엔진, 빌드 스크립트 |
| 내용 (case) | AI | PR마다 | `review/cases/365.tsx` |
| 결과물 | 빌드 | PR마다 | `dist/review-365.html` |

---

## 1. Claude 아티팩트 실행 환경 (2026-09-27 직접 확인)

`claude.ai/artifact/...` 페이지 안의 iframe(`*.frame.claudeusercontent.com`)에서 테스트한 결과다.

| 항목 | 결과 | 설계에 주는 영향 |
| --- | --- | --- |
| 올릴 수 있는 형태 | HTML 파일 하나 | JS, CSS, 폰트, 이미지를 모두 파일 안에 넣어야 한다 |
| Service Worker 등록 | 실패 (`sw.js`는 403, blob URL은 "protocol not supported") | MSW 브라우저 모드(`setupWorker`)를 쓸 수 없다 |
| 외부 주소 `fetch` | `TypeError: Failed to fetch` | 실제 API 호출 불가, 외부 CDN 폰트나 이미지도 막힐 가능성이 높다 |
| 같은 origin `fetch` | 200 | 의미 있는 용도는 없다 |
| `localStorage` | 동작 | 편집한 props와 목 데이터를 저장할 수 있다 |
| Secure context | true | `crypto.randomUUID` 같은 API 사용 가능 |

### 1.1 추가 확인 (2026-09-27, 1.8 작업)

근거는 두 가지다. **게시**는 Claude Code의 Artifact 도구로 점검 페이지를 실제로 올려 확인했고, **표시**는 Artifact 도구가 알려 주는 아티팩트 실행 환경 규칙(CSP, iframe 제한)이다. 브라우저 안의 실행 결과는 점검 페이지(`review-kit-probe`)를 열어 다시 확인한다.

| 항목 | 결과 | 근거 | 설계에 주는 영향 |
| --- | --- | --- | --- |
| Claude Code에서 바로 게시 | 가능. Artifact 도구에 HTML 경로를 넘기면 `claude.ai/artifact/...` 링크가 나오고, 같은 경로로 다시 올리면 같은 링크가 갱신된다 | 게시 | 스킬 마지막 단계에서 수동 업로드 없이 게시할 수 있다(5단계) |
| 파일 크기 상한 | 페이지 16MB. `data:` URI도 포함해서 센다. 12.6MB 파일 게시는 성공 | 게시 + 규칙 | 폰트는 쓰는 weight·글자만 넣고, 빌드 스크립트에서 크기를 출력해 16MB에 가까우면 경고한다 |
| 외부 이미지·CSS | 막힌다. 외부 스크립트는 cdnjs, jsdelivr 등 일부 CDN만, 외부 CSS는 Google Fonts만 허용되고 그 외 요청은 오류 없이 막힌다 | 규칙 | 지금 설계대로 폰트·이미지·SVG를 모두 파일 안에 넣는다. 원격 이미지 URL이 들어간 목 데이터는 화면에서 깨진다 |
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
- 진입점이 여러 개인 앱은 지원하지 않는다. HTML 하나당 케이스 하나로 빌드하면 문제없다.
- `public/` 폴더의 정적 파일은 인라인하지 않는다. 폰트와 이미지는 `import`로 가져와야 인라인된다.
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
- `assetsInlineLimit`을 크게 잡아야 폰트와 이미지가 base64로 들어간다. 파일 크기가 커지므로 폰트는 쓰는 weight만 넣는다.
- `resolve.dedupe`에 React와 CSS-in-JS 라이브러리(Knot는 Emotion)를 넣지 않으면 인스턴스가 두 개 생겨서 hooks 오류나 테마 Context 누락이 생긴다.
- vite-plugin-svgr 기본값은 `?react` 접미사가 붙은 import만 변환한다. 프로젝트가 `import Icon from './a.svg'` 형태를 쓰면 `include`와 `exportType`을 위처럼 바꿔야 하고, 이 옵션 이름은 사용하는 버전 문서에서 다시 확인한다. (vite-plugin-svgr 5.2 확인: `include`는 플러그인 옵션, `exportType`은 `svgrOptions` 안의 `@svgr/core` 옵션)
- vite-plugin-svgr는 기본으로 svgo를 돌리지 않는다. webpack의 `@svgr/webpack`처럼 svgo까지 거치려면 `svgrOptions.plugins`에 `@svgr/plugin-svgo`, `@svgr/plugin-jsx`를 순서대로 넣는다.

### 2.3 webpack 프로젝트(Knot)에서 필요한 작업

Knot는 webpack과 svgr을 쓰므로 Vite 빌드에서 같은 결과가 나오게 맞춰야 한다.

1. 경로 alias를 `tsconfig.json`의 `paths`와 맞춘다.
2. svgr 옵션을 webpack 설정과 맞춘다. Knot는 SVG의 `width`, `height`를 지우고 `size` prop으로 채우며 `aria-hidden="true"`를 붙이므로, 같은 svgr 옵션(svgo 플러그인, `svgProps`, `template` 등)을 Vite 쪽에도 넣는다.
3. `process.env.*`를 쓰는 코드가 있으면 Vite의 `define`으로 채운다.
4. CSS-in-JS의 JSX 설정(Knot는 Emotion의 `jsxImportSource: '@emotion/react'`)을 Vite의 `oxc.jsx.importSource`에 맞춘다.
5. `index.html`에서 CDN으로 불러오는 폰트는 아티팩트에서 막힐 수 있으므로, npm 패키지의 폰트 파일을 `import`해서 인라인한다.

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
| 폰트 | `index.html`의 jsDelivr CDN `<link>`로 Pretendard Variable | 5번대로 인라인 필요 |
| MSW | msw 2.15, 핸들러는 `@api/mock/handlers` | 6.1 `getResponse`로 재사용 |

그 밖에
- `package.json`에 이미 `review` 스크립트(`scripts/review.mjs`)가 있으므로 다른 이름(`review:build` 등)을 쓴다.
- `tsconfig.json`의 `include`가 `./**/*.ts(x)`라서 `review/`도 Knot 타입 체크 대상이 된다.
- #365는 이슈 번호이고 Stepper·Breadcrumb 구현 PR은 #366(`fe/feature/#365` 브랜치)이다. 케이스 파일 이름은 이슈 번호를 그대로 쓴다.

스파이크 결과 (2026-09-27, PR #366 브랜치)
- 처음에는 Knot worktree(`2026-Knot-pr366/frontend/review/`)에서 만들었고, 같은 날 13장 '작업 위치'에 따라 prplay로 옮겼다. 아래 `review/...` 경로는 옮기기 전 이름이다(`review/build.ts` → `src/build/build.ts`, `review/shell/` → `src/runtime/`, `review/cases/` → `targets/knot/cases/`).
- 빌드: `pnpm review:build review/cases/365.tsx` → `review/dist/review-365.html`. `review/build.ts`는 Node 22의 타입 제거로 바로 실행한다. pnpm은 간접 의존성을 import할 수 없으므로 `vite`를 직접 devDependency로 둔다.
- `review-kit` alias는 Knot tsconfig에 없으므로, 타입은 `review/shell/virtual.d.ts`의 ambient 선언으로 두고 런타임만 alias로 연결한다. 이렇게 해서 Knot `tsc --noEmit`이 그대로 통과한다.
- svgr: webpack 옵션 그대로 옮긴 결과 Stepper 화살표 `width/height=14`, Breadcrumb 화살표 `12`, `aria-hidden="true"`, `focusable="false"`, `viewBox` 유지로 webpack 설정과 같다.
- 폰트: `pretendard` 패키지의 `PretendardVariable.woff2`(2.0MB)를 인라인해서 HTML 하나가 약 2.9MB가 된다. 16MB 상한 안이지만, 크기를 줄이려면 쓰는 글자만 남기는 서브셋을 나중에 검토한다.

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
  scenarios?: Record<string, MockRoute[]>; // 네트워크 시나리오
  initialPath?: string;                    // 페이지 케이스의 시작 URL
  decisions?: string[];                    // 최대 5개, 한 문장씩
  impacts?: string[];                      // 영향받는 다른 파일
};

export type Actions = Record<string, (...args: unknown[]) => void>; // 함수 props 이름 → 호출 기록 로거

export const defineCase = <P,>(c: ReviewCase<P>) => c;
```

### 3.2 예시 (#365)

```tsx
// review/cases/365.tsx
import { useState } from 'react';
import Stepper from '@/shared/components/primitives/ui/Stepper';
import { defineCase } from 'review-kit';

export default defineCase({
  title: 'Stepper',
  sources: ['src/shared/components/primitives/ui/Stepper/index.tsx'],
  props: { total: 3 },
  render: ({ total }, actions) => <Harness total={total} actions={actions} />,
  presets: { '문서 1개': { total: 1 }, '문서 12개': { total: 12 } },
  decisions: [
    'current는 1부터 센 값을 받는다.',
    '순서 상태는 부모가 들고 Stepper는 onPrev, onNext만 알린다.',
  ],
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
- 구현(4.1): 저장소 주소와 비교 기준은 `review.config.ts`의 `repoUrl`, `baseBranch`(없으면 `origin/main`)를 쓴다. `sources`는 설정 파일 폴더 기준 경로이고, Knot처럼 설정 폴더가 git 루트가 아니면(`frontend/`) `git rev-parse --show-prefix`를 앞에 붙여 GitHub 경로를 만든다. `git`을 쓸 수 없거나 비교 기준이 없으면 diff와 SHA는 비우고 빌드는 계속한다. `repoUrl`이 없으면 링크를 만들지 않는다. 가상 모듈은 `{ sha, base, files: [{ path, code, diff, url }] }`이고, dev에서는 파일이 바뀌면 다시 읽는다.

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
- 주소 표시줄: 미리보기 툴바에 라우터의 현재 주소(경로+쿼리+hash)를 보여 준다. 링크나 버튼으로 이동하면 바로 바뀌고, 주소를 직접 입력하고 Enter를 누르면 그 주소로 이동한다. `↺`는 `initialPath`로 이동한다. props나 시나리오가 바뀌어 다시 마운트될 때(4.2)는 `initialPath`로 돌아가지 않고 보고 있던 주소에서 다시 시작한다. 라우터는 프로젝트마다 다르므로 review-kit은 wrapper에 `address` prop(`report(path)`, `connect(navigate)`)을 넘기고, wrapper가 라우터 안에서 현재 주소를 알리고 이동 함수를 연결한다. wrapper가 연결하지 않으면 주소 표시줄을 숨긴다.

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

---

## 5. props 편집

### 5.1 타입에서 컨트롤 자동 생성

`react-docgen` 8(Babel 파서 기반, Storybook도 쓰는 도구)을 빌드 시점에 실행하면 컴포넌트 props의 이름, 타입, 필수 여부, 기본값, JSDoc 설명, 유니온 리터럴 목록을 얻을 수 있다.

- `react-docgen-typescript`는 TypeScript JS API(`ts.createProgram`)가 필요한데, TypeScript 7(Knot가 쓰는 7.0.2)에는 이 API가 없다. `react-docgen`은 TypeScript 버전과 무관하므로 이쪽을 쓴다 (2026-09-27 결정).
- `react-docgen`은 파일 하나를 문법으로만 읽는다. 다른 파일에서 가져온 타입이나 `ButtonHTMLAttributes` 같은 상속 props는 풀지 못하므로, 풀지 못한 타입은 JSON 편집기로 보여준다.
- 케이스의 `sources` 첫 파일을 대상 컴포넌트로 보고, 그 파일의 default export 컴포넌트 props를 가상 모듈 `virtual:review-props`로 주입한다.

| props 타입 | 컨트롤 |
| --- | --- |
| `string` | 텍스트 입력 |
| `number` | 숫자 입력 |
| `boolean` | 체크박스 |
| `'a' \| 'b'` 리터럴 유니온 | 셀렉트 |
| 함수 (`onClick` 등) | 편집 대신 호출 기록 패널에 표시 |
| 객체, 배열, 그 외 | JSON 편집기 |

- 컨트롤은 케이스 `props`에 있는 키에만 만든다. 타입은 docgen 결과에서 같은 이름을 찾아 쓰고, 없으면(Harness 전용 props 등) 기본값의 `typeof`로 정한다. docgen에만 있고 케이스 `props`에 없는 값(예: Harness가 들고 있는 `current`)은 편집하지 않는다.
- 함수 props는 호출될 때 이름과 인자를 기록하는 로거로 바꿔 끼운다(Storybook의 actions와 같은 방식). docgen에서 함수 타입인 props마다 로거를 만들어 `render`의 두 번째 인자 `actions`로 넘기고, 컴포넌트를 바로 그리는 케이스는 `<C {...props} {...actions} />`처럼 펼쳐 넣는다.
- `ReactNode` 같은 props는 편집 대상에서 빼고 케이스의 `render`에서 채운다.

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

- 목이 없는 요청은 어차피 외부 fetch가 막혀 있으므로 501과 요청 주소를 돌려줘서 어떤 목이 빠졌는지 화면에서 보이게 한다.
- 요청 주소가 상대 경로(`baseURL: ''`)여도 `file://`과 http 양쪽에서 핸들러의 `/api/...` 경로와 맞는다(2026-09-27 확인, 3.1).
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

- 편집한 props와 시나리오는 `localStorage`에 `review-kit:{PR번호}:{케이스}` 키로 저장한다(아티팩트에서 동작 확인). PR번호는 빌드 옵션 `--pr`로 받고, 없으면 케이스 파일 이름 앞의 숫자를 쓴다. 케이스는 확장자를 뺀 케이스 파일 이름이다. 값은 `{ props, scenarios }` JSON이다.
  - `scenarios`는 시나리오 이름 → 라우트 배열이고, 케이스 기본값과 다른 시나리오만 넣는다. 불러올 때는 케이스에 있는 시나리오 이름만 받는다. 선택한 시나리오는 저장하지 않고 늘 첫 시나리오로 시작한다(3.7).
  - JSON 복사/붙여넣기도 같은 `{ props, scenarios }` 모양을 쓴다. 붙여넣은 JSON에 있는 키만 바꾼다.
- 다른 리뷰어에게 같은 상태를 보여주려면 "JSON 복사"와 "JSON 붙여넣기"를 둔다. 아티팩트는 `#key=value` hash와 쿼리 문자열을 iframe에 전달하지 않으므로(1.1) URL 공유는 하지 않는다.
  - 복사: 클릭 핸들러 안에서 `navigator.clipboard.writeText`를 부르고, 실패하면 JSON을 텍스트 영역에 띄워 선택해 둔다.
  - 붙여넣기: 클립보드 읽기는 막혀 있으므로 텍스트 영역에 붙여넣고 "적용"을 누르게 한다.
- "초기화" 버튼으로 케이스 기본값으로 되돌린다. `confirm()`은 아티팩트에서 항상 `false`이므로 확인 단계는 화면 안 UI로 만든다.

---

## 8. 코드 패널

- 탭: 소스 전체, PR diff, 결정 목록, 영향 범위. 패널은 미리보기 아래에 두고, `sources`가 여러 개면 소스·diff 탭 안에서 파일을 고른다. 결정 목록은 오른쪽 패널에서 이 탭으로 옮긴다. diff가 비어 있으면 "비교 기준과 달라진 내용 없음"을 보여준다.
- 문법 강조: Shiki는 결과가 정확하지만 문법과 테마를 번들에 넣으면 파일이 커진다. `prism-react-renderer`가 가볍다. 단일 파일이므로 크기를 보고 고른다.
  - 비교 결과(2026-09-29, 4.3, `review-365.html`): 강조 없음 3705KB, `prism-react-renderer` 2.4.1(`themes.github`) 3789KB(+84KB), Shiki 4.4.3(`shiki/core` + JavaScript 정규식 엔진 + tsx 문법 + github-light 테마 하나) 4046KB(+341KB). **`prism-react-renderer`를 쓴다.**
  - 언어는 확장자로 고른다: `.tsx`·`.jsx`는 `tsx`, `.ts`·`.js`는 `typescript`, `.css`는 `css`, 그 외는 강조 없이 보여준다. 줄 번호를 붙인다.
- diff는 `+`, `-` 줄 색만 칠해도 충분히 읽힌다.
- 파일 경로는 커밋 SHA 기준 GitHub 링크로 만든다. `window.open`은 대부분의 열람자에게 `null`을 돌려주므로 쓰지 않고, `<a href target="_blank" rel="noopener">` 링크로 새 탭을 연다(1.1). 옆에 링크 복사 버튼을 같이 둔다.
  - 구현(4.4): 파일이 하나면 경로 자체가 링크이고, 여러 개면 파일 선택 옆에 "GitHub에서 보기" 링크를 둔다. 링크 복사는 7장 JSON 복사와 같이 `writeText`가 실패하면 주소를 읽기 전용 입력칸에 띄워 선택해 둔다. `repoUrl`이나 SHA가 없으면 링크와 복사 버튼을 숨긴다.

---

## 9. AI 생성: Claude Code 스킬

### 9.1 스킬 기본 지식

- 위치: `.claude/skills/<name>/SKILL.md`. `/<name>`으로 직접 부르거나 Claude가 필요할 때 불러온다.
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

### 9.3 영향 범위 찾기

- 바뀐 파일을 import하는 곳은 `rg "from ['\"].*Breadcrumb['\"]" src` 같은 검색으로 찾는다.
  - 구현(4.5): `templates/review-page/scripts/find-impacts.sh <파일>... [--dir src]`. 파일마다 모듈 이름(확장자를 뺀 파일 이름, `index`면 폴더 이름)으로 `from '…/이름'`, `import('…/이름')`을 `rg`로 찾고, 입력 파일을 뺀 경로를 한 줄씩 출력한다. 경로는 명령을 실행한 폴더(설정 파일 폴더) 기준이라 케이스 `impacts`에 그대로 넣는다. 이름만 보므로 같은 이름의 다른 모듈도 걸릴 수 있어, 스킬이 결과를 훑어 관계없는 파일을 뺀다.
- 정확도를 높이려면 `madge`나 TypeScript 컴파일러 API로 import 그래프를 만든다.

### 9.4 추가 검증 (선택)

- Playwright로 결과 HTML을 `file://`로 열어 Error Boundary 문구가 없는지, 프리셋마다 렌더링이 되는지 확인하는 스모크 테스트를 스킬 검증 단계에 넣을 수 있다.
- 구현(5.5): `templates/review-page/scripts/smoke.mjs <html>...`. Playwright는 review-kit 의존성에 넣지 않고 명령을 실행한 프로젝트의 `playwright`나 `@playwright/test`를 쓴다(없으면 건너뛴다고 알리고 0으로 끝낸다). 파일마다 `file://`로 열어 첫 화면, 프리셋 버튼 하나씩, 시나리오 버튼 하나씩을 누르고 각각 확인한다.
  - 실패: "미리보기 렌더링 오류" 문구, 페이지의 잡히지 않은 오류(`pageerror`), 콘솔 `error`, `file:`·`data:`·`blob:`이 아닌 외부 요청
  - 경고: 요청 기록의 501(목이 없는 요청)
  - 실패가 하나라도 있으면 1로 끝난다.

---

## 10. 배포

| 방법 | 수고 | 특징 |
| --- | --- | --- |
| Claude 아티팩트 | PR마다 HTML을 claude.ai에 올리는 수동 작업 | 외부 서비스 설정이 없다. 1장의 제약을 모두 지켜야 한다 |
| GitHub Pages + Actions | 처음 한 번 설정 | 이후 PR마다 자동. 파일 하나로 만들 필요가 없다 |
| Chromatic | 처음 한 번 설정 | Storybook 전제. 시각 비교(before/after)가 기본 제공된다 |

- HTML 파일은 GitHub PR에 첨부해도 브라우저에서 렌더링되지 않으므로 공유 수단이 되지 않는다.
- 단일 HTML은 로컬에서 더블클릭으로도 열리므로, 아티팩트 게시 전 확인은 `file://`로 한다.
- 아티팩트 갤러리와 탭 이름은 HTML의 정적 `<title>`에서 나온다. 그래서 빌드할 때 케이스의 `title`을 넣어 `Review · {title}`로 만든다(실행 중 `document.title`과 같은 값). 케이스 파일은 TSX라 `sources`처럼 정규식으로 읽고, 읽지 못하면 케이스 파일 이름을 쓴다.

---

## 11. 라이브러리로 분리

### 11.1 패키지 구성

```
review-kit/
  src/
    index.ts     # defineCase, defineConfig, 타입 (케이스·설정 파일이 import하는 곳)
    runtime/     # 리뷰 화면, 모킹 엔진, 상태 저장
    build/       # Vite 빌드·dev 서버, 가상 모듈 플러그인, docgen, 설정 파일 로딩
    cli.ts       # review-kit build, review-kit dev, review-kit init
  templates/
    review.config.ts         # init이 복사하는 설정 파일
    review-page/             # init이 .claude/skills/review-page/로 복사하는 스킬
      SKILL.md
      example-component.tsx  # 컴포넌트 케이스 예시
      example-page.tsx       # 페이지 + 네트워크 케이스 예시
      scripts/find-impacts.sh
  package.json   # bin: { "review-kit": "dist/cli.js" }
```

CLI (명령은 설정 파일이 있는 프로젝트 폴더에서 실행한다)
- `review-kit build <케이스>... [--pr 번호]`: 케이스마다 단일 HTML을 `outDir`에 만든다. 아티팩트에 올리는 결과물이다.
- `review-kit dev <케이스> [--port 5173]`: 같은 설정으로 Vite dev 서버를 띄운다. 케이스 파일이나 컴포넌트를 고치면 바로 반영(HMR)되므로 케이스를 쓰는 동안 확인용으로 쓴다. 단일 파일 플러그인은 빼고, 나머지 플러그인·가상 모듈·alias는 build와 같다. 최종 확인은 build 결과를 `file://`로 연다(10장).
- `review-kit init`: `review.config.ts`와 스킬 템플릿을 복사한다.

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
  wrapper: './review/Wrapper.tsx',         // 4.1 Provider 묶음 컴포넌트 파일
  mockHandlers: './src/shared/api/mock/handlers', // 6.1 기존 MSW 핸들러 파일. 시나리오에 없는 요청에 쓴다
  casesDir: './review/cases',              // 케이스 이름만 줄 때 찾는 폴더
  outDir: './review/dist',
  repoUrl: 'https://github.com/woowacourse-teams/2026-Knot',
  baseBranch: 'origin/main',
});
```

- 설정 파일은 Node에서 읽고(Vite `loadConfigFromFile`로 TS 변환), 미리보기는 브라우저 번들에서 돈다. 그래서 `wrapper`는 함수가 아니라 컴포넌트 파일 경로로 받아 `virtual:review-wrapper`로 주입한다. 파일은 `({ initialPath, address, children }: WrapperProps) => ReactNode` 컴포넌트를 default export한다. `address`는 4.1 주소 표시줄 연결용이다. `review-kit`이 key로 다시 마운트하므로 `QueryClient`는 wrapper 안에서 `useState`로 만들면 된다(4.2).
- `sources`, `impacts` 경로는 설정 파일이 있는 폴더 기준이다.

### 11.3 주의할 점

- `react`, `react-dom`, CSS-in-JS 라이브러리(Knot는 `@emotion/react`)는 `peerDependencies`로 두고 빌드에서 `dedupe`한다. 구현은 `sharedPackages`에 적힌 패키지를 대상 프로젝트 `node_modules`에서 찾는 resolve 플러그인이다(13장 '작업 위치'와 같다).
- 런타임(리뷰 화면)은 사용자의 컴포넌트와 같은 번들에 들어가야 하므로 미리 빌드한 앱이 아니라 ESM 라이브러리로 배포한다.
- 리뷰 화면 스타일이 사용자 앱 스타일과 충돌하지 않게 CSS 접두사나 Shadow DOM을 쓴다.
- 처음에는 Vite 빌드만 지원하고, webpack 프로젝트는 설정 파일의 `plugins`와 `svgr` 옵션으로 맞추게 한다.
- prplay는 `pnpm-workspace.yaml`에 `autoInstallPeers: false`를 두어 피어를 설치하지 않는다. 타입만 필요한 `@types/react`는 대상과 같은 버전을 devDependency로 둔다(링크한 `src/index.ts`를 대상 `tsc`가 검사하기 때문).
- 배포 전(로컬 링크 단계)에는 `src/`의 `.ts`를 Node 22 타입 제거로 바로 실행한다. 링크는 실제 경로(prplay)로 풀리므로 `node_modules` 안 `.ts` 실행 제한에 걸리지 않는다. npm 배포 시에는 `dist/`로 컴파일한다(6.4).

### 11.4 로컬 링크로 적용하기 (Knot, 2026-09-27)

사용자 승인으로 PR #366 worktree(`2026-Knot-pr366/frontend`, 스파이크 브랜치)에만 적용한다. Knot develop 작업 트리는 건드리지 않는다.

1. Knot `package.json` devDependencies에 `"review-kit": "link:<prplay 경로>"`를 넣고 `pnpm install`한다.
2. Knot 루트에 `review.config.ts`, `review/Wrapper.tsx`, `review/cases/*.tsx`를 둔다. 원본은 prplay `targets/knot/`에 같은 구조로 두고 복사한다.
3. Knot `package.json` 스크립트: `"review:build": "review-kit build"`, `"review:dev": "review-kit dev"`.
4. `pnpm review:dev 365` → localhost에서 확인, `pnpm review:build 365` → `review/dist/review-365.html`.

---

## 12. 참고할 기존 도구

| 도구 | 참고할 부분 | 한계 |
| --- | --- | --- |
| Storybook | args와 Controls, actions, docgen 기반 props 추론, `msw-storybook-addon`, `play` 함수 | 빌드 결과가 여러 파일이라 아티팩트에 못 올린다 |
| React Cosmos | fixture 파일 형식, props 패널 | playground가 미리 빌드된 번들이고 renderer는 별도 HTML(iframe + postMessage)이라 singlefile만으로는 파일 하나가 안 된다. 직접 합치면 1.1MB 한 파일이 되지만 `file://`에서는 renderer가 `blob:null` origin이 되어 멈춘다. fixture 선택은 `?fixture=` 쿼리 + `pushState` |
| Ladle | Vite 기반의 가벼운 스토리 실행 | `viteConfig`에 singlefile을 넣고 `inlineDynamicImports: true`를 직접 주면 479KB 한 파일이 된다(Ladle 5.1.1은 내부 vite 6을 쓴다). 스토리 선택은 `?story=` 쿼리 + `pushState`이고 hash·메모리 라우팅 옵션이 없다. `srcdoc` iframe에서는 `pushState` 실패 후 페이지가 이동해 깨진다 |
| Chromatic | before/after 시각 비교 | Storybook 전제, 외부 서비스 |

직접 만들기 전에 Cosmos나 Ladle의 빌드 결과에 vite-plugin-singlefile을 붙일 수 있는지 먼저 확인하면 틀을 새로 만드는 비용을 줄일 수 있다.

확인 결과(2026-09-27, 1.9): 두 도구 모두 스토리 선택이 쿼리 문자열과 History API에 묶여 있어, 단일 HTML에서는 History API 라우팅을 쓰지 않는다는 2.1의 제약과 맞지 않는다. 아티팩트는 쿼리 문자열을 iframe에 전달하지 않으므로 특정 스토리로 바로 여는 링크도 쓸 수 없다. 쓰려면 라우터를 패치해야 하므로, PR마다 케이스 하나를 파일 하나로 빌드하는 지금 방식(직접 만들기)을 유지한다. 참고할 부분(fixture 형식, Controls, actions)만 가져온다.

---

## 13. 개발 순서

작업 위치 (2026-09-27 변경)
- 코드는 처음부터 이 저장소(prplay)에서 개발한다. Knot 저장소에는 파일을 만들거나 고치지 않는다.
- Knot은 빌드 대상이다. 컴포넌트 소스, `node_modules`, tsconfig를 경로로만 참조한다. 경로는 `KNOT_DIR` 환경 변수로 정하고, 기본값은 `progress.md`의 Knot 경로다.
- 예외(2026-09-27, 사용자 승인): 6단계 라이브러리 링크 테스트는 PR #366 worktree에 11.4대로 `review-kit` 링크, `review.config.ts`, 케이스를 넣어서 한다. 이후 KNOT_DIR 방식 대신 Knot 폴더에서 `review-kit` 명령으로 빌드한다.
- 구조: `src/build/`(빌드 스크립트), `src/runtime/`(리뷰 화면과 모킹 엔진), `targets/knot/`(Knot 전용 `review.config.ts`, `review/Wrapper.tsx`, `review/cases/`. 6단계부터 Knot worktree에 복사해 쓰는 원본, 11.4), `dist/`(결과 HTML).
- 런타임이 쓰는 `react`, `react-dom`, `@emotion/react`, `@tanstack/react-query`, `react-router`, `msw`는 대상 프로젝트의 `node_modules`에서 가져온다(11.3 peerDependencies와 같은 뜻). 그래야 컴포넌트와 리뷰 화면이 같은 인스턴스를 쓴다. 빌드 도구(Vite, 플러그인, react-docgen)와 `@mswjs/interceptors`는 prplay에 설치한다.

1. **스파이크**: prplay에서 Knot을 대상으로, #365 Breadcrumb과 Stepper 케이스를 손으로 작성해 단일 HTML로 빌드한 뒤 아티팩트에 올려 실제로 도는지 확인한다. 1장의 미확인 항목(크기 상한, hash 전달, 공개 범위)도 여기서 확인한다.
2. **props 컨트롤**: react-docgen으로 컨트롤을 자동 생성하고 프리셋과 호출 기록 패널을 붙인다.
3. **네트워크 모킹**: interceptors와 getResponse로 모킹 엔진을 만들고 네트워크를 쓰는 페이지 하나로 시나리오 편집을 확인한다.
4. **코드 패널**: 소스, diff, GitHub 링크, 결정 목록, 영향 범위를 붙인다.
5. **스킬**: 1~4에서 만든 케이스 파일을 예시로 넣어 스킬을 작성하고, 다른 PR 두세 개에 돌려 결과를 고친다.
6. **라이브러리 분리**: `targets/knot/`의 설정을 `review.config.ts`(`defineConfig`) 형식으로 바꾸고, prplay를 `review-kit` 패키지로 배포할 수 있게 정리한다.

---

## 14. 확인이 필요한 항목

- [x] 아티팩트 파일 크기 상한 → 16MB, data: URI 포함 (1.1 표)
- [x] 아티팩트에서 외부 이미지와 폰트 로딩이 막히는지 → 막힘. Google Fonts CSS와 일부 CDN 스크립트만 허용 (1.1 표)
- [x] 부모 URL hash가 iframe으로 전달되는지 → 단순 `#anchor`만 전달, `#key=value`·쿼리 문자열은 전달 안 됨 (1.1 표)
- [x] 아티팩트 iframe에서 `window.open`과 새 창 링크가 동작하는지 → `window.open`은 대부분 `null`, `<a target="_blank">`는 새 탭으로 열림 (1.1 표)
- [x] 로그인하지 않은 사람의 아티팩트 열람 가능 여부 → 게시 직후 비공개, Share 메뉴로 공유하면 가능 (1.1 표, 로그아웃 상태 실제 열람은 미확인)
- [x] Claude Code에서 아티팩트로 바로 게시하는 경로 → Artifact 도구로 게시, 같은 경로로 재게시하면 링크 유지 (1.1 표)
- [x] Knot의 API 호출 방식(fetch인지 axios인지)과 서버 상태 라이브러리 → axios(SSE만 fetch), TanStack Query v5 (2.3 표)
- [x] Knot webpack svgr 옵션을 Vite로 옮겼을 때 아이콘 결과가 같은지 → 같다 (2.3 스파이크 결과)
- [x] React Cosmos, Ladle에 단일 파일 빌드를 붙일 수 있는지 → Ladle은 가능, Cosmos는 직접 합쳐야 가능. 둘 다 쿼리 문자열 + `pushState` 라우팅이라 직접 만들기 유지 (12장)
