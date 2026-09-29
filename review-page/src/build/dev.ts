// 케이스 하나를 Vite dev 서버로 띄운다. 단일 파일 플러그인만 빼고 build와 같은 설정이다 (plan.md 11.1)
import { createServer } from "vite";

import type { ResolvedConfig } from "./config.ts";
import { viteConfig } from "./vite.ts";

export async function devCase(config: ResolvedConfig, casePath: string, port?: number) {
  const base = viteConfig(config, casePath);
  const server = await createServer({
    ...base,
    server: { ...base.server, port: port ?? 5173 },
  });
  await server.listen();
  server.printUrls();
  return server;
}
