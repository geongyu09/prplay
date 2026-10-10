// 예시 PR 폴더의 개요. 결과 HTML을 열면 처음 보이는 개요 탭에 들어간다 (plan.md 3.4)
import { definePr } from "review-kit";

export default definePr({
  title: "예시 컴포넌트 추가",
  summary: "리뷰 페이지가 어떻게 보이는지 확인하려고 만든 예시 PR 개요다.",
  context: {
    problem: ["리뷰 페이지를 처음 설정한 뒤 빌드가 되는지 확인할 예시가 필요했다."],
    decisions: [
      {
        question: "예시 개요에 결정을 몇 개 적나?",
        choice: "하나만 적는다.",
        why: "개요 모양만 보여 주면 된다.",
        code: ["Example"],
      },
    ],
    scope: { does: ["Example 컴포넌트를 추가한다."], doesNot: ["실제 화면에는 넣지 않는다."] },
  },
  guide: {
    changes: ["Example이 인사말과 숫자를 보여 준다."],
    readingOrder: [],
    focus: ["'아주 긴 인사말' 프리셋에서 줄바꿈 모양을 봐 주세요."],
    skim: [],
  },
  evidence: { tests: [], manual: [], ci: [] },
  risk: { impact: [], compatibility: [], deploy: [], securityPerf: [] },
});
