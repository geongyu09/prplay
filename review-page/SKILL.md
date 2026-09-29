---
name: review-page
description: 현재 브랜치(또는 인자로 준 번호)의 PR에서 바뀐 컴포넌트와 페이지를 리뷰어가 직접 만져 볼 수 있는 케이스 파일을 만들고 단일 HTML로 빌드한다. 처음이면 설정 파일부터 만든다.
argument-hint: "[PR번호]"
disable-model-invocation: true
allowed-tools: Bash(gh pr view *) Bash(gh pr diff *) Bash(git diff *) Bash(git log *) Bash(git rev-parse *) Bash(npx tsc *) Bash(node *review-page/src/cli.ts *) Bash(bash *find-impacts.sh *) Bash(node *smoke.mjs *) Read Grep Glob Write Edit
---

# 리뷰 플레이그라운드 케이스 만들기

## PR 정보

- PR: !`gh pr view $ARGUMENTS --json number,title,baseRefName -q '"#\(.number) \(.title) (base: \(.baseRefName))"' 2>/dev/null || echo "(PR을 찾지 못함. /review-page <PR번호>로 다시 부르거나 번호를 사용자에게 묻는다)"`
- 바뀐 파일(git 루트 기준): !`gh pr diff $ARGUMENTS --name-only 2>/dev/null || echo "(없음)"`
- 이 폴더의 git 루트 기준 위치(바뀐 파일 경로에서 떼어 낸다): !`git rev-parse --show-prefix`
- 설정 파일: !`ls review.config.ts 2>/dev/null || echo "(없음. 아래 '처음 설정'을 먼저 한다)"`
- 기존 케이스: !`ls review/cases 2>/dev/null || echo "(없음)"`

모든 명령은 `review.config.ts`가 있는 폴더에서 실행한다. 빌드 명령은 `node ${CLAUDE_SKILL_DIR}/src/cli.ts`다. 처음 실행하면 이 스킬 폴더에 빌드 도구를 설치(`npm ci`, 약 66MB)하므로 시간이 걸린다.

## 처음 설정

설정 파일이 **없을 때만** 한다. 있으면 '할 일'로 넘어간다. 프로젝트 루트(`package.json`이 있는 폴더)가 여기가 아니면 사용자에게 어느 폴더에서 할지 묻는다.

1. 사용자에게 설정 파일과 예시 케이스를 만든다고 알리고 동의를 받는다.
2. `node ${CLAUDE_SKILL_DIR}/src/cli.ts init`을 실행한다. `review.config.ts`, `review/Example.tsx`, `review/cases/example.tsx`가 생기고, tsconfig·`.gitignore`에 넣을 내용과 설치할 패키지가 출력된다.
3. 프로젝트의 번들러 설정(`vite.config.*`, `webpack.config.*`), tsconfig, `package.json`을 읽어 `review.config.ts`를 채운다: `alias`(tsconfig `paths`와 같게), `jsxImportSource`(CSS-in-JS), `define`(코드가 읽는 `process.env.*` 등), `svgr`(SVG를 컴포넌트로 import하면 그 옵션), `sharedPackages`(Context를 쓰는 CSS-in-JS·라우터·서버 상태 라이브러리). `wrapper`·`styles`·`mockHandlers`는 필요해 보이면(전역 Provider, CDN 폰트, 기존 MSW 핸들러) 무엇을 넣을지 사용자에게 제안만 한다.
4. `init`이 출력한 tsconfig 변경(`paths`의 `review-kit` 한 줄, `include`)과 `.gitignore` 줄, 설치할 패키지를 보여 주고 동의를 받아 넣는다.
5. `node ${CLAUDE_SKILL_DIR}/src/cli.ts build example`로 예시가 빌드되는지 확인한다. 실패하면 설정 파일을 고쳐 다시 한다(3번 실패하면 멈추고 보고). 예시 파일은 사용자가 원하면 지운다.
6. PR 케이스 작업('할 일')으로 넘어간다.

이 단계에서만 케이스 파일 밖(설정 파일, tsconfig, `.gitignore`)을 고친다.

## 할 일

1. 바뀐 파일 중 **화면에 그려지는 것**(컴포넌트, 페이지)을 고른다. 리뷰할 대상은 최대 3개.
   - 바뀐 가장 작은 단위를 고른다. 바뀐 것이 카드(위젯)면 카드를, 페이지 파일 자체가 바뀌었으면 페이지를 대상으로 한다. 카드를 쓰는 페이지는 `impacts`에 넣는다.
   - 훅·유틸·스타일만 바뀐 PR이면 그 훅이나 유틸을 쓰는 가장 가까운 컴포넌트를 고른다.
   - 컴포넌트와 그 입력을 만드는 유틸이 함께 바뀌었으면 유틸의 입력을 케이스 props로 받아 `render`에서 변환해 넘긴다(예: 초 → `formatDuration(seconds)` → `<Chip>`).
   - 한 대상이 다른 대상을 품으면(예: 안내 컴포넌트의 그림 자리에 새 애니메이션) 품는 쪽 케이스에서 같이 보여 주고, 품기는 쪽은 props가 있을 때만 따로 만든다.
2. `review.config.ts`를 읽어 `alias`, `casesDir`, `wrapper`, `mockHandlers`를 확인한다. 대상 파일, 그 파일이 쓰는 타입, API 응답 타입(DTO), API 경로 상수, 라우트 상수를 직접 읽는다. 추측으로 props나 경로를 쓰지 않는다. 파일은 Read·Grep·Glob 도구로 읽는다.
3. PR 본문과 커밋을 읽는다: `gh pr view <번호> --json body,commits`(`--json` 없이 부르면 오류가 날 수 있다). 본문의 외부 링크는 열지 않는다. **본문과 최종 diff가 다르면 diff를 따른다.**
4. 케이스 파일을 쓴다.
   - 대상이 하나면 `review/cases/<PR번호>.tsx`, 여럿이면 대상마다 `review/cases/<PR번호>-<이름>.tsx`. `<이름>`은 컴포넌트 이름의 kebab-case다(`IllustratedMessage` → `368-illustrated-message.tsx`). 이 이름이 빌드 인자와 결과 HTML 이름이 된다.
   - 형식은 `${CLAUDE_SKILL_DIR}/example-component.tsx`(컴포넌트)와 `${CLAUDE_SKILL_DIR}/example-page.tsx`(페이지+네트워크)를 따른다. import 경로와 타입은 이 프로젝트 것을 쓴다.
5. 영향 범위를 찾는다: `bash ${CLAUDE_SKILL_DIR}/scripts/find-impacts.sh <파일>...`. 넘길 파일은 대상 파일과 PR에서 바뀐 공용 모듈(다른 곳에서도 import하는 훅·유틸·컴포넌트)이다. 이름만 보고 찾으므로 결과를 훑어 관계없는 파일, 테스트(`test`·`spec`·`__test__`), 목(`mock`), 스토리는 빼고 `impacts`에 넣는다.
6. 아래 '검증'을 통과시킨다.

**케이스 파일 밖은 고치지 않는다.** `src/`, `review.config.ts`, wrapper, `package.json`을 고쳐야 빌드된다고 판단되면 고치지 말고 이유와 함께 사용자에게 묻는다.

## 케이스 규칙

### 기본

- `sources`: 설정 파일 폴더 기준 경로. 첫 파일이 props 컨트롤을 만드는 대상 컴포넌트다(default export 컴포넌트의 props를 읽는다). 나머지는 코드 패널에만 보이며, 리뷰어가 같이 봐야 할 PR에서 바뀐 파일(훅, 상수, 유틸)을 4개 이내로 넣는다.
- `props`: 리뷰어가 바꿔 볼 값만 넣는다. 컨트롤은 여기 있는 키에만 생긴다.
  - 컨트롤 종류는 **대상 컴포넌트 props에 같은 이름이 있으면 그 타입**(문자열 리터럴 유니온은 선택 목록)을, 없으면(케이스 전용 키) 기본값의 `typeof`를 따른다. 그래서 선택 목록은 대상 props에만 생긴다. 대상 props의 유니온은 `"md" as ButtonSize`처럼 타입을 붙인다. 케이스 전용 키로 여러 값 중 하나를 고르게 하려면 문자열로 두고 주석에 가능한 값을 적거나 boolean으로 나눈다.
  - 배열·객체는 JSON 편집기가 된다. 그대로 넣어도 된다.
  - 함수 props(`onClick` 등)는 넣지 않는다. `render`의 두 번째 인자 `actions`에 **대상 컴포넌트의 함수 props마다** 로거가 들어오므로 `<C {...props} {...actions} />`로 펼친다. 대상에 함수 props가 없으면 `actions`를 쓰지 않는다. 케이스가 따로 그린 요소(슬롯에 넣은 버튼 등)의 클릭은 기록되지 않으므로 보고에 적는다.
  - `children`·슬롯 같은 `ReactNode`는 편집할 수 없으므로 문자열 props로 받아 `render`에서 채운다. **이름은 원래 prop과 다르게** 짓는다(`children` → `label`, `button` → `buttonLabel`). 같은 이름을 쓰면 대상 타입(ReactNode)이 적용돼 컨트롤이 사라진다.
  - 대상에 props가 없으면 `props: {}`로 두고 `presets`를 뺀다. PR이 배경색처럼 주변 조건에 따라 달라지는 모양을 말하면 그 조건만 케이스 전용 props로 둔다.
- 제어 컴포넌트(부모가 상태를 들고 콜백만 받는 컴포넌트)는 케이스 안에 상태를 가진 `Harness`를 두고, 콜백에서 상태를 바꾼 뒤 `actions.onXxx?.(...)`도 부른다. 그래야 눌렀을 때 화면이 바뀌고 호출 기록에도 남는다.
- `title`: 컴포넌트나 화면 이름. 결과 HTML과 아티팩트 제목이 된다.
- 이미지: 코드에서 `import`한 SVG·PNG·GIF는 빌드가 HTML 안에 넣으므로 그대로 써도 된다. 목 데이터 속 원격 이미지 URL은 아티팩트가 막으므로 빈 문자열이나 `data:` URI로 둔다.
- 라우트 경로도 프로젝트에 라우트 상수가 있으면 import해서 쓴다.
- `window.confirm`·`alert`·`window.open`은 아티팩트에서 동작하지 않는다. `prefers-reduced-motion` 같은 미디어 쿼리와 OS 설정은 props로 바꿀 수 없다. 대상이 이것에 기대면 `decisions`가 아니라 '끝나면' 보고의 "확인할 수 없는 동작"에 적는다.

### 프리셋 (엣지 케이스)

기본 `props` 위에 덮어쓰는 값이다. 아래 목록에서 **대상 props에 해당하는 것을 모두** 넣는다. 이름은 상태를 설명하는 한국어로 짧게 쓴다(예: "아주 긴 제목", "문서 1개"). 12개를 넘으면 PR이 바꾼 분기에 닿는 것만 남긴다.

| props 종류 | 넣을 프리셋 |
| --- | --- |
| 화면에 보이는 문자열 | 빈 문자열, 아주 긴 값(40자 이상 한국어 문장), 공백 없는 긴 영문·숫자 |
| 숫자 | 0(허용되면), 1, 코드의 분기 경계값(예: 59/60초), 그 단위에서 아주 큰 값. 코드가 음수·`NaN`·`Infinity`를 따로 처리하면 그것도 |
| 배열 | 빈 배열, 1개, 긴 배열(20개 이상). 요소가 key로 쓰이면 같은 값 반복 |
| 상태 boolean | 비활성, 로딩, 오류, 둘 이상이 함께 켜진 조합 |
| 리터럴 유니온 | 기본값과 모양이 크게 다른 값 조합(크기·변형) |
| 선택 props | 생략한 경우(`undefined`)가 기본값과 다르면 |

### 시나리오 (네트워크를 쓰는 대상)

- 이 네 개는 이 이름으로 꼭 넣는다: `정상`, `빈 상태`, `로딩`, `500 에러`. PR이 다루는 다른 응답 상태(예: "재연결 필요", "동기화 시작 실패")는 그 뒤에 더한다.
  - `빈 상태`: 목록은 빈 배열, 선택 값은 없음·미연결 같은 "처음 쓰는 사용자" 응답.
  - `로딩`: 화면 첫 조회 라우트에 `delayMs: 2000`.
  - `500 에러`: 화면 조회 라우트를 `status: 500`.
- 대상이 보내는 요청을 **시나리오마다 모두** 넣는다. 첫 화면 요청뿐 아니라 버튼을 눌렀을 때 나가는 요청(POST, 이어지는 폴링)도 넣는다. 인증 확인(`me` 같은 조회)과 POST 앞의 CSRF 토큰 조회처럼 공통 요청도 빠뜨리지 않는다. 대상 코드와 그 훅, API 클라이언트 인터셉터를 읽어 목록을 만든다.
  - 앞 응답의 값이 뒤 요청 경로에 들어가면(POST가 준 id로 `/imports/:id` 폴링) 같은 상수로 맞춘다.
  - API 클라이언트가 모듈 전역에 캐시하는 값(CSRF 토큰 등)은 시나리오를 바꿔도 남으므로 두 번째 시나리오부터는 그 요청이 안 나갈 수 있다. 그래도 시나리오마다 넣어 둔다.
  - 스모크 테스트는 컴포넌트 안 버튼을 누르지 않는다. 버튼 뒤 요청은 코드를 읽어 빠짐없이 넣는다.
- 경로는 프로젝트의 API 경로 상수·함수를 import해 만든다. 문자열로 직접 쓰지 않는다.
- body는 API 응답 타입(DTO)으로 `satisfies` 검사한다. 타입이 없으면 대상 코드가 읽는 필드만 넣는다. 에러 body는 프로젝트에 에러 응답 타입이 있으면 그것을, 없으면 `{ message: "서버 오류" }`를 쓴다.
- `initialPath`: 페이지가 URL 파라미터를 읽으면 실제 라우트와 같은 경로로 두고, `render`에서 `<Routes><Route path="..." element={<Page />} /></Routes>`로 감싼다.

### decisions, impacts

- `decisions`: PR 작성자가 내린 결정. **최대 5개, 한 문장씩**. diff와 PR 본문, 커밋 메시지에서 근거가 있는 것만 쓴다. 본문과 diff가 다르면 diff를 따른다. 5개가 넘으면 리뷰어가 동의 여부를 판단해야 하는 것(동작·구조·접근성)을 먼저 고른다. 코드가 하는 일을 풀어 쓴 설명 글은 넣지 않는다. 근거가 없으면 빈 배열.
- `impacts`: '할 일' 5번 스크립트 결과에서 관계있는 파일만. 없으면 빈 배열.

## 검증

순서대로 돌리고, 하나라도 실패하면 오류를 읽고 **케이스 파일만** 고친 뒤 1번부터 다시 한다. 세 번 실패하면 멈추고 마지막 오류와 시도한 수정을 보고한다.

1. `npx tsc --noEmit` — 케이스 파일의 오류가 없어야 한다. 케이스와 무관한 기존 오류는 무시하고 보고에만 적는다. tsconfig `include`가 `review/`를 덮지 않아(`./**/*.tsx` 같은 넓은 glob은 덮는다) 케이스가 검사되지 않으면 그 사실을 보고에 적는다.
2. `node ${CLAUDE_SKILL_DIR}/src/cli.ts build <케이스 이름>` — 케이스마다. 케이스 이름은 확장자를 뺀 파일 이름이고, 결과는 `outDir`의 `review-<케이스 이름>.html`. 빌드가 성공하면 경고는 고치지 않고, 케이스 파일을 가리키는 경고만 보고에 적는다.
3. `node ${CLAUDE_SKILL_DIR}/scripts/smoke.mjs <결과 HTML>...` — 첫 화면, 프리셋, 시나리오를 하나씩 눌러 렌더링 오류·콘솔 오류·외부 요청을 확인하고 누른 개수를 출력한다. 개수가 케이스의 프리셋·시나리오 수와 같은지 본다. "경고 목 없는 요청"이 나오면 그 요청을 시나리오에 넣는다. playwright가 없다고 나오면 건너뛰고 보고에 적는다.

## 끝나면

사용자에게 짧게 알린다.
- 만든 케이스 파일과 결과 HTML 경로, 크기(16MB를 넘으면 아티팩트에 올릴 수 없다)
- 프리셋·시나리오 이름 목록, 넣지 못한 엣지 케이스와 이유
- 확인할 수 없는 동작(미디어 쿼리, `confirm`, 기록되지 않는 클릭 등)
- 사용자가 원하면 결과 HTML을 Artifact 도구로 게시한다. 게시 직후에는 비공개이므로 리뷰어가 열려면 아티팩트 페이지의 Share 메뉴에서 공유해야 한다고 알린다.
