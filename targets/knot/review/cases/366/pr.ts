import { definePr } from "review-kit";

export default definePr({
  title: "[FE] 문서 경로·문서 넘기기 컨트롤 구현",
  summary:
    "녹음 직후 확인 화면에서 같은 녹음의 문서를 넘겨 보는 `Stepper`와 문서 화면 위쪽의 경로 `Breadcrumb`을, 화면을 조립하는 4단계 전에 공용 컴포넌트로 먼저 만든다.",
  context: {
    problem: [
      "상위 이슈 `#359`는 문서 화면과 홈 화면 21개를 만들기 전에 공통 UI를 먼저 만드는 작업이고, 이번 PR은 백엔드 API 계약을 기다리는 동안 만들 수 있는 컴포넌트 두 개를 떼어 낸 것이다.",
      "한 녹음에서 문서가 여러 개 나오면 사용자는 녹음 직후 확인 화면에서 문서를 하나씩 넘기며 확인하는데, 넘기는 컨트롤과 지금 문서의 위치를 보여 줄 컴포넌트가 없었다.",
    ],
    links: [
      { label: "#365 문서 경로·문서 넘기기 컨트롤", url: "https://github.com/woowacourse-teams/2026-Knot/issues/365" },
      { label: "#359 문서·홈 공통 컴포넌트", url: "https://github.com/woowacourse-teams/2026-Knot/issues/359" },
    ],
    basics: [
      "`src/shared/components/primitives`는 도메인을 모르는 공용 UI 모음이고, 상태 없이 props만 그리며 받은 값을 바꾸지 않는다는 규칙(`C-1-11`)을 따른다.",
      "문서 화면과 녹음 직후 확인 화면은 아직 라우트가 없고 4단계에서 조립하므로, 두 컴포넌트를 import하는 곳은 아직 없다.",
      "`chevronRight.svg`는 `SourceButton`과 `SidebarFolderRow`가 이미 12px로 쓰는 공용 아이콘이다.",
    ],
    decisions: [
      {
        question: "문서를 넘길 때 지금 몇 번째 문서인지는 누가 기억하나?",
        choice: "녹음 직후 확인 화면이 기억하고, `Stepper`는 이전이나 다음 버튼이 눌렸다는 것만 화면에 알린다.",
        why: "아래쪽 바의 `Stepper`와 본문이 같은 문서를 보여 줘야 하므로 순서를 화면 한 곳에서 들어야 한다.",
        code: ["current", "total", "onPrev", "onNext"],
      },
      {
        question: "문서 경로 표시를 어디까지 일반화하나?",
        choice: "위 단계 하나와 지금 항목의 2단으로 고정하고, 위 단계 이름은 쓰는 화면이 넘겨 준다.",
        why: "공용 컴포넌트 모음이 '문서' 같은 서비스 용어를 모르게 두기 위해서다.",
        rejected: "여러 단계를 배열로 받는 방식은 아직 쓸 곳이 없는 일반화라 만들지 않았다.",
        code: ["parent", "current"],
      },
    ],
    scope: {
      does: [
        "`Breadcrumb`과 `Stepper` 공용 컴포넌트를 추가한다.",
        "chevron 아이콘 두 개가 14px로 커져도 선 굵기를 1.5px로 유지하게 한다.",
        "PR 본문 스킬(`create-pr-content`)에 변경 단위 사이 구분선 규칙을 더한다.",
      ],
      doesNot: [
        "두 컴포넌트를 화면에 붙이는 일은 4단계 화면 조립에서 한다.",
        "상위 이슈의 나머지 상태 컴포넌트(`DocNotCreatedState`, `DraftingState`)는 후속 PR에서 만든다.",
        "접근성 속성(`aria-label` 등)은 MVP 범위에서 넣지 않기로 해서, 아이콘 버튼에 이름이 없다는 리뷰 지적(F-4)도 나중으로 미뤘다.",
      ],
    },
  },
  intuition: {
    idea: "두 컴포넌트는 받은 값만 그리므로, 4단계에서 어느 화면에 붙여도 같은 모양으로 쓸 수 있고 화면을 조립할 때는 값만 넘기면 된다.",
    examples: [
      {
        kind: "flow",
        caption: "녹음 직후 확인 화면에서 문서 3개 중 두 번째로 넘길 때(PR 본문의 사용 예시 기준)",
        steps: [
          { label: "화면 상태", data: "index: 0\ndocuments.length: 3" },
          { label: "Stepper에 넘김", data: "current: 1, total: 3\n이전 버튼 disabled" },
          { label: "다음 누름", data: "onNext()\nsetIndex(1)" },
          { label: "다시 그림", data: "current: 2, total: 3" },
        ],
      },
      {
        kind: "compare",
        caption: "240px 칸 안에서 Breadcrumb 오른쪽에 80px 버튼이 함께 있을 때(PR 본문 측정값)",
        before: { label: "min-width 없음", data: "Breadcrumb 238px\n버튼이 247px에서 시작해 칸 밖으로 나간다" },
        after: { label: "min-width: 0", data: "Breadcrumb 152px, 제목 말줄임\n버튼이 160px에서 시작한다" },
      },
    ],
  },
  diagrams: [
    {
      caption: "두 화면은 4단계에서 만들고, 화살표는 화면과 두 컴포넌트 사이를 오가는 값을 보여 준다.",
      svg: `<svg viewBox="0 0 600 196" xmlns="http://www.w3.org/2000/svg" font-size="13">
  <defs>
    <marker id="d1-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="rv-d-arrow" d="M0 0 L10 5 L0 10 z"/>
    </marker>
  </defs>
  <rect class="rv-d-box" x="20" y="16" width="240" height="40" rx="6" stroke-dasharray="4 4"/>
  <text x="140" y="41" text-anchor="middle">문서 화면 (4단계)</text>
  <rect class="rv-d-box" x="300" y="16" width="280" height="40" rx="6" stroke-dasharray="4 4"/>
  <text x="440" y="41" text-anchor="middle">녹음 직후 확인 화면 (index 상태)</text>
  <rect class="rv-d-accent" x="50" y="140" width="180" height="40" rx="6"/>
  <text x="140" y="165" text-anchor="middle">Breadcrumb</text>
  <rect class="rv-d-accent" x="350" y="140" width="180" height="40" rx="6"/>
  <text x="440" y="165" text-anchor="middle">Stepper</text>
  <line class="rv-d-line" x1="140" y1="56" x2="140" y2="138" marker-end="url(#d1-arrow)"/>
  <text class="rv-d-muted" x="150" y="102">parent, current</text>
  <line class="rv-d-line" x1="410" y1="56" x2="410" y2="138" marker-end="url(#d1-arrow)"/>
  <text class="rv-d-muted" x="402" y="102" text-anchor="end">current, total</text>
  <line class="rv-d-line" x1="480" y1="140" x2="480" y2="58" marker-end="url(#d1-arrow)"/>
  <text class="rv-d-muted" x="488" y="102">onPrev, onNext</text>
</svg>`,
    },
  ],
  guide: {
    changes: [
      "`Breadcrumb`은 `위 단계 › 지금 항목`을 보여 주고, 폭이 모자라면 지금 항목만 한 줄에서 말줄임된다.",
      "`Stepper`는 `1 / 3`과 이전, 다음 버튼을 보여 주고, 첫 문서와 마지막 문서에서 버튼을 `disabled`로 막는다.",
      "`Stepper`의 숫자는 고정폭으로 그려서 넘길 때 전체 폭이 흔들리지 않는다.",
      "chevron 아이콘은 14px로 키워도 선 굵기가 1.5px로 유지된다.",
      "PR 본문 스킬이 변경 단위 사이에 `---` 구분선을 넣는다.",
    ],
    readingOrder: [
      {
        role: "core",
        title: "녹음 직후 확인 화면이 순서를 들고 Stepper는 눌림만 알린다",
        files: ["src/shared/components/primitives/ui/Stepper/index.tsx"],
        explain:
          "`Stepper`는 4단계에서 녹음 직후 확인 화면의 하단 바에 붙으므로, 이 props 모양이 화면을 조립할 때 따라야 하는 약속이 된다. `current`는 화면에 그대로 보이는 값이라 1부터 세고, 받은 값을 바꾸지 않는다는 규칙(`C-1-11`)에 따라 0부터 세는 화면 상태에 `+ 1`을 하는 일은 쓰는 쪽이 맡는다.",
        snippet: `interface StepperProps {
  /** 지금 보고 있는 순서. 화면에 그대로 보여주므로 1부터 세요. */
  current: number;
  /** 전체 개수 */
  total: number;
  /** 이전 버튼을 눌렀을 때 실행할 동작 */
  onPrev: () => void;
  /** 다음 버튼을 눌렀을 때 실행할 동작 */
  onNext: () => void;
}`,
      },
      {
        role: "core",
        title: "Breadcrumb은 도메인 단어 없이 2단 경로만 그린다",
        files: ["src/shared/components/primitives/ui/Breadcrumb/index.tsx"],
        explain:
          "`Breadcrumb`은 문서 화면 위쪽에서 `문서 › 문서 제목`을 보여 준다. 링크와 hover가 없는 표시 전용이라 탐색 링크 모음이라는 뜻의 `nav` 대신 `div`로 그렸고, 위 단계로 이동하는 기능이 생기면 props와 태그를 함께 바꿔야 한다.",
        snippet: `interface BreadcrumbProps {
  /** 위 단계 이름. 문서 화면에서는 \`문서\`예요. */
  parent: string;
  /** 지금 보고 있는 항목 이름. 길면 한 줄에서 말줄임해요. */
  current: string;
}`,
      },
      {
        role: "core",
        title: "공용 chevron 아이콘이 커져도 선 굵기를 지킨다",
        files: ["src/assets/icons/chevronRight.svg", "src/assets/icons/chevronLeft.svg"],
        explain:
          "`chevronRight.svg`는 기존 `SourceButton`과 `SidebarFolderRow`도 쓰는 공용 아이콘이라, 선에 `vector-effect`를 붙이면 기존 화면에도 적용된다. 기본 글자 크기에서는 모양이 같고, 아이콘 크기를 `rem`으로 주는 곳에서 사용자가 브라우저 글자 크기를 키울 때만 선이 굵어지지 않고 1.5px로 유지된다.",
        snippet: `<path d="M4 2.5L8 6L4 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />`,
      },
      {
        role: "side",
        title: "양 끝 버튼 막기, 숫자 고정폭, 긴 제목 말줄임",
        files: [
          "src/shared/components/primitives/ui/Stepper/index.tsx",
          "src/shared/components/primitives/ui/Breadcrumb/index.tsx",
        ],
        explain:
          "`Stepper`는 `current`와 `total`로 피그마의 처음, 중간, 마지막 변형 중 무엇을 그릴지 고르고, `tabular-nums`로 숫자 폭을 맞춘다. `Breadcrumb`은 바깥 상자에 `min-width: 0`을 줘서 가로 flex 줄 안에서 옆 버튼을 밀어내지 않는다.",
        snippet: `const isFirst = current <= 1;
const isLast = current >= total;`,
      },
    ],
    focus: [
      "`Stepper`의 props 모양이 4단계에서 녹음 직후 확인 화면을 조립할 때 쓰기 편한지 판단해 주세요. Stepper 탭의 '문서 1개' 프리셋에서 두 버튼이 모두 막히는 모양을 볼 수 있습니다.",
      "`chevronRight.svg`의 `vector-effect` 변경이 `SourceButton`과 `SidebarFolderRow`에 주는 영향을 봐 주세요.",
      "PR 본문 스킬의 구분선 규칙은 FE 전원에게 적용되니 괜찮은지 의견 부탁드립니다.",
    ],
    skim: [
      "`src/assets/icons/chevronLeft.svg`는 피그마 원본에서 선 색만 `currentColor`로 바꾼 새 아이콘이다.",
      "`.claude/skills/create-pr-content/SKILL.md`는 PR 본문 형식 규칙이라 화면 동작과 관계없다.",
    ],
  },
  evidence: {
    tests: [],
    manual: [
      "`pnpm tsc`를 통과했다.",
      "커밋하지 않는 임시 화면에서 긴 제목 말줄임, 양 끝 `disabled`, 숫자 폭 고정을 확인했다.",
      "앱의 14px 화살표를 피그마가 내보낸 14px SVG와 픽셀 단위로 비교해 차이가 0이었다.",
    ],
    ci: [
      { name: "validate-delivery-metadata", state: "pass" },
      { name: "verify", state: "pass" },
      { name: "CodeRabbit", state: "pass" },
    ],
  },
  size: "화면 코드 변경에 PR 본문 스킬 변경(`create-pr-content`)이 섞여 있어, 스킬 파일은 따로 읽으면 된다.",
  risk: {
    impact: [
      "두 컴포넌트는 아직 쓰는 곳이 없어 기존 화면은 바뀌지 않는다.",
      "`chevronRight.svg`를 쓰는 `SourceButton`과 `SidebarFolderRow`는 브라우저 글자 크기를 키울 때 선 굵기가 1.5px로 유지된다.",
      "PR 본문 스킬 변경은 FE 전원의 PR 본문 형식에 적용된다.",
    ],
    compatibility: [],
    deploy: [],
    securityPerf: [],
  },
});
