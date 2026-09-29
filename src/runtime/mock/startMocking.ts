import { BatchInterceptor } from "@mswjs/interceptors";
import { FetchInterceptor } from "@mswjs/interceptors/fetch";
import { XMLHttpRequestInterceptor } from "@mswjs/interceptors/XMLHttpRequest";
import { delay, getResponse, http, HttpResponse, type RequestHandler } from "msw";
import type { MockRoute } from "review-kit";

export type RequestRecord = {
  method: string;
  url: string;
  status: number;
  ms: number;
  source: "scenario" | "handlers" | "none"; // 응답 출처 (plan.md 6.1)
  startedAt: number; // performance.now() 기준 요청 시작 시각
};

// plan.md 6.1. 아티팩트에서는 Service Worker를 못 쓰므로 페이지 안에서 fetch와 XHR을 가로챈다
const toHandlers = (routes: MockRoute[]) =>
  routes.map((route) =>
    http[route.method.toLowerCase() as Lowercase<MockRoute["method"]>](
      route.path,
      async () => {
        if (route.delayMs) await delay(route.delayMs);
        return HttpResponse.json(route.body as never, { status: route.status });
      },
    ),
  );

// 핸들러는 매 요청마다 getRoutes()로 새로 만든다. 편집한 시나리오가 다음 요청부터 바로 반영된다
// onRecord는 응답을 돌려줄 때마다 요청 기록 패널에 넘길 한 줄을 받는다.
// 시나리오에 없는 요청은 기존 MSW 핸들러(fallbackHandlers)로 응답한다 (plan.md 6.1)
export function startMocking(
  getRoutes: () => MockRoute[],
  onRecord?: (record: RequestRecord) => void,
  fallbackHandlers: RequestHandler[] = [],
) {
  // axios는 브라우저에서 XHR을 쓰므로 브라우저 프리셋과 같은 두 인터셉터(fetch + XHR)를 같이 적용한다.
  // 프리셋(`presets/browser`)은 exports에 타입 조건이 없어 tsc가 못 찾으므로 직접 묶는다
  const interceptor = new BatchInterceptor({
    name: "review-kit",
    interceptors: [new FetchInterceptor(), new XMLHttpRequestInterceptor()],
  });

  interceptor.on("request", async ({ request, controller }) => {
    const startedAt = performance.now();
    // 외부 요청은 어차피 막혀 있으므로, 빠진 목을 화면에서 알 수 있게 501과 요청 주소를 돌려준다
    let source: RequestRecord["source"] = "scenario";
    let response = await getResponse(toHandlers(getRoutes()), request);
    if (!response && fallbackHandlers.length > 0) {
      source = "handlers";
      response = await getResponse(fallbackHandlers, request);
    }
    if (!response) {
      source = "none";
      response = HttpResponse.json(
        { message: `목 없음: ${request.method} ${request.url}` },
        { status: 501 },
      );
    }
    onRecord?.({
      method: request.method,
      url: request.url,
      status: response.status,
      ms: Math.round(performance.now() - startedAt),
      startedAt,
      source,
    });
    controller.respondWith(response);
  });

  interceptor.apply();
  return () => interceptor.dispose();
}
