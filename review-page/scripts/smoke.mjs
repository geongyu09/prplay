#!/usr/bin/env node
// 결과 HTML 스모크 테스트 (plan.md 9.4)
// 사용법: node smoke.mjs <html>...  (프로젝트 폴더에서 실행. 프로젝트의 playwright를 쓴다)
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("사용법: node smoke.mjs <html>...");
  process.exit(1);
}

const require = createRequire(path.join(process.cwd(), "package.json"));
let chromium;
for (const name of ["playwright", "@playwright/test"]) {
  try {
    ({ chromium } = require(name));
    break;
  } catch {}
}
if (!chromium) {
  console.log("playwright가 없어 스모크 테스트를 건너뜁니다.");
  process.exit(0);
}

const ERROR_TEXT = "미리보기 렌더링 오류";
// Playwright 브라우저가 설치돼 있지 않으면 설치된 Chrome을 쓴다
const browser = await chromium.launch().catch(() => chromium.launch({ channel: "chrome" }));
let failed = 0;

for (const file of files) {
  const page = await browser.newPage();
  const problems = [];
  let step = "첫 화면";
  page.on("pageerror", (e) => problems.push(`[${step}] 오류: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && problems.push(`[${step}] 콘솔: ${m.text().split("\n")[0]}`));
  page.on("request", (r) => {
    if (!/^(file|data|blob):/.test(r.url())) problems.push(`[${step}] 외부 요청: ${r.url()}`);
  });

  const warnings = new Set();
  // 리뷰 화면은 Shadow DOM 안에 있다. Playwright CSS 선택자는 열린 Shadow DOM을 뚫는다
  const check = async () => {
    await page.waitForTimeout(300);
    const text = await page.locator("body").innerText();
    const shadowText = await page.locator(".rv-app").innerText().catch(() => "");
    if (text.includes(ERROR_TEXT)) problems.push(`[${step}] ${ERROR_TEXT}`);
    const missing = await page.locator(".rv-request", { hasText: /\b501\b/ }).allInnerTexts();
    for (const m of missing) warnings.add(`목 없는 요청: ${m.replace(/\s+/g, " ").trim()}`);
    if (!shadowText) problems.push(`[${step}] 리뷰 화면이 그려지지 않음`);
  };

  // 첫 화면은 개요 탭(pr.ts가 있을 때)이나 첫 대상 탭이다
  await page.goto(pathToFileURL(path.resolve(file)).href);
  await check();

  const sectionButtons = (title) =>
    page.locator(".rv-section").filter({ has: page.locator("h2", { hasText: title }) }).locator(".rv-row").first().locator("button");

  // 대상 탭마다 탭을 누르고 프리셋·시나리오를 하나씩 누른다 (plan.md 3.4, 9.4). 탭이 하나뿐이면 탭 줄이 없다
  const pageTabs = page.locator(".rv-page-tabs .rv-tab").filter({ hasNotText: /^개요$/ });
  const tabCount = await pageTabs.count();
  const results = [];
  for (let t = 0; t < Math.max(tabCount, 1); t++) {
    let tabName = "";
    if (tabCount > 0) {
      tabName = (await pageTabs.nth(t).innerText()).trim();
      step = `${tabName} 탭`;
      await pageTabs.nth(t).click();
      await check();
    }
    const clicked = {};
    for (const kind of ["프리셋", "시나리오"]) {
      const buttons = sectionButtons(kind);
      const count = await buttons.count();
      clicked[kind] = count;
      for (let i = 0; i < count; i++) {
        const name = (await buttons.nth(i).innerText()).trim();
        step = `${tabName ? `${tabName} ` : ""}${kind} ${name}`;
        await buttons.nth(i).click();
        await check();
      }
    }
    results.push(`${tabName ? `${tabName}: ` : ""}프리셋 ${clicked["프리셋"]}개, 시나리오 ${clicked["시나리오"]}개`);
  }

  // 실제로 누른 개수를 탭마다 같이 보여 준다 (plan.md 9.4)
  const label = `${path.relative(process.cwd(), file)} (${results.join(" / ")})`;
  if (problems.length > 0) {
    failed++;
    console.log(`실패 ${label}`);
    for (const p of problems) console.log(`  ${p}`);
  } else {
    console.log(`통과 ${label}`);
  }
  for (const w of warnings) console.log(`  경고 ${w}`);
  await page.close();
}

await browser.close();
process.exit(failed > 0 ? 1 : 0);
