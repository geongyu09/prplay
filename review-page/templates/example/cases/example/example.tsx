// /review-page 처음 설정(init)이 만든 예시 PR 폴더의 케이스. `node .claude/skills/review-page/src/cli.ts build example`로 빌드한다
import { defineCase } from "review-kit";

import Example from "../../Example";

export default defineCase({
  title: "Example",
  sources: ["review/Example.tsx"],
  props: { greeting: "안녕하세요", count: 0, tone: "calm" as "calm" | "loud", disabled: false },
  render: (props, actions) => <Example {...props} {...actions} />,
  presets: {
    "빈 인사말": { greeting: "" },
    "아주 긴 인사말": { greeting: "처음 오신 분을 위한 아주 긴 인사말이 한 줄을 넘어가면 어떻게 보이는지 확인합니다" },
    "큰 숫자": { count: 999 },
    비활성: { disabled: true },
  },
  impacts: [],
});
