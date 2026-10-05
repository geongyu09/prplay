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
  // 추론은 props에서만 한다. 그래야 options에 P에 없는 값을 넣으면 tsc 오류가 난다
  controls?: NoInfer<Controls<P>>;
  scenarios?: Record<string, MockRoute[]>;
  initialPath?: string;
  impacts?: string[];
};

// PR 폴더의 pr.ts. 결과 HTML의 개요 탭이 된다 (plan.md 3.4)
// 좋은 리뷰에 필요한 7가지(맥락·길잡이·증거·만져 보기·크기·위험·리뷰 편의) 순서
export type ReviewPr = {
  title: string;
  summary: string;
  revisions?: PrRevision[];
  context: PrContext;
  intuition?: PrIntuition;
  diagrams?: PrDiagram[];
  guide: PrGuide;
  evidence: PrEvidence;
  previews?: PrLink[];
  size?: string;
  risk: PrRisk;
};

export type PrLink = { label: string; url: string };

export type PrContext = {
  problem: string[];
  links?: PrLink[];
  // 처음 보는 사람용. 화면에서 접혀 있다
  basics?: string[];
  decisions: PrDecision[];
  scope: { does: string[]; doesNot: string[] };
};

// question: 이 결정이 답하는 질문(코드 이름 없이), rejected: 버린 대안과 이유, code: 결정이 드러나는 코드 이름
export type PrDecision = { question: string; choice: string; why: string; rejected?: string; code?: string[] };

export type PrIntuition = {
  idea: string;
  examples: PrExample[];
};

// flow: 단계를 화살표로 잇는 그림, compare: 전/후 나란히
export type PrExample =
  | { kind: "flow"; caption: string; steps: { label: string; data?: string }[] }
  | { kind: "compare"; caption: string; before: PrSide; after: PrSide };

export type PrSide = { label: string; data: string };

// 시퀀스·아키텍처 그림. Mermaid 없이 직접 쓴 <svg viewBox> 문자열 (plan.md 3.4)
export type PrDiagram = { caption: string; svg: string };

export type PrGuide = {
  changes: string[];
  readingOrder: PrCodeStep[];
  focus: string[];
  skim: string[];
};

export type PrCodeStep = {
  // core: 리뷰어가 판단할 약속·동작(props·타입·상태 위치·데이터 흐름), side: 구현 세부나 따라 고친 곳
  role: "core" | "side";
  title: string;
  files: string[];
  explain: string;
  snippet?: string;
};

export type PrEvidence = {
  tests: { file: string; guarantees: string }[];
  manual: string[];
  ci: { name: string; state: "pass" | "fail" | "pending" | "skip" }[];
};

// 빈 배열은 화면에 "해당 없음"으로 보인다
export type PrRisk = {
  impact: string[];
  compatibility: string[];
  deploy: string[];
  securityPerf: string[];
};

// since: 지난 리뷰 때 커밋 SHA
export type PrRevision = { since: string; changes: string[] };

// props 키마다 컨트롤의 범위·선택지를 좁힌다 (plan.md 5.1)
export type Controls<P> = { [K in keyof P]?: PropControl<P[K]> };

// options: 이 값들 중 하나만 고르는 셀렉트. min·max·step은 숫자 props에만. step이 정수면 정수만 받는다
export type PropControl<T> = {
  options?: readonly T[];
} & ([NonNullable<T>] extends [number] ? { min?: number; max?: number; step?: number } : {});

// 함수 props 이름 → 호출 기록 로거 (plan.md 5.1)
export type Actions = Record<string, (...args: unknown[]) => void>;

export const defineCase = <P,>(c: ReviewCase<P>) => c;

export const definePr = (pr: ReviewPr) => pr;

// URL 표시줄 연결 (plan.md 4.1). wrapper가 라우터 안에서 현재 URL을 알리고 이동 함수를 연결한다
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
  // 미리보기에 넣을 CSS 파일. 번들에 인라인된다. 폰트 파일은 공개 공유를 막으므로 넣지 않는다 (1.1, 11.2)
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
