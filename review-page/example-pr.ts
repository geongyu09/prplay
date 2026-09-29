// PR 개요(pr.ts) 예시 (Knot PR #366). PR 폴더마다 하나 두고, 결과 HTML의 개요 탭이 된다
import { definePr } from "review-kit";

export default definePr({
  title: "[FE] 문서 경로·문서 넘기기 컨트롤 구현",
  summary:
    "문서 화면 상단의 경로 Breadcrumb과 녹음 직후 확인 화면 하단 바의 문서 넘기기 Stepper를 공용 컴포넌트로 추가한다.",
  changes: [
    "Breadcrumb이 위 단계와 지금 항목, 두 단계를 화살표 아이콘으로 이어 보여 준다.",
    "Breadcrumb의 지금 항목은 자리가 모자라면 혼자 줄어들며 한 줄에서 말줄임된다.",
    "Stepper가 지금 순서와 전체 개수를 보여 주고, 이전·다음 버튼으로 넘긴다.",
    "Stepper는 첫 항목에서 이전 버튼을, 마지막 항목에서 다음 버튼을 막는다.",
  ],
  decisions: [
    "Breadcrumb은 \"문서\"를 안에 두지 않고 parent로 받아 primitives가 도메인 단어를 모르게 한다.",
    "Breadcrumb은 표시 전용이라 링크·hover가 없고 nav 대신 div를 쓴다.",
    "가로 flex 줄에서 버튼을 밀어내지 않도록 Breadcrumb 바깥 상자에 min-width: 0을 준다.",
    "Stepper의 current는 화면에 그대로 보여 주므로 1부터 센 값을 받는다.",
    "순서 상태는 부모가 들고 Stepper는 onPrev, onNext로 알리기만 한다.",
  ],
  reviewPoints: [
    "Breadcrumb '아주 긴 제목' 프리셋에서 폭을 줄였을 때 제목만 말줄임되는지 봐 주세요.",
    "Stepper '문서 1개' 프리셋에서 두 버튼이 모두 막힌 모양이 맞는지 봐 주세요.",
  ],
});
