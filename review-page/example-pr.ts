// PR 개요(pr.ts) 예시 (Knot PR #366). PR 폴더마다 하나 두고, 결과 HTML의 개요 탭이 된다
import { definePr } from "review-kit";

export default definePr({
  title: "[FE] 문서 경로·문서 넘기기 컨트롤 구현",
  summary: "문서 경로 Breadcrumb과 문서 넘기기 Stepper를 공용 컴포넌트로 추가한다.",
  context: {
    problem: ["문서 위치를 보여 주거나 여러 문서를 넘겨 볼 방법이 없었다."],
    basics: ["primitives 컴포넌트는 props만 그리고, 상태는 쓰는 화면이 들고 있다."],
    decisions: [
      {
        choice: "\"문서\"를 박아 두지 않고 parent prop으로 받는다.",
        why: "문서가 아닌 화면에서도 같은 Breadcrumb을 쓰기 위해서다.",
      },
      {
        choice: "Breadcrumb은 표시 전용이라 링크 없이 div로 그린다.",
        why: "이번 화면에서는 위 단계로 이동하는 동작이 없다.",
      },
      { choice: "Stepper의 current는 1부터 센다.", why: "화면에 보이는 `2 / 3`과 값을 맞추기 위해서다." },
    ],
    scope: {
      does: ["Breadcrumb과 Stepper 공용 컴포넌트를 추가한다."],
      doesNot: [],
    },
  },
  intuition: {
    idea: "두 컴포넌트는 그리기만 하고, 순서나 제목 같은 상태는 화면이 든다.",
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
        title: "Stepper가 버튼 막힘을 계산한다",
        files: ["src/shared/components/primitives/ui/Stepper/index.tsx"],
        explain: "Stepper는 current와 total로 양 끝인지 계산해 버튼을 막고, 순서 변경은 onPrev, onNext로 화면에 넘긴다.",
        snippet: `const isFirst = current <= 1;
const isLast = current >= total;`,
      },
      {
        role: "core",
        title: "Breadcrumb이 지금 항목만 줄인다",
        files: ["src/shared/components/primitives/ui/Breadcrumb/index.tsx"],
        explain: "바깥 상자에 min-width: 0을 줘서 긴 제목이 줄을 넓히지 않고 지금 항목만 말줄임되게 한다.",
        snippet: `const Container = styled.div\`
  max-width: 100%;
  min-width: 0;
\`;`,
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
