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

아직 확인하지 않은 것
- 파일 크기 상한
- 부모 페이지 URL의 hash가 iframe으로 전달되는지 (편집 상태를 URL로 공유할 수 있는지와 관련)
- 로그인하지 않은 사람도 링크를 볼 수 있는지
- Claude Code에서 아티팩트로 바로 게시하는 공식 경로가 있는지

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
// review/build.ts
import { build, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
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
      react(),
      svgr({ include: '**/*.svg', svgrOptions: { exportType: 'default' } }),
      caseModule(casePath),
      sourcesModule(casePath), // 3.3 참고
      viteSingleFile(),
    ],
    resolve: {
      alias: { '@': path.resolve('src') },
      dedupe: ['react', 'react-dom', 'styled-components'],
    },
    build: { outDir, assetsInlineLimit: Number.MAX_SAFE_INTEGER },
  });
}
```

주의할 점
- `assetsInlineLimit`을 크게 잡아야 폰트와 이미지가 base64로 들어간다. 파일 크기가 커지므로 폰트는 쓰는 weight만 넣는다.
- `resolve.dedupe`에 React와 styled-components를 넣지 않으면 인스턴스가 두 개 생겨서 hooks 오류나 테마 Context 누락이 생긴다.
- vite-plugin-svgr 기본값은 `?react` 접미사가 붙은 import만 변환한다. 프로젝트가 `import Icon from './a.svg'` 형태를 쓰면 `include`와 `exportType`을 위처럼 바꿔야 하고, 이 옵션 이름은 사용하는 버전 문서에서 다시 확인한다.

### 2.3 webpack 프로젝트(Knot)에서 필요한 작업

Knot는 webpack과 svgr을 쓰므로 Vite 빌드에서 같은 결과가 나오게 맞춰야 한다.

1. 경로 alias를 `tsconfig.json`의 `paths`와 맞춘다.
2. svgr 옵션을 webpack 설정과 맞춘다. Knot는 SVG의 `width`, `height`를 지우고 `size` prop으로 채우며 `aria-hidden="true"`를 붙이므로, 같은 svgr 옵션(svgo 플러그인, `replaceAttrValues`, `svgProps` 등)을 Vite 쪽에도 넣는다.
3. `process.env.*`를 쓰는 코드가 있으면 Vite의 `define`으로 채운다.
4. styled-components의 babel 플러그인을 쓰고 있다면 `@vitejs/plugin-react`의 `babel.plugins`에 같은 플러그인을 넣는다.

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
  render: (props: P) => React.ReactNode;   // 상태가 필요한 컴포넌트를 감싸는 자리
  props: P;                                // 기본 props
  presets?: Record<string, Partial<P>>;    // 엣지 케이스
  scenarios?: Record<string, MockRoute[]>; // 네트워크 시나리오
  initialPath?: string;                    // 페이지 케이스의 시작 URL
  decisions?: string[];                    // 최대 5개, 한 문장씩
  impacts?: string[];                      // 영향받는 다른 파일
};

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
  render: ({ total }) => <Harness total={total} />,
  presets: { '문서 1개': { total: 1 }, '문서 12개': { total: 12 } },
  decisions: [
    'current는 1부터 센 값을 받는다.',
    '순서 상태는 부모가 들고 Stepper는 onPrev, onNext만 알린다.',
  ],
  impacts: [],
});

function Harness({ total }: { total: number }) {
  const [current, setCurrent] = useState(1);
  return (
    <Stepper
      current={current}
      total={total}
      onPrev={() => setCurrent((c) => c - 1)}
      onNext={() => setCurrent((c) => c + 1)}
    />
  );
}
```

제어 컴포넌트(부모가 상태를 들고 콜백만 받는 컴포넌트)는 props만 바꿔서는 동작을 볼 수 없으므로, 위처럼 케이스 안에 상태를 가진 Harness를 둔다.

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
- 로그인 상태가 필요한 페이지는 인증 Context도 목으로 채운다.

### 4.2 다시 그리기와 캐시 초기화

- props나 시나리오가 바뀌면 미리보기 루트에 `key`를 바꿔 끼워 전체를 다시 마운트한다.
- React Query 같은 캐시가 있으면 이전 응답이 남으므로, 시나리오가 바뀔 때마다 `new QueryClient()`를 새로 만들어 넘긴다. 재시도 옵션(`retry`)은 꺼야 에러 시나리오가 바로 보인다.

### 4.3 격리

- 미리보기를 Error Boundary로 감싸서 컴포넌트가 터져도 편집 패널은 살아 있게 한다.
- 리뷰 화면의 CSS와 컴포넌트 CSS가 섞이지 않게, 리뷰 화면 스타일은 접두사가 붙은 클래스나 Shadow DOM에 둔다. 전역 스타일(`GlobalStyle`)은 미리보기 쪽만 적용되게 한다.
- 폭 조절 슬라이더로 미리보기 컨테이너 폭을 바꿀 수 있게 하면 반응형과 말줄임 문제를 바로 확인할 수 있다. 미디어 쿼리까지 확인하려면 미리보기를 `srcdoc` iframe에 넣어야 한다.

---

## 5. props 편집

### 5.1 타입에서 컨트롤 자동 생성

`react-docgen-typescript`(Storybook도 쓰는 도구)를 빌드 시점에 실행하면 컴포넌트 props의 이름, 타입, 필수 여부, 기본값, 유니온 리터럴 목록을 얻을 수 있다.

| props 타입 | 컨트롤 |
| --- | --- |
| `string` | 텍스트 입력 |
| `number` | 숫자 입력 |
| `boolean` | 체크박스 |
| `'a' \| 'b'` 리터럴 유니온 | 셀렉트 |
| 함수 (`onClick` 등) | 편집 대신 호출 기록 패널에 표시 |
| 객체, 배열, 그 외 | JSON 편집기 |

- 함수 props는 호출될 때 이름과 인자를 기록하는 로거로 바꿔 끼운다(Storybook의 actions와 같은 방식).
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
import browserInterceptors from '@mswjs/interceptors/presets/browser';
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
    interceptors: browserInterceptors,
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
- 요청 기록 패널(메서드, URL, 상태, 걸린 시간)을 두면 페이지가 어떤 API를 부르는지 리뷰어가 코드 없이 알 수 있다.
- `delay`로 로딩 상태를, `status: 500`으로 에러 상태를, `HttpResponse.error()`로 네트워크 끊김을 재현한다.
- 이미 저장소에 MSW 핸들러가 있다면 `getResponse`에 그 핸들러를 같이 넘겨 재사용할 수 있다. 편집한 시나리오 핸들러를 배열 앞에 두면 우선 적용된다.

### 6.2 목 데이터와 API 타입 맞추기

- 시나리오의 `body`를 API 응답 타입으로 타이핑한다. 예: `body: [] satisfies DocumentListResponse`. AI가 잘못된 모양을 만들면 타입 체크에서 걸린다.
- OpenAPI 명세가 있으면 명세에서 타입을 생성하고, 웹 편집기에서도 JSON Schema로 검증할 수 있다. 명세가 없으면 편집기는 JSON 문법 검사까지만 한다.

### 6.3 시나리오 편집 UI

- 시나리오 선택 버튼(정상, 빈 목록, 로딩, 에러)과 선택된 시나리오의 라우트 목록을 보여준다.
- 라우트마다 상태 코드, 지연(ms), body JSON을 편집한다. JSON 편집기는 CodeMirror 6을 쓰면 문법 강조와 오류 표시가 된다.
- "적용" 버튼을 누르면 캐시를 새로 만들고 미리보기를 다시 마운트한다.

---

## 7. 편집 상태 저장과 공유

- 편집한 props와 시나리오는 `localStorage`에 `review-kit:{PR번호}:{케이스}` 키로 저장한다(아티팩트에서 동작 확인).
- 다른 리뷰어에게 같은 상태를 보여주려면 "JSON 복사"와 "JSON 붙여넣기" 버튼을 둔다. URL hash 공유는 아티팩트에서 hash가 iframe까지 전달되는지 확인한 뒤 결정한다.
- "초기화" 버튼으로 케이스 기본값으로 되돌린다.

---

## 8. 코드 패널

- 탭: 소스 전체, PR diff, 결정 목록, 영향 범위.
- 문법 강조: Shiki는 결과가 정확하지만 문법과 테마를 번들에 넣으면 파일이 커진다. `prism-react-renderer`가 가볍다. 단일 파일이므로 크기를 보고 고른다.
- diff는 `+`, `-` 줄 색만 칠해도 충분히 읽힌다.
- 파일 경로를 누르면 커밋 SHA 기준 GitHub 링크를 새 창으로 연다. 아티팩트 iframe에서 새 창 열기가 막히는지는 확인이 필요하고, 막히면 링크 복사 버튼으로 대신한다.

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
- 정확도를 높이려면 `madge`나 TypeScript 컴파일러 API로 import 그래프를 만든다.

### 9.4 추가 검증 (선택)

- Playwright로 결과 HTML을 `file://`로 열어 Error Boundary 문구가 없는지, 프리셋마다 렌더링이 되는지 확인하는 스모크 테스트를 스킬 검증 단계에 넣을 수 있다.

---

## 10. 배포

| 방법 | 수고 | 특징 |
| --- | --- | --- |
| Claude 아티팩트 | PR마다 HTML을 claude.ai에 올리는 수동 작업 | 외부 서비스 설정이 없다. 1장의 제약을 모두 지켜야 한다 |
| GitHub Pages + Actions | 처음 한 번 설정 | 이후 PR마다 자동. 파일 하나로 만들 필요가 없다 |
| Chromatic | 처음 한 번 설정 | Storybook 전제. 시각 비교(before/after)가 기본 제공된다 |

- HTML 파일은 GitHub PR에 첨부해도 브라우저에서 렌더링되지 않으므로 공유 수단이 되지 않는다.
- 단일 HTML은 로컬에서 더블클릭으로도 열리므로, 아티팩트 게시 전 확인은 `file://`로 한다.

---

## 11. 라이브러리로 분리

### 11.1 패키지 구성

```
review-kit/
  src/
    runtime/     # 리뷰 화면, 모킹 엔진, 상태 저장
    build/       # Vite 빌드, 가상 모듈 플러그인, docgen
    cli.ts       # review-kit build, review-kit init
  templates/
    SKILL.md
    example-case.tsx
  package.json   # bin: { "review-kit": "dist/cli.js" }
```

### 11.2 프로젝트 설정 파일

```ts
// review.config.ts
import { defineConfig } from 'review-kit';

export default defineConfig({
  alias: { '@': './src' },
  plugins: [/* 프로젝트에 필요한 Vite 플러그인 */],
  svgr: { /* 프로젝트 svgr 옵션 */ },
  wrapper: ({ children, initialPath }) => (/* Provider 묶음 */),
  repoUrl: 'https://github.com/woowacourse-teams/2026-Knot',
  baseBranch: 'origin/main',
});
```

### 11.3 주의할 점

- `react`, `react-dom`, `styled-components`는 `peerDependencies`로 두고 빌드에서 `dedupe`한다.
- 런타임(리뷰 화면)은 사용자의 컴포넌트와 같은 번들에 들어가야 하므로 미리 빌드한 앱이 아니라 ESM 라이브러리로 배포한다.
- 리뷰 화면 스타일이 사용자 앱 스타일과 충돌하지 않게 CSS 접두사나 Shadow DOM을 쓴다.
- 처음에는 Vite 빌드만 지원하고, webpack 프로젝트는 설정 파일의 `plugins`와 `svgr` 옵션으로 맞추게 한다.

---

## 12. 참고할 기존 도구

| 도구 | 참고할 부분 | 한계 |
| --- | --- | --- |
| Storybook | args와 Controls, actions, docgen 기반 props 추론, `msw-storybook-addon`, `play` 함수 | 빌드 결과가 여러 파일이라 아티팩트에 못 올린다 |
| React Cosmos | fixture 파일 형식, props 패널 | 단일 파일 빌드 지원 여부 미확인 |
| Ladle | Vite 기반의 가벼운 스토리 실행 | 단일 파일 빌드 지원 여부 미확인 |
| Chromatic | before/after 시각 비교 | Storybook 전제, 외부 서비스 |

직접 만들기 전에 Cosmos나 Ladle의 빌드 결과에 vite-plugin-singlefile을 붙일 수 있는지 먼저 확인하면 틀을 새로 만드는 비용을 줄일 수 있다.

---

## 13. 개발 순서

1. **스파이크**: Knot 안에 `review/`를 만들고, #365 Breadcrumb과 Stepper 케이스를 손으로 작성해 단일 HTML로 빌드한 뒤 아티팩트에 올려 실제로 도는지 확인한다. 1장의 미확인 항목(크기 상한, hash 전달, 공개 범위)도 여기서 확인한다.
2. **props 컨트롤**: react-docgen-typescript로 컨트롤을 자동 생성하고 프리셋과 호출 기록 패널을 붙인다.
3. **네트워크 모킹**: interceptors와 getResponse로 모킹 엔진을 만들고 네트워크를 쓰는 페이지 하나로 시나리오 편집을 확인한다.
4. **코드 패널**: 소스, diff, GitHub 링크, 결정 목록, 영향 범위를 붙인다.
5. **스킬**: 1~4에서 만든 케이스 파일을 예시로 넣어 스킬을 작성하고, 다른 PR 두세 개에 돌려 결과를 고친다.
6. **라이브러리 분리**: Knot 전용 코드를 `review.config.ts`로 빼고 나머지를 패키지로 옮긴다.

---

## 14. 확인이 필요한 항목

- [ ] 아티팩트 파일 크기 상한
- [ ] 아티팩트에서 외부 이미지와 폰트 로딩이 막히는지 (fetch만 확인함)
- [ ] 부모 URL hash가 iframe으로 전달되는지
- [ ] 아티팩트 iframe에서 `window.open`과 새 창 링크가 동작하는지
- [ ] 로그인하지 않은 사람의 아티팩트 열람 가능 여부
- [ ] Claude Code에서 아티팩트로 바로 게시하는 경로
- [ ] Knot의 API 호출 방식(fetch인지 axios인지)과 서버 상태 라이브러리
- [ ] Knot webpack svgr 옵션을 Vite로 옮겼을 때 아이콘 결과가 같은지
- [ ] React Cosmos, Ladle에 단일 파일 빌드를 붙일 수 있는지
