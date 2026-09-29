// review-kit init: 설정 파일, 스킬 템플릿, 예시 케이스를 현재 폴더에 만든다 (plan.md 11.1)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const templates = path.resolve(import.meta.dirname, "../templates");

// git remote가 GitHub면 https 주소로 바꾼다. 아니면 빈 문자열
function githubUrl(cwd: string) {
  try {
    const remote = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const match = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
    return match ? `https://github.com/${match[1]}` : "";
  } catch {
    return "";
  }
}

// 템플릿 폴더 안의 파일 목록 (상대 경로)
function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.relative(dir, path.join(e.parentPath, e.name)));
}

export function init(cwd: string, force: boolean) {
  const created: string[] = [];
  const skipped: string[] = [];
  const write = (target: string, content: string | Buffer, mode?: number) => {
    const file = path.join(cwd, target);
    if (fs.existsSync(file) && !force) {
      skipped.push(target);
      return;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    if (mode) fs.chmodSync(file, mode);
    created.push(target);
  };

  const repoUrl = githubUrl(cwd);
  const config = fs.readFileSync(path.join(templates, "review.config.ts"), "utf8");
  write(
    "review.config.ts",
    repoUrl
      ? config.replace("__REPO_URL__", repoUrl)
      : config.replace(/ {2}repoUrl: "__REPO_URL__",\n/, '  // repoUrl: "https://github.com/<owner>/<repo>",\n'),
  );

  for (const [from, to] of [
    ["review-page", ".claude/skills/review-page"],
    ["example", "review"],
  ]) {
    for (const rel of listFiles(path.join(templates, from))) {
      const src = path.join(templates, from, rel);
      write(path.join(to, rel), fs.readFileSync(src), fs.statSync(src).mode & 0o777);
    }
  }

  for (const f of created) console.log(`만듦    ${f}`);
  for (const f of skipped) console.log(`건너뜀  ${f} (이미 있음, --force면 덮어씀)`);

  const require = createRequire(path.join(cwd, "package.json"));
  const missing = ["react", "react-dom", "msw"].filter((name) => {
    try {
      require.resolve(`${name}/package.json`);
      return false;
    } catch {
      return true;
    }
  });

  console.log(`
다음 할 일
${missing.length > 0 ? `- 설치: ${missing.join(" ")} (리뷰 화면이 프로젝트 것을 쓴다)\n` : ""}- package.json scripts에 추가:
    "review:build": "review-kit build",
    "review:dev": "review-kit dev"
- .gitignore에 추가: review/dist/
- tsconfig include에 review, review.config.ts 추가 (스킬 검증의 tsc가 케이스를 검사하도록)
- 예시 빌드: npx review-kit build example → review/dist/review-example.html
- PR 케이스 만들기: Claude Code에서 /review-page`);
}
