// 빌드 가상 모듈 타입. review-kit 타입은 src/index.ts에 있다
declare module "virtual:review-case" {
  import type { ReviewCase } from "review-kit";
  const reviewCase: ReviewCase<any>;
  export default reviewCase;
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

declare module "virtual:review-props" {
  // build.ts가 react-docgen 결과로 만든다 (plan.md 5.1)
  export type PropMeta = {
    kind: "string" | "number" | "boolean" | "select" | "function" | "node" | "json";
    options?: unknown[];
    required?: boolean;
    description?: string;
    raw?: string;
  };
  const props: Record<string, PropMeta>;
  export default props;
}

declare module "virtual:review-sources" {
  // build.ts sourcesModule (plan.md 3.3). git을 못 쓰면 sha·diff가 비고, repoUrl이 없으면 url이 없다
  export type SourceFile = { path: string; code: string; diff: string; url?: string };
  const sources: { sha: string; base: string; files: SourceFile[] };
  export default sources;
}

declare module "*.css?inline" {
  const css: string;
  export default css;
}

// build.ts define. `review-kit:{PR번호}:{케이스}` (plan.md 7)
declare const __REVIEW_STORAGE_KEY__: string;
