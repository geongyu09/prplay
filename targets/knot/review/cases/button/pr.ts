import { definePr } from "review-kit";

// PR 번호가 없는 단일 컴포넌트 예시 케이스
export default definePr({
  title: "Button 로딩·비활성 상태",
  summary: "공용 Button의 크기·변형과 로딩·비활성 상태를 한 화면에서 확인하는 케이스다.",
  changes: [
    "Button이 isLoading일 때 라벨 자리에 로딩 모양을 그린다.",
    "Button이 size와 variant 조합에 따라 패딩과 색을 바꾼다.",
  ],
  decisions: [
    "로딩이면 disabled도 함께 걸고, 둘 다 참이면 로딩 모양을 그린다.",
    "로딩 중에도 라벨을 opacity 0으로 남겨 너비와 스크린리더 이름을 유지한다.",
    "높이는 height가 아니라 padding으로 만든다.",
  ],
  reviewPoints: ["'로딩과 비활성 함께' 프리셋에서 로딩 모양이 보이는지 봐 주세요."],
});
