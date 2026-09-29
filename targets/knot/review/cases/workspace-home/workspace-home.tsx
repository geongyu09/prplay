import type { GetCsrfTokenResponseRaw, GetMeResponseRaw } from "@api/dto/auth";
import type { GetNotionConnectionResponseRaw } from "@api/dto/notionConnection";
import type { PostWorkspaceInvitationResponseRaw } from "@api/dto/workspaceInvitation";
import { AUTH_CSRF_API_PATH } from "@api/fetch/api/v1/auth/csrf";
import { AUTH_ME_API_PATH } from "@api/fetch/api/v1/auth/me";
import { NOTION_CONNECTION_API_PATH } from "@api/fetch/api/v1/workspaces/[workspaceId]/notionConnection";
import { WORKSPACE_INVITATIONS_API_PATH } from "@api/fetch/api/v1/workspaces/[workspaceId]/invitations";
import WorkspaceHomePage from "@pages/workspace/[workspaceId]";
import type { MockRoute } from "review-kit";
import { defineCase } from "review-kit";
import { Route, Routes } from "react-router";

const WORKSPACE_ID = 1;

const route = (
  method: MockRoute["method"],
  path: string,
  body: unknown,
  status = 200,
  delayMs?: number,
): MockRoute => ({ method, path, status, body, delayMs });

const me = {
  memberId: 1,
  nickname: "건규",
  // 아티팩트는 외부 이미지를 막으므로 비워 둔다 (plan.md 1.1)
  profileImageUrl: "",
} satisfies GetMeResponseRaw;

const invitation = {
  code: "X35D3S",
  linkToken: "review-link-token",
  expiresAt: "2026-10-04T00:00:00Z",
} satisfies PostWorkspaceInvitationResponseRaw;

// 초대 조회는 POST라 axios 인터셉터가 CSRF 토큰을 먼저 받는다
const csrf = { token: "review-csrf-token" } satisfies GetCsrfTokenResponseRaw;

const connected = { status: "CONNECTED" } satisfies GetNotionConnectionResponseRaw;
const notConnected = { status: "NOT_CONNECTED" } satisfies GetNotionConnectionResponseRaw;
const serverError = { message: "서버 오류" };

const ME = AUTH_ME_API_PATH;
const NOTION = NOTION_CONNECTION_API_PATH(WORKSPACE_ID);
// 홈의 초대 카드는 조회에도 POST invitations를 쓴다(활성 초대가 있으면 200, 없으면 새로 발급해 201)
const INVITATIONS = WORKSPACE_INVITATIONS_API_PATH(WORKSPACE_ID);
const CSRF = AUTH_CSRF_API_PATH;

export default defineCase({
  title: "워크스페이스 홈",
  sources: ["src/pages/workspace/[workspaceId]/index.tsx"],
  props: {},
  initialPath: `/workspace/${WORKSPACE_ID}`,
  // 페이지가 useParams로 :workspaceId를 읽으므로 실제 라우트와 같은 경로로 감싼다 (plan.md 4.1)
  render: () => (
    <Routes>
      <Route path="/workspace/:workspaceId" element={<WorkspaceHomePage />} />
    </Routes>
  ),
  // plan.md 9.2 규칙: 정상, 빈 응답, 로딩(2000ms), 500 에러
  scenarios: {
    정상: [
      route("GET", ME, me),
      route("GET", NOTION, connected),
      route("GET", CSRF, csrf),
      route("POST", INVITATIONS, invitation),
    ],
    // 노션을 아직 연결하지 않은 새 워크스페이스. 초대는 없으면 새로 발급되므로 201
    "빈 상태": [
      route("GET", ME, me),
      route("GET", NOTION, notConnected),
      route("GET", CSRF, csrf),
      route("POST", INVITATIONS, invitation, 201),
    ],
    로딩: [
      route("GET", ME, me, 200, 2000),
      route("GET", NOTION, connected, 200, 2000),
      route("GET", CSRF, csrf),
      route("POST", INVITATIONS, invitation, 200, 2000),
    ],
    "500 에러": [
      route("GET", ME, serverError, 500),
      route("GET", NOTION, serverError, 500),
      route("GET", CSRF, csrf),
      route("POST", INVITATIONS, serverError, 500),
    ],
  },
  decisions: [],
  impacts: [],
});
