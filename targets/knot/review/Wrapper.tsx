import { useEffect, useState } from "react";
import { ThemeProvider } from "@emotion/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import type { ReviewAddress, WrapperProps } from "review-kit";

import { GlobalStyle, theme } from "@provider/themeProvider";

// review-kit wrapper (plan.md 4.1, 11.2). review-kit이 key로 다시 마운트하므로 QueryClient도 새로 만들어진다 (4.2)
export default function Wrapper({ initialPath, address, children }: WrapperProps) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath ?? "/"]}>
          <AddressSync address={address} />
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

// 주소 표시줄에 현재 주소를 알리고 이동 함수를 연결한다 (plan.md 4.1)
function AddressSync({ address }: { address: ReviewAddress }) {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(
    () => address.report(location.pathname + location.search + location.hash),
    [address, location],
  );
  useEffect(() => address.connect((path) => navigate(path)), [address, navigate]);
  return null;
}
