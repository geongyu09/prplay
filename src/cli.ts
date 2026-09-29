#!/usr/bin/env node
// review-kit CLI (plan.md 11.1). review.config.ts가 있는 프로젝트 폴더에서 실행한다
import fs from "node:fs";

import { buildCase } from "./build/build.ts";
import { loadConfig, resolveCase } from "./build/config.ts";
import { devCase } from "./build/dev.ts";

const USAGE = `사용법
  review-kit build <케이스>... [--pr 번호]   단일 HTML 빌드
  review-kit dev <케이스> [--port 5173]       dev 서버(HMR)
케이스는 파일 경로나 casesDir 안의 이름(예: 365)`;

// --name 값 한 쌍을 꺼낸다
function takeOption(args: string[], name: string) {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "build") {
    const pr = takeOption(args, "--pr");
    if (args.length === 0) throw new Error(USAGE);
    const config = await loadConfig();
    fs.mkdirSync(config.outDir, { recursive: true });
    for (const arg of args) await buildCase(config, resolveCase(config, arg), pr);
    return;
  }
  if (command === "dev") {
    const port = takeOption(args, "--port");
    if (args.length !== 1) throw new Error(USAGE);
    const config = await loadConfig();
    await devCase(config, resolveCase(config, args[0]), port ? Number(port) : undefined);
    return;
  }
  throw new Error(USAGE);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
