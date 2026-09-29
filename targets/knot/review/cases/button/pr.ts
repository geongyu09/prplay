import { definePr } from "review-kit";

// PR 번호가 없는 단일 컴포넌트 예시 케이스
export default definePr({
  title: "Button 로딩·비활성 상태",
  summary: "공용 Button의 크기·변형과 로딩·비활성 상태를 한 화면에서 확인하는 케이스다.",
  context: {
    problem: ["Button의 크기·변형과 로딩·비활성 상태를 한 화면에서 볼 곳이 없었다."],
    decisions: [
      {
        choice: "로딩이면 disabled도 함께 걸고, 둘 다 참이면 로딩 모양을 그린다.",
        why: "로딩 중에 다시 눌러 요청이 두 번 가는 일을 막는다.",
      },
      {
        choice: "로딩 중에도 라벨을 opacity 0으로 남긴다.",
        why: "버튼 너비와 스크린리더 이름을 유지한다.",
      },
      { choice: "높이는 height가 아니라 padding으로 만든다.", why: "글자 크기가 바뀌어도 버튼이 늘어난다." },
    ],
    scope: { does: ["Button 상태를 확인하는 케이스를 둔다."], doesNot: [] },
  },
  guide: {
    changes: [
      "Button이 isLoading일 때 라벨 자리에 로딩 모양을 그린다.",
      "Button이 size와 variant 조합에 따라 패딩과 색을 바꾼다.",
    ],
    readingOrder: [],
    focus: ["'로딩과 비활성 함께' 프리셋에서 로딩 모양이 보이는지 봐 주세요."],
    skim: [],
  },
  evidence: { tests: [], manual: [], ci: [] },
  risk: { impact: [], compatibility: [], deploy: [], securityPerf: [] },
});
