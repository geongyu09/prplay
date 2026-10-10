// PR 개요(pr.ts) 예시 (Knot PR #366). PR 폴더마다 하나 두고, 결과 HTML의 개요 탭이 된다
import { definePr } from "review-kit";

export default definePr({
  title: "[FE] 문서 경로·문서 넘기기 컨트롤 구현",
  summary: "문서 경로 Breadcrumb과 문서 넘기기 Stepper를 공용 컴포넌트로 추가한다.",
  context: {
    problem: ["문서 위치를 보여 주거나 여러 문서를 넘겨 볼 방법이 없었다."],
    basics: ["primitives 컴포넌트는 props만 그리고, 상태는 쓰는 화면이 들고 있다."],
    // 질문과 답은 코드 이름 없이 쓰고, 코드 이름은 code에만 모은다
    decisions: [
      {
        question: "여러 문서를 넘길 때 지금 몇 번째 문서인지는 누가 기억하나?",
        choice: "문서 화면이 기억하고, Stepper는 이전이나 다음 버튼이 눌렸다는 것만 화면에 알린다.",
        why: "공용 컴포넌트는 상태 없이 받은 값만 그린다는 규칙을 따르고, 순서를 쓰는 화면의 다른 부분과 한 곳에서 맞추기 위해서다.",
        code: ["current", "total", "onPrev", "onNext"],
      },
      {
        question: "경로 표시가 '문서'라는 말을 알아야 하나?",
        choice: "모른다. 위 단계 이름을 쓰는 화면이 넘겨 주고, Breadcrumb은 받은 두 이름을 그리기만 한다.",
        why: "문서가 아닌 화면에서도 같은 Breadcrumb을 쓰기 위해서다.",
        code: ["parent"],
      },
    ],
    scope: {
      does: ["Breadcrumb과 Stepper 공용 컴포넌트를 추가한다."],
      doesNot: [],
    },
  },
  intuition: {
    idea: "두 컴포넌트가 상태 없이 받은 값만 그리므로, 어느 화면에 붙여도 같은 모양과 동작으로 쓸 수 있다.",
    examples: [
      {
        kind: "compare",
        caption: "Breadcrumb 제목이 들어갈 칸보다 길 때",
        before: { label: "min-width 없음", data: "옆 버튼이 밀려난다" },
        after: { label: "min-width: 0", data: "문서 › 회원 탈퇴 정책과…  [버튼]" },
      },
    ],
  },
  diagrams: [
    {
      caption: "상태는 문서 화면이 들고, 두 컴포넌트는 props로 받아 그리기만 한다.",
      svg: `<svg viewBox="0 0 580 196" xmlns="http://www.w3.org/2000/svg" font-size="13">
  <defs>
    <marker id="d1-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="rv-d-arrow" d="M0 0 L10 5 L0 10 z"/>
    </marker>
  </defs>
  <rect class="rv-d-box" x="60" y="16" width="440" height="40" rx="6"/>
  <text x="280" y="41" text-anchor="middle">문서 화면 (상태: current, total, title)</text>
  <rect class="rv-d-accent" x="60" y="140" width="180" height="40" rx="6"/>
  <text x="150" y="165" text-anchor="middle">Breadcrumb</text>
  <rect class="rv-d-accent" x="320" y="140" width="180" height="40" rx="6"/>
  <text x="410" y="165" text-anchor="middle">Stepper</text>
  <line class="rv-d-line" x1="150" y1="56" x2="150" y2="138" marker-end="url(#d1-arrow)"/>
  <text class="rv-d-muted" x="160" y="102">parent, title</text>
  <line class="rv-d-line" x1="380" y1="56" x2="380" y2="138" marker-end="url(#d1-arrow)"/>
  <text class="rv-d-muted" x="372" y="102" text-anchor="end">current, total</text>
  <line class="rv-d-line" x1="450" y1="140" x2="450" y2="58" marker-end="url(#d1-arrow)"/>
  <text class="rv-d-muted" x="458" y="102">onPrev, onNext</text>
</svg>`,
    },
  ],
  guide: {
    changes: [
      "Breadcrumb은 `위 단계 › 지금 항목`을 보여 주고, 지금 항목만 말줄임된다.",
      "Stepper는 `2 / 3`과 이전, 다음 버튼을 보여 주고, 첫 문서와 마지막 문서에서 버튼을 막는다.",
    ],
    readingOrder: [
      {
        role: "core",
        title: "문서 화면이 순서를 들고 Stepper는 그리기만 한다",
        files: ["src/shared/components/primitives/ui/Stepper/index.tsx"],
        explain:
          "Stepper는 문서 화면이 여러 문서를 넘길 때 쓰는 공용 컴포넌트라, 화면에 보이는 `2 / 3`과 맞추려고 1부터 세는 `current`와 `onPrev`, `onNext` 콜백 모양이 Stepper를 쓸 화면들과의 약속이 된다.",
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
        title: "Breadcrumb은 위 단계 이름을 화면에서 받는다",
        files: ["src/shared/components/primitives/ui/Breadcrumb/index.tsx"],
        explain:
          "Breadcrumb은 문서 화면 위쪽에서 지금 문서가 어디에 속하는지 보여 주는데, 이동 동작 없이 표시만 해서 링크 없이 `div`로 그린다. 나중에 위 단계로 가는 링크가 필요해지면 props와 태그를 함께 바꿔야 한다.",
        snippet: `interface BreadcrumbProps {
  /** 위 단계 이름. 문서 화면에서는 \`문서\`예요. */
  parent: string;
  /** 지금 보고 있는 항목 이름. 길면 한 줄에서 말줄임해요. */
  current: string;
}`,
      },
      {
        role: "side",
        title: "양 끝 버튼 막기와 긴 제목 말줄임",
        files: [
          "src/shared/components/primitives/ui/Stepper/index.tsx",
          "src/shared/components/primitives/ui/Breadcrumb/index.tsx",
        ],
        explain:
          "Stepper는 첫 문서와 마지막 문서에서 버튼을 막고, Breadcrumb은 바깥 상자에 `min-width: 0`을 줘서 긴 제목이 옆 버튼을 밀지 않게 한다.",
        snippet: `const isFirst = current <= 1;
const isLast = current >= total;`,
      },
    ],
    focus: [
      "Breadcrumb '아주 긴 제목' 프리셋에서 제목만 말줄임되는지 봐 주세요.",
      "Stepper '문서 1개' 프리셋에서 두 버튼이 다 막히는지 봐 주세요.",
    ],
    skim: [],
  },
  evidence: {
    tests: [],
    manual: [],
    ci: [],
  },
  risk: {
    impact: ["새 공용 컴포넌트만 추가해서 기존 화면은 바뀌지 않는다."],
    compatibility: [],
    deploy: [],
    securityPerf: [],
  },
});
