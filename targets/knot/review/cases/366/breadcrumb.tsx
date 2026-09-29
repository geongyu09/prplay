import { defineCase } from "review-kit";

import Breadcrumb from "@/shared/components/primitives/ui/Breadcrumb";

export default defineCase({
  title: "Breadcrumb",
  sources: ["src/shared/components/primitives/ui/Breadcrumb/index.tsx"],
  props: { parent: "문서", current: "회원 탈퇴 정책" },
  render: (props) => <Breadcrumb {...props} />,
  presets: {
    "아주 긴 제목": {
      current: "회원 탈퇴 시 개인정보 보관 기간과 파기 절차에 대한 정책 정리 문서",
    },
    "빈 제목": { current: "" },
  },
  decisions: [
    "위치만 보여주므로 위 단계를 눌러도 이동하지 않는다.",
    "지금 항목은 폭을 넘으면 한 줄에서 말줄임한다.",
  ],
  impacts: [],
});
