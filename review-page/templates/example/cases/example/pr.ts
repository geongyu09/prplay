// 예시 PR 폴더의 개요. 결과 HTML을 열면 처음 보이는 개요 탭에 들어간다 (plan.md 3.4)
import { definePr } from "review-kit";

export default definePr({
  title: "예시 컴포넌트 추가",
  summary: "리뷰 페이지가 어떻게 보이는지 확인하려고 만든 예시 PR 개요다.",
  changes: ["Example이 인사말과 숫자를 보여 준다."],
  decisions: ["예시라서 결정은 하나만 적는다."],
  reviewPoints: ["'아주 긴 인사말' 프리셋에서 줄바꿈 모양을 봐 주세요."],
});
