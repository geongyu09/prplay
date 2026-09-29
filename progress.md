# 진행 상황

- Knot 경로: /Users/baggeongyu/Documents/Coding/woowacourse/project/2026-Knot (프런트엔드: frontend/)
- 빌드 대상: Knot 복사본(scratchpad에 clone). 스킬 폴더(`review-page/`)를 `.claude/skills/review-page/`로 복사하고 `targets/knot/` 파일을 둬서 `node .claude/skills/review-page/src/cli.ts build <케이스>`로 빌드한다(plan.md 11.4). PR #366 worktree의 `review-kit` 링크 설정은 치웠다
- 코드 위치: 이 저장소(prplay). Knot에는 쓰지 않는다 (plan.md 13장 '작업 위치')
- (이전 기록) 스파이크를 처음 만든 곳, 2026-09-27 prplay로 옮김: /Users/baggeongyu/Documents/Coding/woowacourse/project/2026-Knot-pr366/frontend (PR #366을 `review-spike/pr-366` 브랜치 worktree로 받음. develop 작업 트리는 건드리지 않음)
- 시작일: 2026-09-27

## 1단계. 스파이크
- [x] 1.1 Knot 구조 조사 (결과는 plan.md 2.3 표)
- [x] 1.2 prplay package.json과 Vite 의존성 설치
- [x] 1.3 src/build/build.ts
- [x] 1.4 svgr·define·babel 설정 맞추기
- [x] 1.5 최소 shell (Provider, Error Boundary)
- [x] 1.6 케이스 두 개 (Stepper, Breadcrumb)
- [x] 1.7 단일 HTML 빌드와 file:// 확인
- [x] 1.8 아티팩트 업로드와 미확인 항목 확인
- [x] 1.9 (선택) Cosmos·Ladle 단일 파일 빌드 가능 여부

## 2단계. props 컨트롤
- [x] 2.1 react-docgen 주입
- [x] 2.2 타입별 컨트롤
- [x] 2.3 함수 호출 기록 패널
- [x] 2.4 프리셋
- [x] 2.5 key 교체로 다시 마운트
- [x] 2.6 localStorage 저장, JSON 복사/붙여넣기, 초기화
- [x] 2.7 폭 조절과 CSS 격리

## 3단계. 네트워크 모킹
- [x] 3.1 startMocking (interceptors + getResponse)
- [x] 3.2 요청 기록 패널
- [x] 3.3 페이지 케이스와 시나리오 4개
- [x] 3.4 시나리오 편집 UI (CodeMirror 6)
- [x] 3.5 적용 시 QueryClient 새로 만들기
- [x] 3.6 기존 MSW 핸들러 재사용
- [x] 3.7 시나리오 localStorage 저장

## 4단계. 코드 패널
- [x] 4.1 sourcesModule (소스, diff, SHA 링크)
- [x] 4.2 탭 UI
- [x] 4.3 문법 강조 선택과 크기 비교
- [x] 4.4 GitHub 링크 열기 또는 복사
- [x] 4.5 decisions, impacts와 영향 범위 스크립트

## 5단계. 스킬
- [x] 5.1 review-page SKILL.md
- [x] 5.2 example-case 두 개
- [x] 5.3 엣지 케이스·시나리오 규칙
- [x] 5.4 검증 단계
- [x] 5.5 (선택) Playwright 스모크 테스트
- [x] 5.6 다른 PR 두세 개로 다듬기

## 6단계. 스킬로 묶기
- [x] 6.1 스킬 폴더 구성
- [x] 6.2 defineConfig와 review-kit 이름 풀기
- [x] 6.3 CLI (build, dev, init)
- [x] 6.4 스킬 폴더 의존성과 자동 설치
- [x] 6.5 Knot 적용과 처음 설정 단계
- [x] 6.6 README

## 7단계. PR 하나에 HTML 하나
- [x] 7.1 ReviewPr·definePr, 케이스 decisions 제거
- [x] 7.2 PR 폴더 빌드와 virtual:review-cases
- [x] 7.3 맨 위 탭과 개요 탭
- [x] 7.4 스모크 테스트 탭 순회
- [x] 7.5 스킬·예시·init·targets를 PR 폴더로
- [x] 7.6 Knot 확인과 README

## 8단계. 플러그인 출시
- [x] 8.1 플러그인 환경 확인 스파이크
- [ ] 8.2 저장소·플러그인 구성과 validate
- [ ] 8.3 의존성을 CLAUDE_PLUGIN_DATA에 설치
- [ ] 8.4 review-kit.d.ts와 init 안내
- [ ] 8.5 SKILL.md 호출 이름·명령
- [ ] 8.6 Knot·빈 프로젝트 적용과 업데이트 확인
- [ ] 8.7 README
- [ ] 8.8 GitHub 공개와 디렉터리 제출

## 확인 항목 (plan.md 14장)
- [x] 아티팩트 파일 크기 상한 → 16MB(data: URI 포함), 12.6MB 게시 성공
- [x] 아티팩트에서 외부 이미지와 폰트 로딩이 막히는지 → 막힘(Google Fonts CSS·일부 CDN 스크립트만 허용)
- [x] 부모 URL hash가 iframe으로 전달되는지 → 단순 #anchor만, #key=value·쿼리는 안 됨
- [x] 아티팩트 iframe에서 window.open과 새 창 링크가 동작하는지 → window.open 대부분 null, <a target=_blank>는 동작
- [x] 로그인하지 않은 사람의 아티팩트 열람 가능 여부 → 기본 비공개, Share 메뉴로 공개 가능(로그아웃 실제 확인은 남음)
- [x] Claude Code에서 아티팩트로 바로 게시하는 경로 → Artifact 도구, 같은 경로 재게시 시 링크 유지
- [x] Knot의 API 호출 방식과 서버 상태 라이브러리 → axios(SSE만 fetch), TanStack Query v5
- [x] Knot webpack svgr 옵션을 Vite로 옮겼을 때 아이콘 결과가 같은지 → 같다(size·aria-hidden·focusable·viewBox)
- [x] React Cosmos, Ladle에 단일 파일 빌드를 붙일 수 있는지 → Ladle 가능(479KB)·Cosmos 직접 합쳐야 가능, 둘 다 ?쿼리+pushState 라우팅이라 직접 만들기 유지
- [x] CLAUDE_PLUGIN_DATA가 Bash 환경에 들어오는지, SKILL.md 본문 변수 치환 → 본문은 치환, Bash·! 환경엔 없음(--data로 넘김)
- [x] 캐시 경로에서 allowed-tools 패턴 일치 → 일치(로컬 폴더 마켓플레이스는 원본에서 실행)
- [x] 심볼릭 링크 node_modules에서 Node·Vite 패키지 탐색 → 찾음, build 366 바이트 동일
- [ ] Anthropic 디렉터리 제출 요구 사항과 심사 기간

## 단계 완료
- 2단계 2026-09-27 (완료 기준 4개 file://에서 확인, 아티팩트 게시는 아직)
- 3단계 2026-09-29 (사용자가 아티팩트에서 워크스페이스 홈 네 시나리오 전환 확인)
- 4단계 2026-09-29 (4케이스 소스·diff 표시, SHA 링크, 강조 후 크기 기록. Playwright file:// 확인)
- 5단계 2026-09-29 (처음 보는 PR 3개에서 스킬 한 번으로 빌드·스모크 통과, src 변경 없음, decisions 5개 이하. 에이전트가 사람 대신 돌렸고, 생성된 케이스를 사람이 검토해 규칙에 반영하는 일은 남음)
- (이전 방식) 6단계 라이브러리 분리 2026-09-29 (src에 Knot 전용 내용 없음, 기존 4케이스 스모크 통과, 빈 Vite+React에서 pack 설치→init→예시 빌드 1005KB)
- 6단계 방향 변경 2026-09-29: 사용자 결정으로 npm 패키지 대신 스킬 폴더 하나로 묶는다(plan.md 11장). 스파이크: 스킬 폴더만 복사한 Knot 복사본에서 기존 4케이스 빌드·스모크·tsc 통과, 빈 Vite+React에서 예시 1006KB. 차이는 lockfile 없이 설치한 CodeMirror 버전뿐

- 6단계 2026-09-29 (스킬 폴더만 복사한 Knot 복사본: npm ci 자동 설치 후 4케이스 빌드 결과가 스파이크 결과와 바이트 단위로 같음, 스모크·tsc 통과, dev 서버 응답. 빈 Vite+React: init → 예시 1006KB, 스모크·tsc 통과, package.json 그대로. prplay 루트에 npm 배포 설정·dist 없음)
- 7단계 2026-09-29 (Knot 복사본: `build 366` HTML 하나에 개요·Breadcrumb·Stepper 탭, 개요에 요약·바뀐 점·결정·리뷰 포인트·플레이그라운드 목록 표시(스크린샷 확인), 케이스 decisions 없음, 366·button·workspace-home·example 스모크·tsc 통과, dev 서버 응답. 아티팩트 게시 확인은 남음)

## 막힌 점

## 작업 기록
- 2026-09-27 1.1 Knot 구조 조사: Emotion·Vite 8(oxc)·axios·TanStack Query·react-router 8 확인, plan.md 2.2/2.3 갱신. #365는 이슈이고 PR은 #366(미머지)
- 2026-09-27 1.8(진행 중) 점검 페이지를 Artifact 도구로 게시, 확인 항목 6개를 plan.md 1.1 표·7장·8장·14장에 반영. 케이스 빌드 결과 업로드는 1.7 이후
- 2026-09-27 1.2 worktree에 review/ 생성, vite 8.2.2·vite-plugin-singlefile 2.3.3·pretendard 1.3.9 추가 (vite-plugin-svgr 5.2는 기존)
- 2026-09-27 1.3~1.4 review/build.ts: virtual:review-case, alias, dedupe(React·Emotion), oxc jsx(Emotion), webpack svgr 옵션(svgo 포함), define
- 2026-09-27 1.5~1.6 review/shell(Providers·ErrorBoundary·Pretendard 인라인)과 cases/365.tsx(Stepper Harness), cases/365-breadcrumb.tsx
- 2026-09-27 1.7 review-365.html·review-365-breadcrumb.html 각 2.9MB 단일 파일. Chrome file://에서 콘솔 오류·외부 요청 0, Stepper 이전/다음·비활성 동작, Knot tsc 통과
- 2026-09-27 1.8(진행 중) 1.7 빌드 결과 두 개(각 2.9MB, 외부 요청 없음)를 Artifact 도구로 게시. 아티팩트 안 렌더링 확인만 남음
- 2026-09-27 1.8 사용자가 아티팩트에서 Stepper·Breadcrumb 확인: 콘솔 오류 없음, 이전/다음 버튼 동작. 아이콘 크기는 file:// 확인(1.7) 기준
- 2026-09-27 1.9 Ladle 5.1.1·Cosmos 7.4 단일 파일 빌드 스파이크(scratchpad). 라우팅이 쿼리+pushState라 아티팩트 제약과 맞지 않아 직접 만들기 유지, plan.md 12장·14장 반영
- 2026-09-27 3.1 review/shell/mock/startMocking.ts(@mswjs/interceptors 0.41.9 추가). Chrome file://·http에서 axios·fetch 가로채기, 501+주소, 지연·500·라우트 변경 반영 확인, tsc 통과. shell 연결은 2단계 뒤. plan.md 6.1 import 예시 수정
- 2026-09-27 작업 위치 변경: worktree의 review/ 코드를 prplay로 옮김(src/build, src/runtime, targets/knot). Knot은 KNOT_DIR로 참조만 하고, react·emotion·tanstack·react-router·msw는 Knot node_modules에서 가져옴. prplay에서 두 케이스 빌드 결과가 이전과 같음(file://: 콘솔 오류·외부 요청 0, Stepper 버튼, 아이콘 14/12px). tsc는 2단계 진행 중인 main.tsx 1건만 남음. plan.md 13장, 로드맵 SKILL.md·phases.md·템플릿 수정
- 2026-09-27 2.1 react-docgen 8로 sources 첫 파일 props를 virtual:review-props로 주입 (TS 7은 JS API가 없어 react-docgen-typescript 대신, 사용자 승인)
- 2026-09-27 2.2~2.3 타입별 컨트롤(string·number·boolean·select·JSON)과 호출 기록 패널. 함수 props 로거는 render 두 번째 인자 actions로 전달
- 2026-09-27 2.4~2.6 프리셋, props 변경 시 key로 다시 마운트(QueryClient 새로 생성), localStorage `review-kit:{PR}:{케이스}` 저장·JSON 복사/붙여넣기·화면 안 확인 초기화
- 2026-09-27 2.7 폭 슬라이더(240~1280px), 리뷰 화면 Shadow DOM + 미리보기 slot 격리. Chrome file://에서 완료 기준 4개와 에러 경계 복구 확인, tsc 통과
- 2026-09-27 3.2 startMocking을 main.tsx에 연결(첫 시나리오), 요청 기록 패널(mock/RequestLog.tsx, requestStore.ts). Chrome file://에서 Knot axios 요청 200·지연, 목 없는 요청 501 빨간 표시 확인. msw·interceptors가 들어가 HTML 2.9MB → 3.3MB. plan.md 6.1에 구현 방식 추가
- 2026-09-27 3.3 targets/knot/cases/workspace-home.tsx(워크스페이스 홈, initialPath /workspace/1). 시나리오 정상·빈 상태(노션 미연결, 초대 201)·로딩 2000ms·500 에러, body는 Knot DTO Raw 타입으로 satisfies. 시나리오별 임시 빌드로 Chrome file:// 확인(목 누락 0, 콘솔 오류 0). 시나리오 전환 UI는 3.4. plan.md 4.1에 인증·CSRF 메모
- 2026-09-27 6.1~6.2·6.5 (3단계 도중 사용자 요청) prplay를 review-kit 패키지로(src/index.ts defineCase·defineConfig, src/build/config.ts·vite.ts·build.ts·dev.ts, src/cli.ts). targets/knot → review.config.ts + review/Wrapper.tsx + review/cases/. Knot pr366 worktree에 link: 연결 후 `review:build` 3케이스(3.3MB 안팎, file:// 콘솔 오류 0)와 `review:dev`(localhost:5173, 케이스 수정 HMR 반영) 확인. prplay·Knot tsc 통과. 6.3은 build·dev만(init 남음), 6.4 dist 컴파일 남음
- 2026-09-27 3.4·3.5 시나리오 패널(mock/ScenarioPanel.tsx, JsonEditor.tsx=CodeMirror 6 lang-json·lint, basicSetup 없이). 버튼 즉시 적용, 편집은 적용 버튼, 원래대로. 적용 시 renderKey로 다시 마운트해 새 QueryClient. 이전 시나리오의 늦은 응답은 기록 제외. workspace-home을 Chrome file://에서 4개 시나리오 전환·body 편집 반영·잘못된 JSON 적용 막힘·원래대로 확인. HTML 3.7MB
- 2026-09-27 3.6 review.config.ts mockHandlers → virtual:review-handlers, 시나리오 다음에 Knot 기존 핸들러, 없으면 501. 요청 기록에 '기존' 출처 표시. Chrome file://에서 /workspaces가 기존 핸들러로 200, /sse는 501 확인. worktree review.config.ts 동기화
- 2026-09-27 3.7 편집 시나리오를 { props, scenarios }에 저장(기본값과 다른 것만), JSON 복사/붙여넣기·초기화에 포함. Chrome file://에서 새로고침 유지, 새 브라우저에 붙여넣기 재현, 초기화 후 저장소 비움 확인
- 2026-09-27 결과 HTML <title>에 케이스 title 주입(vite.ts titleHtml, 'Review · {title}'). plan.md 10장에 규칙 추가
- 2026-09-27 주소 표시줄(사용자 요청, plan.md 4.1): wrapper에 address(report·connect)를 넘기고 Knot Wrapper의 AddressSync가 useLocation·useNavigate로 연결. 입력+Enter 이동, ↺ initialPath, 다시 마운트 시 보던 주소 유지. workspace-home dev에서 확인, tsc 통과
- 2026-09-27 단일 컴포넌트 케이스 targets/knot/review/cases/button.tsx(Button: select size·variant, boolean 3개, label은 children을 render에서 채움, 프리셋 6개) 추가, worktree에 복사. `review:build button` 3.7MB, Knot tsc 통과. 브라우저 확인은 남음(Chrome 확장 연결 안 됨). 상속 props(onClick)는 docgen이 못 풀어 호출 기록에 안 남음
- 2026-09-27 4.1~4.2 sourcesModule(virtual:review-sources: 파일 내용, git diff baseBranch...HEAD, SHA 링크에 show-prefix 붙임)과 미리보기 아래 CodePanel(소스·diff·결정·영향 범위 탭, 링크+복사 버튼). 결정 목록을 오른쪽 패널에서 탭으로 옮김. plan.md 3.3·8장에 구현 규칙 추가. 365·button 빌드 3.7MB, SHA 링크(frontend/ 포함)와 365 diff 주입 확인. 문법 강조는 4.3, 브라우저 화면 확인은 사용자 확인 필요
- 2026-09-29 4.3 prism-react-renderer 2.4.1 선택: 365 기준 강조 없음 3705KB → Prism 3789KB(+84) / Shiki 4.4.3 JS 엔진 4046KB(+341). Highlight.tsx(확장자별 언어, 줄 번호). plan.md 8장 기록
- 2026-09-29 4.4 파일 하나면 경로 자체가 SHA 링크, 여럿이면 "GitHub에서 보기". 링크 복사 실패 시 입력칸에 선택. plan.md 8장
- 2026-09-29 4.5 templates/review-page/scripts/find-impacts.sh(rg, 모듈 이름 기준). Button impacts 13개 채움. 버그 수정: sources 경로에 `]`(`[workspaceId]`)가 있으면 readSources가 비던 문제 → 문자열 리터럴 단위로 읽음. 4케이스 코드 패널 Playwright(file://) 확인
- 2026-09-29 5.1~5.4 templates/review-page/SKILL.md(PR 정보 !명령, 케이스 이름 규칙, props·Harness·프리셋 엣지 표·시나리오·decisions 규칙, tsc→build→smoke 3회 규칙), example-component.tsx(Button+Stepper Harness), example-page.tsx(워크스페이스 홈). plan.md 9.2에 구현 차이 기록
- 2026-09-29 5.5 scripts/smoke.mjs: 프로젝트 playwright 사용(없으면 건너뜀, 브라우저 없으면 설치된 Chrome). 첫 화면·프리셋·시나리오마다 렌더링 오류·pageerror·콘솔 error·외부 요청 실패, 501은 경고. 4케이스 통과, 일부러 깨뜨린 케이스는 실패로 잡음. plan.md 9.4
- 2026-09-29 6.3 review-kit init(설정·스킬·예시 케이스 생성, 있으면 건너뜀, --force). 6.4 tsconfig.build.json → dist/, publishConfig로 배포 시 bin·exports를 dist로, files 지정. pnpm pack tgz를 빈 Vite+React(react-ts 템플릿, msw 3.0.0) 프로젝트에 설치 → init → build example 3685KB → smoke 통과. plan.md 11.1·11.3
- 2026-09-29 빌드 크기 경고(14MB 경고, 16MB 초과 알림, plan.md 1.1). 6.6 README.md
- 2026-09-29 폰트 분리(사용자 결정): review.config.ts `styles` → virtual:review-styles, review-kit에서 pretendard·fonts.css 제거, targets/knot/review/fonts.css + PR #366 worktree devDependency pretendard 1.3.9. Knot 결과 크기 그대로(3.8MB), 빈 프로젝트 예시 3685KB → 1005KB. plan.md 2.3·11.2·11.4·13장
- 2026-09-29 5.6 scratchpad Knot 클론의 #362·#368·#346에서 에이전트가 SKILL.md만 보고 실행: 모두 첫 시도에 tsc·build·smoke 통과(케이스 4개). 보고된 모호한 점을 SKILL.md 규칙에 반영(plan.md 9.2). 도구 수정: 핸들러 IMPORT_IS_UNDEFINED 경고 제거(Reflect.get), "use client" 경고 숨김, 스모크가 누른 프리셋·시나리오 수 출력
- 2026-09-29 3단계 막힌 점 해소: 사용자가 아티팩트(E37LfUYuyNtpjLa5yAoYN9)에서 시나리오 전환 시 화면이 바뀌는 것을 확인
- 2026-09-29 6.1~6.4 스킬 폴더 review-page/에 package.json·package-lock.json(CodeMirror 등 버전이 이전 pnpm과 같음) 추가, cli.ts가 lockfile 해시로 npm ci. prplay 루트 package.json은 타입 검사 도구만(bin·exports·publishConfig·런타임 의존성 제거), pnpm-workspace.yaml·dist 제거, tsconfig를 review-page/src로
- 2026-09-29 6.5 scratchpad Knot 복사본에 스킬 폴더·targets/knot 복사: 4케이스 빌드(3.8MB 안팎)·스모크·tsc·dev 서버 확인. 빈 Vite+React에서 init → build example 1006KB → 스모크·tsc 통과
- 2026-09-29 6.6 README를 스킬 복사·처음 설정·node cli.ts 명령 기준으로 다시 씀(styles 설정 추가)
- 2026-09-29 7.1~7.6 PR 하나에 HTML 하나(사용자 결정, plan.md 3.4): PR 폴더 `review/cases/<PR번호>/`(pr.ts + 대상별 케이스), `definePr`, `virtual:review-cases`(케이스·props·소스 묶음, pr, meta), 맨 위 탭과 개요 탭(Overview.tsx), 플레이그라운드를 Playground.tsx로 분리(탭 전환 시 activateCase로 라우트 교체), 케이스별 저장 키, 코드 패널 결정 탭 제거, 스모크 탭 순회. targets 365 → 366 폴더(PR번호), button에 pr.ts, 스킬·예시(example-pr.ts)·init 템플릿·README 갱신
- 2026-09-29 방향 변경(사용자 결정): 플러그인 마켓플레이스 출시가 최종 목표. 플러그인 이름 prplay(`/prplay:review-page`), 스킬 폴더 복사 방식 폐지, tsc용 `review/review-kit.d.ts`, 의존성은 `${CLAUDE_PLUGIN_DATA}`에 설치, 자체 마켓플레이스 후 디렉터리 제출. plan.md 9.1·11·13·14장, phases.md 8단계 추가
- 2026-09-29 8.1 scratchpad 빈 플러그인(spike)을 기본 권한 모드 `claude -p`로 확인: 본문 `${CLAUDE_SKILL_DIR}`·`${CLAUDE_PLUGIN_ROOT}`·`${CLAUDE_PLUGIN_DATA}` 치환됨, Bash·`!` 환경엔 세 변수 없음, `!` 안 `$VAR`는 simple_expansion으로 막힘(`$ARGUMENTS`는 됨), `allowed-tools` `*` 패턴이 캐시 경로와 맞음, directory 마켓플레이스는 원본 폴더에서 실행(캐시 확인은 file:// git 소스). 링크 node_modules로 Knot 복사본 build 366 바이트 동일·스모크·dev 정상. plan.md 11장·11.1·11.3·11.4·14장, phases.md 8.3·8.6 반영. 스파이크 플러그인은 제거
- 2026-09-29 개요 탭 설명 보강(사용자 요청, plan.md 0장·3.1·3.4·9.2): ReviewPr에 background(basics 접힘·context)·intuition(idea + flow/compare 예시 그림)·codeWalk(단계별 설명·snippet) 추가, Overview.tsx·shell.css(좁은 화면은 세로 배치), SKILL.md 'PR 개요' 규칙, example-pr.ts·targets/knot 366 pr.ts. scratchpad Knot #366 복사본에서 build 3800KB·스모크 통과, 1200px·390px 화면 확인
- 2026-09-29 개요 탭 구조 그림(사용자 결정, plan.md 0장·3.1·3.4·9.2): ReviewPr에 diagrams(caption + 직접 쓴 SVG, Mermaid 금지) 추가, Overview.tsx '구조' 섹션(script·foreignObject·on*·바깥 href 제거, 못 읽으면 안내 문구), shell.css rv-d-* 클래스, SKILL.md 그림 규칙, example-pr.ts·targets/knot 366 pr.ts 예시. scratchpad Knot 복사본 build 366(3801KB)·스모크 통과, 1200px 화면 확인
- 2026-09-29 개요를 좋은 리뷰 7가지로 재구성(사용자 요청, plan.md 0장·3.1·3.4·9.2): ReviewPr를 revisions·context(problem·links·basics·decisions{choice,why,rejected}·scope)·guide(changes·readingOrder{role}·focus·skim)·evidence(tests·manual·ci)·previews·size·risk로 바꾸고, 빌드가 meta에 파일·줄 수와 커밋 목록을 넣는다. 섹션 7(must/nit/question)은 고정 문구. SKILL.md 'PR 개요' 규칙(gh pr checks, 리뷰 기록 읽기), Overview.tsx·shell.css, example-pr.ts·템플릿·targets/knot(366, button)·README 갱신. scratchpad Knot 복사본에서 tsc·366/button/workspace-home 빌드·스모크 통과, 1200px 화면 확인
