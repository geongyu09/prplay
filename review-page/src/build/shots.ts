// 개요 화면 사진 (plan.md 3.4). 결과 HTML을 playwright로 열어 대상마다 미리보기를 찍고 HTML에 끼워 넣는다
// playwright는 스킬 의존성이 아니라 설정 파일 폴더 프로젝트 것을 쓴다(스모크와 같다, 9.4)
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

type Kind = "default" | "preset" | "scenario";
type Shot = { case: string; state: string; kind: Kind; src: string; width: number; height: number };

const PER_CASE = 4;
const TOTAL = 12;
const WIDTH = 1024; // 좁은 화면 배치라 미리보기가 위에 가득 찬다
const MAX_HEIGHT = 1200;
const PADDING = 16;
const ERROR_TEXT = "미리보기 렌더링 오류";

function loadChromium(root: string) {
  const require = createRequire(path.join(root, "package.json"));
  for (const name of ["playwright", "@playwright/test"]) {
    try {
      return require(name).chromium;
    } catch {}
  }
  return null;
}

// 미리보기 영역 안에서 실제로 그려진 곳(글자, 이미지·SVG·입력 요소, 배경·테두리가 있는 요소)을 감싸는 사각형.
// 작은 컴포넌트가 넓은 빈 공간 속에 작게 찍히지 않게 한다. 버튼을 누르면 페이지가 스크롤되므로 문서 기준 좌표다 (plan.md 3.4)
// 브라우저에서 실행되므로 바깥 변수를 쓰지 않는다
function contentBox(padding: number) {
  const root = document.querySelector(".review-preview")!;
  const area = root.getBoundingClientRect();
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  const add = (r: DOMRect) => {
    if (r.width < 1 || r.height < 1) return;
    left = Math.min(left, r.left);
    top = Math.min(top, r.top);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      add(range.getBoundingClientRect());
      continue;
    }
    const el = node as Element;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") continue;
    const painted =
      /^(img|svg|canvas|video|input|textarea|select|button|iframe)$/i.test(el.tagName) ||
      (style.backgroundColor !== "rgba(0, 0, 0, 0)" && style.backgroundColor !== "transparent") ||
      style.backgroundImage !== "none" ||
      ["top", "right", "bottom", "left"].some(
        (side) =>
          parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 &&
          style.getPropertyValue(`border-${side}-style`) !== "none",
      ) ||
      style.boxShadow !== "none";
    if (painted) add(el.getBoundingClientRect());
  }
  if (left === Infinity) return null;
  // 여백을 더하되 미리보기 영역 밖으로는 넘기지 않는다
  left = Math.max(area.left, left - padding);
  top = Math.max(area.top, top - padding);
  right = Math.min(area.right, right + padding);
  bottom = Math.min(area.bottom, bottom + padding);
  if (right - left < 1 || bottom - top < 1) return null;
  return { x: left + scrollX, y: top + scrollY, width: right - left, height: bottom - top };
}

// 찍은 장 수를 돌려준다. playwright가 없거나 실패하면 HTML을 그대로 두고 그 사실을 출력한다
export async function captureShots(root: string, htmlPath: string, caseNames: string[]) {
  const chromium = loadChromium(root);
  if (!chromium) {
    console.log("  playwright가 없어 화면 사진 없이 빌드했습니다.");
    return 0;
  }
  // Playwright 브라우저가 설치돼 있지 않으면 설치된 Chrome을 쓴다
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: "chrome" }));
  const shots: Shot[] = [];
  try {
    const context = await browser.newContext({ viewport: { width: WIDTH, height: 800 }, deviceScaleFactor: 2 });
    // 장마다 저장된 편집 상태 없이 새로 연다
    await context.addInitScript(() => localStorage.clear());
    const page = await context.newPage();
    const url = pathToFileURL(htmlPath).href;
    const caseTabs = page.locator(".rv-page-tabs .rv-tab").filter({ hasNotText: /^개요$/ });
    const sectionButtons = (title: string) =>
      page.locator(".rv-section").filter({ has: page.locator("h2", { hasText: title }) }).locator(".rv-row").first().locator("button");

    const openCase = async (index: number) => {
      await page.goto(url);
      await caseTabs.nth(index).click();
      await page.waitForTimeout(300);
    };
    const shoot = async (name: string, state: string, kind: Kind) => {
      await page.waitForTimeout(500);
      if ((await page.locator("body").innerText()).includes(ERROR_TEXT)) return;
      const box = await page.evaluate(contentBox, PADDING);
      if (!box) return;
      const clip = { ...box, height: Math.min(box.height, MAX_HEIGHT) };
      const image = await page.screenshot({ type: "jpeg", quality: 80, fullPage: true, clip });
      shots.push({
        case: name,
        state,
        kind,
        src: `data:image/jpeg;base64,${image.toString("base64")}`,
        width: Math.round(clip.width),
        height: Math.round(clip.height),
      });
    };

    // 대상마다 기본 상태 → 프리셋 → 첫 시나리오를 뺀 시나리오 순서로 최대 4장
    for (let i = 0; i < caseNames.length && shots.length < TOTAL; i++) {
      await openCase(i);
      const presets = await sectionButtons("프리셋").allInnerTexts();
      const scenarios = await sectionButtons("시나리오").allInnerTexts();
      const states: { kind: Kind; state: string }[] = [
        { kind: "default", state: "기본" },
        ...presets.map((state) => ({ kind: "preset" as const, state: state.trim() })),
        ...scenarios.slice(1).map((state) => ({ kind: "scenario" as const, state: state.trim() })),
      ].slice(0, Math.min(PER_CASE, TOTAL - shots.length));

      for (const [n, s] of states.entries()) {
        if (n > 0) {
          await openCase(i);
          await sectionButtons(s.kind === "preset" ? "프리셋" : "시나리오").getByText(s.state, { exact: true }).click();
        }
        await shoot(caseNames[i], s.state, s.kind);
      }
    }
  } catch (error) {
    console.log(`  화면 사진을 찍지 못해 사진 없이 빌드했습니다: ${(error as Error).message.split("\n")[0]}`);
    return 0;
  } finally {
    await browser.close();
  }

  // 다시 빌드하지 않고 이 태그만 끼워 넣는다. JSON 안의 `<`는 태그가 닫히지 않게 바꾼다
  const json = JSON.stringify(shots).replace(/</g, "\\u003c");
  const tag = `<script type="application/json" id="review-shots">${json}</script>`;
  const html = fs.readFileSync(htmlPath, "utf8");
  fs.writeFileSync(htmlPath, html.includes("</body>") ? html.replace("</body>", () => `${tag}</body>`) : html + tag);
  return shots.length;
}
