import { Component, type ReactNode } from "react";
import type { ReviewAddress } from "review-kit";
import Wrapper from "virtual:review-wrapper";

// plan.md 4.1. 프로젝트 Provider 묶음은 review.config.ts의 wrapper 파일이 채운다
// 부모가 key로 다시 마운트하므로 wrapper 안의 QueryClient도 새로 만들어진다 (4.2)
export function Providers({
  initialPath,
  address,
  children,
}: {
  initialPath?: string;
  address: ReviewAddress;
  children: ReactNode;
}) {
  return (
    <Wrapper initialPath={initialPath} address={address}>
      {children}
    </Wrapper>
  );
}

// plan.md 4.3. 미리보기가 터져도 리뷰 화면은 남긴다
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <pre style={{ margin: 0, color: "#cf222e", whiteSpace: "pre-wrap", fontSize: 15 }}>
          미리보기 렌더링 오류{"\n"}
          {this.state.error.stack ?? String(this.state.error)}
        </pre>
      );
    }
    return this.props.children;
  }
}
