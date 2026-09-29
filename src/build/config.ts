// review.config.ts를 읽어 절대 경로로 풀어 둔다 (plan.md 11.2)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { ReviewConfig } from "../index.ts";

const CONFIG_FILE = "review.config.ts";
// 리뷰 화면이 직접 import하므로 항상 대상 node_modules에서 가져온다 (11.3)
const BASE_SHARED = ["react", "react-dom", "msw"];

export type ResolvedConfig = Omit<ReviewConfig, "alias" | "styles" | "wrapper" | "casesDir" | "outDir"> & {
  root: string;
  alias: Record<string, string>;
  sharedPackages: string[];
  styles: string[];
  wrapper?: string;
  casesDir: string;
  outDir: string;
};

// cwd부터 위로 올라가며 review.config.ts를 찾는다
function findConfig(cwd: string) {
  for (let dir = cwd; ; dir = path.dirname(dir)) {
    const file = path.join(dir, CONFIG_FILE);
    if (fs.existsSync(file)) return file;
    if (path.dirname(dir) === dir) return null;
  }
}

export async function loadConfig(cwd = process.cwd()): Promise<ResolvedConfig> {
  const file = findConfig(cwd);
  if (!file) throw new Error(`${CONFIG_FILE}을 찾지 못했습니다 (${cwd}부터 위로 찾음)`);
  // Node 22 타입 제거로 바로 import한다. JSX는 쓸 수 없으므로 wrapper는 파일 경로로 받는다
  const config: ReviewConfig = (await import(pathToFileURL(file).href)).default;
  const root = path.dirname(file);
  const abs = (p: string) => path.resolve(root, p);
  return {
    ...config,
    root,
    alias: Object.fromEntries(Object.entries(config.alias ?? {}).map(([k, v]) => [k, abs(v)])),
    sharedPackages: [...new Set([...BASE_SHARED, ...(config.sharedPackages ?? [])])],
    styles: (config.styles ?? []).map(abs),
    wrapper: config.wrapper && abs(config.wrapper),
    mockHandlers: config.mockHandlers && abs(config.mockHandlers),
    casesDir: abs(config.casesDir ?? "review/cases"),
    outDir: abs(config.outDir ?? "review/dist"),
  };
}

// 케이스 인자는 파일 경로나 casesDir 안의 이름(365, 365.tsx)을 받는다
export function resolveCase(config: ResolvedConfig, arg: string) {
  const candidates = [
    path.resolve(arg),
    path.join(config.casesDir, arg),
    path.join(config.casesDir, `${arg}.tsx`),
  ];
  const found = candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!found) throw new Error(`케이스를 찾지 못했습니다: ${arg} (${config.casesDir})`);
  return found;
}
