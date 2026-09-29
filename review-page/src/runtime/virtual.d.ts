// 빌드 가상 모듈 타입. review-kit 타입은 src/index.ts에 있다
declare module "virtual:review-cases" {
  // build/vite.ts casesModule. PR 폴더 하나 (plan.md 3.4)
  import type { ReviewCase, ReviewPr } from "review-kit";

  // react-docgen 결과 (plan.md 5.1)
  export type PropMeta = {
    kind: "string" | "number" | "boolean" | "select" | "function" | "node" | "json";
    options?: unknown[];
    required?: boolean;
    description?: string;
    raw?: string;
  };

  // plan.md 3.3. git을 못 쓰면 diff가 비고, repoUrl이 없으면 url이 없다
  export type SourceFile = { path: string; code: string; diff: string; url?: string };

  export type CaseEntry = {
    // 확장자를 뺀 케이스 파일 이름. 저장 키에 쓴다 (plan.md 7)
    name: string;
    case: ReviewCase<any>;
    props: Record<string, PropMeta>;
    files: SourceFile[];
  };

  // pr.ts. 없으면 null
  export const pr: ReviewPr | null;
  // title은 <title>과 같은 값(Review · 뒤). git을 못 쓰면 sha가 빈다
  export const meta: { pr: string; prUrl?: string; title: string; sha: string; base: string };
  const cases: CaseEntry[];
  export default cases;
}

declare module "virtual:review-handlers" {
  // review.config.ts의 mockHandlers 파일 (plan.md 6.1). 없으면 빈 배열
  import type { RequestHandler } from "msw";
  const handlers: RequestHandler[];
  export default handlers;
}

declare module "virtual:review-wrapper" {
  // review.config.ts의 wrapper 파일 (plan.md 4.1, 11.2). 없으면 children만 그린다
  import type { ComponentType } from "react";
  import type { WrapperProps } from "review-kit";
  const Wrapper: ComponentType<WrapperProps>;
  export default Wrapper;
}

declare module "*.css?inline" {
  const css: string;
  export default css;
}

// review.config.ts styles의 CSS 파일들 (plan.md 11.2)
declare module "virtual:review-styles" {}
