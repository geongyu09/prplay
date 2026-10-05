import { definePr } from "review-kit";

// PR 번호가 없는 단일 컴포넌트 예시 케이스
export default definePr({
  title: "Button 로딩·비활성 상태",
  summary: "공용 Button의 크기, 변형과 로딩, 비활성 상태를 한 화면에서 확인하는 케이스다.",
  context: {
    problem: ["Button의 크기, 변형과 로딩, 비활성 상태를 한 화면에서 볼 곳이 없었다."],
    decisions: [
      {
        question: "로딩 중인 버튼을 다시 누를 수 있나?",
        choice: "누를 수 없다. 로딩이면 비활성도 함께 걸고, 둘 다 해당하면 로딩 모양을 그린다.",
        why: "로딩 중에 다시 눌러 요청이 두 번 가는 일을 막는다.",
        code: ["isLoading", "disabled"],
      },
      {
        question: "로딩 모양을 그리는 동안 버튼 글자는 어떻게 하나?",
        choice: "지우지 않고 보이지 않게만 해서 자리에 남긴다.",
        why: "버튼 너비와 스크린리더가 읽는 이름을 그대로 유지한다.",
      },
    ],
    scope: { does: ["Button 상태를 확인하는 케이스를 둔다."], doesNot: [] },
  },
  guide: {
    changes: [
      "Button이 isLoading일 때 라벨 자리에 로딩 모양을 그린다.",
      "Button이 size와 variant 조합에 따라 패딩과 색을 바꾸고, 높이를 패딩으로 만들어 글자 크기가 커지면 버튼도 함께 늘어난다.",
    ],
    readingOrder: [],
    focus: ["'로딩과 비활성 함께' 프리셋에서 로딩 모양이 보이는지 봐 주세요."],
    skim: [],
  },
  evidence: { tests: [], manual: [], ci: [] },
  risk: { impact: [], compatibility: [], deploy: [], securityPerf: [] },
});
