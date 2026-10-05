// PR 폴더 하나를 단일 HTML(<outDir>/review-<폴더 이름>.html)로 빌드한다 (plan.md 2.2, 3.4, 11.1)
import fs from "node:fs";
import path from "node:path";
import { build } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

import type { ResolvedConfig } from "./config.ts";
import { captureShots } from "./shots.ts";
import { caseName, listCaseFiles, viteConfig } from "./vite.ts";

export async function buildPr(config: ResolvedConfig, prDir: string, pr?: string, shots = true) {
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
  // 개요 화면 사진. 개요 탭은 pr.ts가 있을 때만 있다 (plan.md 3.4)
  if (shots && fs.existsSync(path.join(prDir, "pr.ts"))) {
    const count = await captureShots(config.root, out, listCaseFiles(prDir).map(caseName));
    if (count > 0) console.log(`  화면 사진 ${count}장`);
  }
  const size = fs.statSync(out).size;
  console.log(`${path.relative(process.cwd(), out)} (${Math.round(size / 1024)} KB)`);
  // 아티팩트 페이지 상한은 16MB (plan.md 1.1)
  const MB = 1024 * 1024;
  if (size > 16 * MB) console.warn("  16MB를 넘어 아티팩트에 올릴 수 없습니다.");
  else if (size > 14 * MB) console.warn("  아티팩트 상한(16MB)에 가깝습니다.");
  // 인라인된 폰트 파일은 아티팩트 공개 공유를 막는다 (plan.md 1.1, 11.2)
  if (fs.readFileSync(out, "utf8").includes("data:font/"))
    console.warn("  폰트 파일이 들어 있어 아티팩트를 공개 공유할 수 없습니다. styles에서 @font-face를 빼세요.");
  return out;
}
