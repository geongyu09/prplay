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

// 케이스 파일을 `virtual:review-case`로 주입한다 (plan.md 2.2)
export function caseModule(casePath: string): Plugin {
  const id = "virtual:review-case";
  return {
    name: "review-case",
    resolveId: (source) => (source === id ? casePath : null),
  };
}

// 케이스의 sources 첫 파일에서 컴포넌트 props를 읽어 `virtual:review-props`로 주입한다 (plan.md 5.1)
// 케이스 파일은 TSX라 Node에서 import할 수 없으므로 sources 배열만 정규식으로 읽는다 (plan.md 3.3)
function readSources(casePath: string): string[] {
  const text = fs.readFileSync(casePath, "utf8");
  // 경로에 `]`가 들어갈 수 있으므로(`[workspaceId]`) 문자열 리터럴 단위로 읽는다
  const match = text.match(/sources:\s*\[((?:\s*(["'`])(?:(?!\2).)*\2\s*,?)*)\s*\]/);
  if (!match) return [];
  return [...match[1].matchAll(/(["'`])((?:(?!\1).)+)\1/g)].map((m) => m[2]);
}

// 결과 HTML의 정적 <title>. 아티팩트 갤러리 이름이 이 태그에서 나오므로 케이스 title을 넣는다 (plan.md 10)
function readTitle(casePath: string): string {
  const text = fs.readFileSync(casePath, "utf8");
  return text.match(/title:\s*(["'`])((?:(?!\1).)+)\1/)?.[2] ?? caseName(casePath);
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function titleHtml(casePath: string): Plugin {
  return {
    name: "review-title",
    transformIndexHtml: (html) =>
      html.replace(/<title>[^<]*<\/title>/, `<title>Review · ${escapeHtml(readTitle(casePath))}</title>`),
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

export function propsModule(casePath: string, root: string): Plugin {
  const id = "virtual:review-props";
  return {
    name: "review-props",
    resolveId: (source) => (source === id ? "\0" + id : null),
    load(resolved) {
      if (resolved !== "\0" + id) return null;
      const [source] = readSources(casePath);
      const props: Record<string, unknown> = {};
      if (source) {
        const file = path.join(root, source);
        this.addWatchFile(file);
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
      }
      return `export default ${JSON.stringify(props)};`;
    },
  };
}

// sources의 파일 내용, 비교 기준과의 diff, 커밋 SHA 기준 GitHub 링크를 `virtual:review-sources`로 주입한다 (plan.md 3.3)
// git을 쓸 수 없거나 비교 기준이 없으면 diff와 SHA는 비우고 빌드는 계속한다
function git(root: string, args: string[]) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

export function sourcesModule(casePath: string, config: ResolvedConfig): Plugin {
  const id = "virtual:review-sources";
  return {
    name: "review-sources",
    resolveId: (source) => (source === id ? "\0" + id : null),
    load(resolved) {
      if (resolved !== "\0" + id) return null;
      const { root, repoUrl } = config;
      const base = config.baseBranch ?? "origin/main";
      const sha = git(root, ["rev-parse", "HEAD"])?.trim() ?? "";
      // 설정 폴더가 git 루트가 아니면(Knot의 frontend/) GitHub 경로 앞에 붙인다
      const prefix = git(root, ["rev-parse", "--show-prefix"])?.trim() ?? "";
      const files = readSources(casePath).map((p) => {
        const file = path.join(root, p);
        this.addWatchFile(file);
        return {
          path: p,
          code: fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "",
          diff: git(root, ["diff", `${base}...HEAD`, "--", p]) ?? "",
          url: repoUrl && sha ? `${repoUrl.replace(/\/$/, "")}/blob/${sha}/${prefix}${p}` : undefined,
        };
      });
      return `export default ${JSON.stringify({ sha, base, files })};`;
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

export function viteConfig(config: ResolvedConfig, casePath: string, pr?: string): InlineConfig {
  const name = caseName(casePath);
  // plan.md 7. PR번호는 --pr, 없으면 케이스 파일 이름 앞의 숫자
  const prNumber = pr ?? name.match(/^\d+/)?.[0] ?? "local";
  return {
    configFile: false,
    root: fromKit("src/runtime"),
    cacheDir: path.join(config.root, "node_modules/.review-kit"),
    plugins: [
      targetPackages(config.root, config.sharedPackages),
      ...(config.svgr ? [svgr(config.svgr)] : []),
      ...(config.plugins ?? []),
      caseModule(casePath),
      propsModule(casePath, config.root),
      sourcesModule(casePath, config),
      wrapperModule(config.wrapper),
      handlersModule(config.mockHandlers),
      stylesModule(config.styles),
      titleHtml(casePath),
    ],
    oxc: { jsx: { runtime: "automatic", importSource: config.jsxImportSource ?? "react" } },
    define: {
      ...config.define,
      __REVIEW_STORAGE_KEY__: JSON.stringify(`review-kit:${prNumber}:${name}`),
    },
    resolve: {
      alias: { ...config.alias, "review-kit": fromKit("src/index.ts") },
    },
    server: { fs: { allow: [kitRoot, config.root] } },
  };
}
