#!/usr/bin/env node
// review-page 스킬 명령 (plan.md 11.1). review.config.ts가 있는 프로젝트 폴더에서 실행한다
// 빌드 모듈은 스킬 폴더 node_modules가 준비된 뒤에 불러오므로, 여기서는 Node 기본 모듈만 정적으로 import한다
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const kitRoot = path.resolve(import.meta.dirname, "..");

const USAGE = `사용법 (node <스킬 폴더>/src/cli.ts <명령>)
  build <PR 폴더>... [--pr 번호] [--no-shots]
                                   PR 폴더마다 단일 HTML 빌드. --no-shots면 개요 화면 사진을 찍지 않는다
  dev <PR 폴더> [--port 5173]       dev 서버(HMR)
  init [--force]                   설정 파일과 예시 PR 폴더 만들기
PR 폴더는 폴더 경로나 casesDir 안의 이름(예: 366)`;

// review.config.ts의 `review-kit` import를 스킬 폴더의 index.ts로 돌린다 (plan.md 11.2)
const kitIndex = pathToFileURL(path.join(kitRoot, "src/index.ts")).href;
registerHooks({
  resolve: (specifier, context, next) =>
    specifier === "review-kit" ? { url: kitIndex, shortCircuit: true } : next(specifier, context),
});

// lockfile 해시가 설치 때와 다르면(처음 실행, 스킬 새로 복사) 스킬 폴더에 npm ci (plan.md 11.3)
function ensureDependencies() {
  const lock = fs.readFileSync(path.join(kitRoot, "package-lock.json"));
  const hash = createHash("sha256").update(lock).digest("hex");
  const stamp = path.join(kitRoot, "node_modules/.review-page-lock");
  if (fs.existsSync(stamp) && fs.readFileSync(stamp, "utf8") === hash) return;
  console.error("review-page 스킬 의존성을 설치합니다 (npm ci, 처음 한 번)...");
  // 진행 출력이 명령 결과와 섞이지 않게 stderr로 보낸다
  execFileSync("npm", ["ci", "--no-audit", "--no-fund"], { cwd: kitRoot, stdio: ["ignore", 2, 2] });
  fs.writeFileSync(stamp, hash);
}

// --name 값 한 쌍을 꺼낸다
function takeOption(args: string[], name: string) {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "init") {
    const { init } = await import("./init.ts");
    init(process.cwd(), args.includes("--force"));
    return;
  }
  if (command !== "build" && command !== "dev") throw new Error(USAGE);

  ensureDependencies();
  const { loadConfig, resolvePrDir } = await import("./build/config.ts");
  if (command === "build") {
    const pr = takeOption(args, "--pr");
    const noShots = args.indexOf("--no-shots");
    if (noShots >= 0) args.splice(noShots, 1);
    if (args.length === 0) throw new Error(USAGE);
    const { buildPr } = await import("./build/build.ts");
    const config = await loadConfig();
    fs.mkdirSync(config.outDir, { recursive: true });
    for (const arg of args) await buildPr(config, resolvePrDir(config, arg), pr, noShots < 0);
    return;
  }
  const port = takeOption(args, "--port");
  if (args.length !== 1) throw new Error(USAGE);
  const { devPr } = await import("./build/dev.ts");
  const config = await loadConfig();
  await devPr(config, resolvePrDir(config, args[0]), port ? Number(port) : undefined);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
