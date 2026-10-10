#!/usr/bin/env node
// PR 폴더 글의 금지 표현 검사 (plan.md 11장 글쓰기 규칙, writing-rules.md)
// 사용법: node check-writing.mjs <PR 폴더나 파일>...
// 위반이 있으면 파일:줄, 걸린 글, 걸린 패턴을 출력하고 1로 끝난다
import { parse } from "@babel/parser";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirs = process.argv.slice(2);
if (dirs.length === 0) {
  console.error("사용법: node check-writing.mjs <PR 폴더>...");
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const patterns = fs
  .readFileSync(path.join(here, "../banned-patterns.txt"), "utf8")
  .split("\n")
  .filter((p) => p.trim())
  .map((p) => ({ source: p, re: new RegExp(p, "u") }));

const HANGUL = /[가-힣]/;
// 코드 이름이나 원문을 그대로 두는 값
const SKIP_KEYS = new Set(["url", "file", "files", "since", "code", "snippet", "data", "links"]);

function* walk(dir) {
  if (fs.statSync(dir).isFile()) return yield dir;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (/\.tsx?$/.test(entry.name)) yield p;
  }
}

const keyName = (prop) => prop.key?.name ?? prop.key?.value;

// 글 조각마다 { line, text }를 모은다
function collect(file) {
  const source = fs.readFileSync(file, "utf8");
  const ast = parse(source, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const out = [];
  const push = (text, line) => {
    if (HANGUL.test(text)) text.split("\n").forEach((t, i) => out.push({ line: line + i, text: t }));
  };

  for (const c of ast.comments ?? []) push(c.value, c.loc.start.line);

  const visit = (node, parentKey, depth) => {
    if (!node || typeof node.type !== "string") return;
    switch (node.type) {
      case "ImportDeclaration":
      case "ExportAllDeclaration":
        return;
      case "StringLiteral":
        return push(node.value, node.loc.start.line);
      case "TemplateLiteral":
        for (const q of node.quasis) {
          const text = q.value.cooked ?? q.value.raw;
          if (parentKey === "svg") {
            // svg는 <text> 안 글자만 본다
            for (const m of text.matchAll(/<text[^>]*>([^<]*)<\/text>/g)) {
              push(m[1], q.loc.start.line + text.slice(0, m.index).split("\n").length - 1);
            }
          } else push(text, q.loc.start.line);
        }
        node.expressions.forEach((e) => visit(e, null, depth));
        return;
      case "JSXText":
        return push(node.value, node.loc.start.line);
      case "ObjectProperty": {
        const key = keyName(node);
        // 프리셋, 시나리오 이름은 문자열 키로 쓴다
        if (node.key.type === "StringLiteral") push(key, node.key.loc.start.line);
        // pr.ts 맨 위 title(definePr 인자의 title)은 PR 제목 원문이고, name은 CI 이름이다
        if (SKIP_KEYS.has(key) || (isPr && ((key === "title" && depth === 0) || key === "name"))) return;
        return visit(node.value, key, depth + 1);
      }
      case "ObjectExpression":
        return node.properties.forEach((p) => visit(p, parentKey, depth));
    }
    for (const [k, v] of Object.entries(node)) {
      if (k === "loc" || k === "leadingComments" || k === "trailingComments" || k === "innerComments") continue;
      if (Array.isArray(v)) v.forEach((n) => visit(n, parentKey, depth));
      else if (v && typeof v === "object") visit(v, parentKey, depth);
    }
  };

  const isPr = /\bdefinePr\(/.test(source);
  // definePr({...})의 인자 객체를 깊이 0으로 센다
  const visitTop = (node) => {
    if (!node || typeof node.type !== "string") return;
    if (node.type === "CallExpression" && node.callee?.name === "definePr" && node.arguments[0]?.type === "ObjectExpression") {
      return node.arguments[0].properties.forEach((p) => visit(p, null, 0));
    }
    if (node.type === "ObjectProperty" || node.type === "StringLiteral" || node.type === "TemplateLiteral" || node.type === "JSXText") {
      return visit(node, null, 1);
    }
    if (node.type === "ImportDeclaration") return;
    for (const [k, v] of Object.entries(node)) {
      if (k === "loc" || k.endsWith("Comments")) continue;
      if (Array.isArray(v)) v.forEach(visitTop);
      else if (v && typeof v === "object") visitTop(v);
    }
  };
  visitTop(ast.program);
  return out;
}

let count = 0;
for (const dir of dirs) {
  for (const file of walk(dir)) {
    for (const { line, text } of collect(file)) {
      // 백틱 인라인 코드와 URL은 글이 아니다
      const prose = text.replace(/`[^`]*`/g, "").replace(/https?:\/\/[^\s)>\]"']+/g, "");
      for (const { source, re } of patterns) {
        if (!re.test(prose)) continue;
        count++;
        console.log(`${file}:${line}: ${text.trim()}\n  패턴: ${source}`);
      }
    }
  }
}

if (count > 0) {
  console.log(`\n금지 표현 ${count}건. writing-rules.md의 금지 표현 목록을 보고 뜻을 바꾸지 않고 고쳐 쓴 뒤 다시 돌린다.`);
  process.exit(1);
}
console.log("금지 표현 없음");
