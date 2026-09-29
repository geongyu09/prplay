import { useState } from "react";
import { defineCase, type Actions } from "review-kit";

import Stepper from "@/shared/components/primitives/ui/Stepper";

export default defineCase({
  title: "Stepper",
  sources: ["src/shared/components/primitives/ui/Stepper/index.tsx"],
  props: { total: 3 },
  render: ({ total }, actions) => <Harness total={total} actions={actions} />,
  presets: { "문서 1개": { total: 1 }, "문서 12개": { total: 12 } },
  decisions: [
    "current는 1부터 센 값을 받는다.",
    "순서 상태는 부모가 들고 Stepper는 onPrev, onNext만 알린다.",
  ],
  impacts: [],
});

// 제어 컴포넌트라 상태를 가진 Harness로 감싼다. 호출 기록에 남도록 actions도 부른다 (plan.md 3.2)
function Harness({ total, actions }: { total: number; actions: Actions }) {
  const [current, setCurrent] = useState(1);
  return (
    <Stepper
      current={current}
      total={total}
      onPrev={() => {
        setCurrent((c) => c - 1);
        actions.onPrev?.();
      }}
      onNext={() => {
        setCurrent((c) => c + 1);
        actions.onNext?.();
      }}
    />
  );
}
