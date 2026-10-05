// build와 dev가 함께 쓰는 Vite 설정 (plan.md 2.2, 11.1)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { builtinResolvers, parse as parseDocgen } from "react-docgen";
import type { InlineConfig, Plugin } from "vite";
import svgr from "vite-plugin-svgr";

import type { ResolvedConfig } from "./config.ts";

export const kitRoot = path.resolve(import.meta.dirname, "../..");
const fromKit = (p: string) => path.join(kitRoot, p);

// 대상 프로젝트와 같은 인스턴스를 써야 하는 패키지는 대상 node_modules에서 찾는다 (plan.md 13장 '작업 위치')
export function targetPackages(targetDir: string, packages: string[]): Plugin {
  const importer = path.join(targetDir, "package.json");
  return {
    name: "review-target-packages",
    enforce: "pre",
    resolveId(source, _importer, options) {
      if (!packages.some((p) => source === p || source.startsWith(`${p}/`))) return null;
      return this.resolve(source, importer, { ...options, skipSelf: true });
    },
  };
}

// 케이스 파일은 TSX라 Node에서 import할 수 없으므로 sources 배열만 정규식으로 읽는다 (plan.md 3.3)
function readSources(casePath: string): string[] {
  const text = fs.readFileSync(casePath, "utf8");
  // 경로에 `]`가 들어갈 수 있으므로(`[workspaceId]`) 문자열 리터럴 단위로 읽는다
  const match = text.match(/sources:\s*\[((?:\s*(["'`])(?:(?!\2).)*\2\s*,?)*)\s*\]/);
  if (!match) return [];
  return [...match[1].matchAll(/(["'`])((?:(?!\1).)+)\1/g)].map((m) => m[2]);
}

// title 값 하나를 정규식으로 읽는다. pr.ts와 케이스 파일 모두 `title: "..."` 형태다 (plan.md 10)
function readTitle(file: string): string | undefined {
  if (!fs.existsSync(file)) return undefined;
  return fs.readFileSync(file, "utf8").match(/title:\s*(["'`])((?:(?!\1).)+)\1/)?.[2];
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 결과 HTML의 정적 <title>. 아티팩트 갤러리 이름이 이 태그에서 나온다 (plan.md 10)
function titleHtml(title: string): Plugin {
  return {
    name: "review-title",
    transformIndexHtml: (html) => html.replace(/<title>[^<]*<\/title>/, `<title>Review · ${escapeHtml(title)}</title>`),
  };
}

type DocgenType = {
  name: string;
  raw?: string;
  type?: string;
  value?: string;
  elements?: DocgenType[];
};

// docgen 타입을 컨트롤 종류로 바꾼다. 모양은 virtual.d.ts의 PropMeta
function toPropMeta(tsType: DocgenType | undefined) {
  if (!tsType) return { kind: "json" };
  const raw = tsType.raw ?? tsType.name;
  if (/ReactNode|ReactElement|JSX\.Element/.test(raw)) return { kind: "node" };
  if (tsType.name === "signature" && tsType.type === "function") return { kind: "function" };
  if (["string", "number", "boolean"].includes(tsType.name)) return { kind: tsType.name };
  if (tsType.name === "union" && tsType.elements) {
    const elements = tsType.elements.filter((e) => !["undefined", "null"].includes(e.name));
    if (elements.length > 0 && elements.every((e) => e.name === "literal" && e.value !== undefined)) {
      // 'a' 같은 문자열 리터럴을 JSON 값으로 바꾼다
      const options = elements.map((e) => JSON.parse(e.value!.replace(/^'(.*)'$/, '"$1"')));
      return { kind: "select", options };
    }
    if (elements.length === 1) return toPropMeta(elements[0]);
  }
  return { kind: "json" };
}

// sources 첫 파일의 default export 컴포넌트 props (plan.md 5.1)
function readProps(casePath: string, root: string, watch: (file: string) => void) {
  const [source] = readSources(casePath);
  const props: Record<string, unknown> = {};
  if (!source) return props;
  const file = path.join(root, source);
  watch(file);
  const docs = parseDocgen(fs.readFileSync(file, "utf8"), {
    filename: file,
    resolver: new builtinResolvers.FindExportedDefinitionsResolver(),
  });
  for (const [name, prop] of Object.entries(docs[0]?.props ?? {})) {
    props[name] = {
      ...toPropMeta(prop.tsType as DocgenType | undefined),
      required: prop.required,
      description: prop.description || undefined,
      raw: (prop.tsType as DocgenType | undefined)?.raw ?? prop.tsType?.name,
    };
  }
  return props;
}

// 케이스마다 sources의 파일 내용, 비교 기준과의 diff, 커밋 SHA 기준 GitHub 링크를 casesModule에 넣는다 (plan.md 3.3)
// git을 쓸 수 없거나 비교 기준이 없으면 diff와 SHA는 비우고 빌드는 계속한다
function git(root: string, args: string[]) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

// 개요 크기 섹션용 비교 기준과의 파일·줄 수와 커밋 목록(오래된 것부터). git을 못 쓰면 비운다 (plan.md 3.4)
function readSize(root: string, base: string) {
  const shortstat = git(root, ["diff", "--shortstat", `${base}...HEAD`]) ?? "";
  const count = (word: string) => Number(shortstat.match(new RegExp(`(\\d+) ${word}`))?.[1] ?? 0);
  const log = git(root, ["log", "--reverse", "--format=%h%x09%s", `${base}..HEAD`]) ?? "";
  const commits = log
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, ...subject] = line.split("\t");
      return { sha, subject: subject.join("\t") };
    });
  return {
    stats: shortstat ? { files: count("files? changed"), additions: count("insertions?"), deletions: count("deletions?") } : null,
    commits,
  };
}

type SourceFile = { path: string; code: string; diff: string; url?: string };

// 모듈 이동으로 함께 넣는 파일 확장자 (plan.md 8)
const LINKABLE = /\.(tsx?|jsx?|mjs|cjs|css)$/;

// import·export from·동적 import의 경로 문자열 (plan.md 8)
function importSpecs(code: string) {
  const specs = [...code.matchAll(/\b(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?(["'])([^"'\n]+)\1/g)].map((m) => m[2]);
  const dynamic = [...code.matchAll(/\bimport\(\s*(["'])([^"'\n]+)\1\s*\)/g)].map((m) => m[2]);
  return [...specs, ...dynamic];
}

// PR 폴더의 케이스 파일 목록. pr.ts를 뺀 *.tsx를 파일 이름 순서로 (plan.md 3.4)
export function listCaseFiles(prDir: string) {
  return fs
    .readdirSync(prDir)
    .filter((f) => f.endsWith(".tsx"))
    .sort()
    .map((f) => path.join(prDir, f));
}

// PR 폴더를 `virtual:review-cases`로 주입한다 (plan.md 3.4)
// default: 케이스마다 { name, case, props(5.1), files(3.3) }, pr: pr.ts 또는 null, meta: PR번호·링크·제목·SHA·크기·커밋
function casesModule(prDir: string, config: ResolvedConfig, meta: { pr: string; prUrl?: string; title: string }): Plugin {
  const id = "virtual:review-cases";
  return {
    name: "review-cases",
    resolveId: (source) => (source === id ? "\0" + id : null),
    async load(resolved) {
      if (resolved !== "\0" + id) return null;
      const watch = (file: string) => this.addWatchFile(file);
      const { root, repoUrl } = config;
      const base = config.baseBranch ?? "origin/main";
      const sha = git(root, ["rev-parse", "HEAD"])?.trim() ?? "";
      // 설정 폴더가 git 루트가 아니면(Knot의 frontend/) GitHub 경로 앞에 붙인다
      const prefix = git(root, ["rev-parse", "--show-prefix"])?.trim() ?? "";
      const readFile = (p: string) => {
        const file = path.join(root, p);
        watch(file);
        return {
          path: p,
          code: fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "",
          diff: git(root, ["diff", `${base}...HEAD`, "--", p]) ?? "",
          url: repoUrl && sha ? `${repoUrl.replace(/\/$/, "")}/blob/${sha}/${prefix}${p}` : undefined,
        };
      };
      // 모듈 이동(plan.md 8): import 경로 문자열을 설정 폴더 기준 경로로 푼다. 넣지 않는 파일은 null
      const resolveImport = async (spec: string, importer: string) => {
        const resolved = await this.resolve(spec, path.join(root, importer));
        const file = resolved?.id.split("?")[0];
        if (!file || file.startsWith("\0") || file.includes("/node_modules/")) return null;
        if (!LINKABLE.test(file) || !fs.existsSync(file)) return null;
        const rel = path.relative(root, file);
        return rel.startsWith("..") || path.isAbsolute(rel) ? null : rel.split(path.sep).join("/");
      };
      const withImports = async (files: SourceFile[], keep?: Set<string>) =>
        Promise.all(
          files.map(async (f) => {
            const imports: Record<string, string> = {};
            for (const spec of new Set(importSpecs(f.code))) {
              const target = await resolveImport(spec, f.path);
              if (target && (!keep || keep.has(target))) imports[spec] = target;
            }
            return { ...f, imports };
          }),
        );
      const readFiles = async (casePath: string) => {
        const sources = readSources(casePath);
        const files = await withImports(sources.map(readFile));
        const linkedPaths = [...new Set(files.flatMap((f) => Object.values(f.imports)))].filter(
          (p) => !sources.includes(p),
        );
        const all = new Set([...sources, ...linkedPaths]);
        return { files, linked: await withImports(linkedPaths.map(readFile), all) };
      };

      const prFile = path.join(prDir, "pr.ts");
      const cases = listCaseFiles(prDir);
      const sourceSets = await Promise.all(cases.map(readFiles));
      const lines = [
        fs.existsSync(prFile) ? `export { default as pr } from ${JSON.stringify(prFile)};` : "export const pr = null;",
        ...cases.map((f, i) => `import c${i} from ${JSON.stringify(f)};`),
        `export const meta = ${JSON.stringify({ ...meta, sha, base, repoUrl: repoUrl?.replace(/\/$/, ""), ...readSize(root, base) })};`,
        `export default [${cases
          .map(
            (f, i) =>
              `{ name: ${JSON.stringify(caseName(f))}, case: c${i}, props: ${JSON.stringify(readProps(f, root, watch))}, files: ${JSON.stringify(sourceSets[i].files)}, linked: ${JSON.stringify(sourceSets[i].linked)} }`,
          )
          .join(",\n")}];`,
      ];
      return lines.join("\n");
    },
  };
}

// wrapper 파일을 `virtual:review-wrapper`로 주입한다. 없으면 children만 그린다 (plan.md 4.1, 11.2)
function wrapperModule(wrapper: string | undefined): Plugin {
  const id = "virtual:review-wrapper";
  return {
    name: "review-wrapper",
    resolveId: (source) => (source === id ? (wrapper ?? "\0" + id) : null),
    load: (resolved) =>
      resolved === "\0" + id ? "export default ({ children }) => children;" : null,
  };
}

// styles의 CSS 파일을 순서대로 import하는 `virtual:review-styles` (plan.md 11.2)
function stylesModule(files: string[]): Plugin {
  const id = "virtual:review-styles";
  return {
    name: "review-styles",
    resolveId: (source) => (source === id ? "\0" + id : null),
    load: (resolved) =>
      resolved === "\0" + id ? files.map((f) => `import ${JSON.stringify(f)};`).join("\n") : null,
  };
}

// 기존 MSW 핸들러 파일을 `virtual:review-handlers`로 주입한다. 없으면 빈 배열 (plan.md 6.1)
function handlersModule(file: string | undefined): Plugin {
  const id = "virtual:review-handlers";
  return {
    name: "review-handlers",
    resolveId: (source) => (source === id ? "\0" + id : null),
    load(resolved) {
      if (resolved !== "\0" + id) return null;
      if (!file) return "export default [];";
      // 없는 export를 정적으로 참조하면 번들러가 IMPORT_IS_UNDEFINED 경고를 내므로 Reflect.get으로 읽는다 (plan.md 11.1)
      return `import * as m from ${JSON.stringify(file)};\nexport default Reflect.get(m, "default") ?? Reflect.get(m, "handlers") ?? [];`;
    },
  };
}

export function caseName(casePath: string) {
  return path.basename(casePath).replace(/\.tsx?$/, "");
}

export function viteConfig(config: ResolvedConfig, prDir: string, pr?: string): InlineConfig {
  const cases = listCaseFiles(prDir);
  if (cases.length === 0) throw new Error(`PR 폴더에 케이스 파일(*.tsx)이 없습니다: ${prDir}`);
  const folder = path.basename(prDir);
  // plan.md 7. PR번호는 --pr, 없으면 폴더 이름 앞의 숫자
  const prNumber = pr ?? folder.match(/^\d+/)?.[0] ?? "local";
  const isNumber = /^\d+$/.test(prNumber);
  // plan.md 10. pr.ts 제목, 없으면 첫 케이스 제목, 그것도 없으면 폴더 이름
  const name = readTitle(path.join(prDir, "pr.ts")) ?? readTitle(cases[0]) ?? folder;
  const title = isNumber ? `#${prNumber} ${name}` : name;
  const prUrl = isNumber && config.repoUrl ? `${config.repoUrl.replace(/\/$/, "")}/pull/${prNumber}` : undefined;
  return {
    configFile: false,
    root: fromKit("src/runtime"),
    cacheDir: path.join(config.root, "node_modules/.review-kit"),
    plugins: [
      targetPackages(config.root, config.sharedPackages),
      ...(config.svgr ? [svgr(config.svgr)] : []),
      ...(config.plugins ?? []),
      casesModule(prDir, config, { pr: prNumber, prUrl, title }),
      wrapperModule(config.wrapper),
      handlersModule(config.mockHandlers),
      stylesModule(config.styles),
      titleHtml(title),
    ],
    oxc: { jsx: { runtime: "automatic", importSource: config.jsxImportSource ?? "react" } },
    define: config.define,
    resolve: {
      alias: { ...config.alias, "review-kit": fromKit("src/index.ts") },
    },
    server: { fs: { allow: [kitRoot, config.root] } },
  };
}
