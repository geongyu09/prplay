// review-kit 공개 진입점. 케이스 파일(브라우저)과 review.config.ts(Node)가 함께 import하므로 Node 모듈을 쓰지 않는다
import type { ReactNode } from "react";
import type { PluginOption } from "vite";
import type svgr from "vite-plugin-svgr";

// plan.md 3.1
export type MockRoute = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  status: number;
  delayMs?: number;
  body: unknown;
};

export type ReviewCase<P> = {
  title: string;
  sources: string[];
  render: (props: P, actions: Actions) => ReactNode;
  props: P;
  presets?: Record<string, Partial<P>>;
  scenarios?: Record<string, MockRoute[]>;
  initialPath?: string;
  impacts?: string[];
};

// PR 폴더의 pr.ts. 결과 HTML의 개요 탭이 된다 (plan.md 3.4)
export type ReviewPr = {
  title: string;
  summary: string;
  changes: string[];
  decisions: string[];
  reviewPoints: string[];
};

// 함수 props 이름 → 호출 기록 로거 (plan.md 5.1)
export type Actions = Record<string, (...args: unknown[]) => void>;

export const defineCase = <P,>(c: ReviewCase<P>) => c;

export const definePr = (pr: ReviewPr) => pr;

// 주소 표시줄 연결 (plan.md 4.1). wrapper가 라우터 안에서 현재 주소를 알리고 이동 함수를 연결한다
export type ReviewAddress = {
  report: (path: string) => void;
  // 해제 함수를 돌려준다
  connect: (navigate: (path: string) => void) => () => void;
};

export type WrapperProps = {
  initialPath?: string;
  address: ReviewAddress;
  children: ReactNode;
};

// plan.md 11.2. 경로는 모두 설정 파일이 있는 폴더 기준
export type ReviewConfig = {
  alias?: Record<string, string>;
  plugins?: PluginOption[];
  svgr?: NonNullable<Parameters<typeof svgr>[0]>;
  jsxImportSource?: string;
  define?: Record<string, string>;
  // 대상 node_modules에서 가져올 패키지. react, react-dom, msw는 항상 포함 (11.3)
  sharedPackages?: string[];
  // 미리보기에 넣을 CSS 파일(폰트 @font-face 등). 번들에 인라인된다 (11.2)
  styles?: string[];
  // ({ initialPath, children }) => ReactNode 컴포넌트를 default export하는 파일 (4.1)
  wrapper?: string;
  // 기존 MSW 핸들러 배열을 default나 `handlers`로 export하는 파일. 시나리오에 없는 요청에 쓴다 (6.1)
  mockHandlers?: string;
  casesDir?: string;
  outDir?: string;
  repoUrl?: string;
  baseBranch?: string;
};

export const defineConfig = (config: ReviewConfig) => config;
