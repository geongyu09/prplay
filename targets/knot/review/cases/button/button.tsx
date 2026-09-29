import type { ButtonSize, ButtonVariant } from "@/shared/components/primitives/ui/Button";
import Button from "@/shared/components/primitives/ui/Button";
import { defineCase } from "review-kit";

// 상태가 필요 없는 컴포넌트라 Harness 없이 바로 그린다.
// children(ReactNode)은 편집 대상이 아니므로 케이스 전용 label로 받아 render에서 채운다 (plan.md 5.1)
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
  presets: {
    로딩: { isLoading: true },
    비활성: { disabled: true },
    "로딩과 비활성 함께": { isLoading: true, disabled: true },
    "복사됨(accent)": { variant: "accent", size: "sm", label: "복사됨" },
    "outline 전체 폭": { variant: "outline", size: "lg", isFullWidth: true },
    "아주 긴 라벨": {
      label: "워크스페이스에 연결된 노션 페이지를 모두 다시 불러오기",
    },
  },
  impacts: [
    "src/modules/features/auth/GithubLoginButton/index.tsx",
    "src/modules/features/workspace/WorkspaceCreateButton/index.tsx",
    "src/modules/features/workspace/WorkspaceJoinByCodeButton/index.tsx",
    "src/modules/widgets/member/NicknameCard/index.tsx",
    "src/modules/widgets/notion/NotionConnectCard/index.tsx",
    "src/modules/widgets/notion/NotionSyncCard/index.tsx",
    "src/modules/widgets/workspace/CreateWorkspaceCard/index.tsx",
    "src/modules/widgets/workspace/WorkspaceInviteCard/index.tsx",
    "src/modules/widgets/workspace/WorkspaceInviteMemberCard/index.tsx",
    "src/modules/widgets/workspace/WorkspaceJoinCard/index.tsx",
    "src/modules/widgets/workspace/WorkspaceJoinErrorNotice/index.tsx",
    "src/pages/onboarding/complete/index.tsx",
    "src/shared/components/primitives/ui/RetryNotice/index.tsx",
  ],
});
