// PR 폴더 하나를 단일 HTML(<outDir>/review-<폴더 이름>.html)로 빌드한다 (plan.md 2.2, 3.4, 11.1)
import fs from "node:fs";
import path from "node:path";
import { build } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

import type { ResolvedConfig } from "./config.ts";
import { viteConfig } from "./vite.ts";

export async function buildPr(config: ResolvedConfig, prDir: string, pr?: string) {
  const name = path.basename(prDir);
  const tmpDir = path.join(config.outDir, `.tmp-${name}`);
  const base = viteConfig(config, prDir, pr);

  await build({
    ...base,
    logLevel: "warn",
    plugins: [...base.plugins!, viteSingleFile()],
    build: {
      outDir: tmpDir,
      emptyOutDir: true,
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      rolldownOptions: {
        // "use client" 지시어 경고는 단일 HTML에서 의미가 없다 (plan.md 11.1)
        onLog(level, log, handler) {
          if (log.code === "MODULE_LEVEL_DIRECTIVE") return;
          handler(level, log);
        },
      },
    },
  });

  const out = path.join(config.outDir, `review-${name}.html`);
  fs.renameSync(path.join(tmpDir, "index.html"), out);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  const size = fs.statSync(out).size;
  console.log(`${path.relative(process.cwd(), out)} (${Math.round(size / 1024)} KB)`);
  // 아티팩트 페이지 상한은 16MB (plan.md 1.1)
  const MB = 1024 * 1024;
  if (size > 16 * MB) console.warn("  16MB를 넘어 아티팩트에 올릴 수 없습니다.");
  else if (size > 14 * MB) console.warn("  아티팩트 상한(16MB)에 가깝습니다.");
  return out;
}
