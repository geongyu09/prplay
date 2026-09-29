// 컴포넌트 케이스 예시 (Knot PR의 Button 케이스). import 경로와 타입은 대상 프로젝트 것으로 바꾼다
// 상태가 필요 없는 컴포넌트라 Harness 없이 바로 그린다.
// children(ReactNode)은 편집 대상이 아니므로 케이스 전용 label로 받아 render에서 채운다
import type { ButtonSize, ButtonVariant } from "@/shared/components/primitives/ui/Button";
import Button from "@/shared/components/primitives/ui/Button";
import { defineCase } from "review-kit";

export default defineCase({
  title: "Button",
  sources: ["src/shared/components/primitives/ui/Button/index.tsx"],
  props: {
    label: "문서 만들기",
    size: "md" as ButtonSize,
    variant: "filled" as ButtonVariant,
    isLoading: false,
    disabled: false,
    isFullWidth: false,
  },
  render: ({ label, ...props }, actions) => (
    <Button {...props} {...actions}>
      {label}
    </Button>
  ),
  // 스킬의 엣지 케이스 표: 문자열(빈 값·아주 긴 값), 상태 boolean(로딩·비활성·조합), 리터럴 유니온 조합
  presets: {
    "빈 라벨": { label: "" },
    로딩: { isLoading: true },
    비활성: { disabled: true },
    "로딩과 비활성 함께": { isLoading: true, disabled: true },
    "복사됨(accent)": { variant: "accent", size: "sm", label: "복사됨" },
    "outline 전체 폭": { variant: "outline", size: "lg", isFullWidth: true },
    "아주 긴 라벨": {
      label: "워크스페이스에 연결된 노션 페이지를 모두 다시 불러오기",
    },
  },
  // scripts/find-impacts.sh 결과에서 관계있는 파일만
  impacts: [
    "src/modules/features/auth/GithubLoginButton/index.tsx",
    "src/modules/features/workspace/WorkspaceCreateButton/index.tsx",
    "src/modules/features/workspace/WorkspaceJoinByCodeButton/index.tsx",
  ],
});

/*
제어 컴포넌트(부모가 상태를 들고 콜백만 받는 컴포넌트)는 상태를 가진 Harness로 감싼다.
콜백에서 상태를 바꾸고 actions 로거도 불러야 호출 기록에 남는다. (Knot PR #365 Stepper 케이스)

export default defineCase({
  title: "Stepper",
  sources: ["src/shared/components/primitives/ui/Stepper/index.tsx"],
  props: { total: 3 },
  render: ({ total }, actions) => <Harness total={total} actions={actions} />,
  presets: { "문서 1개": { total: 1 }, "문서 12개": { total: 12 } },
  impacts: [],
});

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
*/
