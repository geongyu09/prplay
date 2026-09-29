// 케이스 파일 하나를 단일 HTML(<outDir>/review-<이름>.html)로 빌드한다 (plan.md 2.2, 11.1)
import fs from "node:fs";
import path from "node:path";
import { build } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

import type { ResolvedConfig } from "./config.ts";
import { caseName, viteConfig } from "./vite.ts";

export async function buildCase(config: ResolvedConfig, casePath: string, pr?: string) {
  const name = caseName(casePath);
  const tmpDir = path.join(config.outDir, `.tmp-${name}`);
  const base = viteConfig(config, casePath, pr);

  await build({
    ...base,
    logLevel: "warn",
    plugins: [...base.plugins!, viteSingleFile()],
    build: {
      outDir: tmpDir,
      emptyOutDir: true,
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    },
  });

  const out = path.join(config.outDir, `review-${name}.html`);
  fs.renameSync(path.join(tmpDir, "index.html"), out);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log(`${path.relative(process.cwd(), out)} (${kb} KB)`);
  return out;
}
