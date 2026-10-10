import { useEffect, useMemo, useRef, useState } from "react";
import type { SourceFile } from "virtual:review-cases";

import { Code, type LinkOf } from "./Highlight";

// 코드 패널 (plan.md 8). 탭: 소스 전체, PR diff, 영향 범위. 결정 목록은 개요 탭에 있다 (3.4)
type Tab = "source" | "diff" | "impacts";

const TABS: { id: Tab; label: string }[] = [
  { id: "source", label: "소스" },
  { id: "diff", label: "diff" },
  { id: "impacts", label: "영향 범위" },
];

type Props = {
  files: SourceFile[];
  linked: SourceFile[];
  sha: string;
  base: string;
  impacts: string[];
};

export function CodePanel({ files, linked, sha, base, impacts }: Props) {
  const [tab, setTab] = useState<Tab>("source");
  const [fileIndex, setFileIndex] = useState(0);
  // 모듈 이동으로 연 파일 path. 마지막이 지금 보는 파일이다 (plan.md 8)
  const [trail, setTrail] = useState<string[]>([]);
  const byPath = useMemo(() => new Map([...files, ...linked].map((f) => [f.path, f])), [files, linked]);
  const jumped = trail.length > 0 ? byPath.get(trail[trail.length - 1]) : undefined;
  const file = jumped ?? files[fileIndex];
  const linkOf = useMemo(() => (file ? linkResolver(file) : undefined), [file]);
  const modifier = useModifierKey();

  return (
    <section className={modifier ? "rv-code rv-modifier" : "rv-code"} aria-label="코드">
      <div className="rv-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className="rv-tab"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        {sha && (
          <span className="rv-note rv-sha" title={sha}>
            {sha.slice(0, 7)}
          </span>
        )}
      </div>

      {(tab === "source" || tab === "diff") &&
        (file ? (
          <>
            <div className="rv-file-bar">
              {jumped && (
                <button
                  type="button"
                  className="rv-button rv-button-small"
                  onClick={() => setTrail((t) => t.slice(0, -1))}
                >
                  ← 뒤로
                </button>
              )}
              {!jumped && files.length > 1 ? (
                <select
                  className="rv-input"
                  value={fileIndex}
                  onChange={(e) => {
                    setFileIndex(Number(e.target.value));
                    setTrail([]);
                  }}
                >
                  {files.map((f, i) => (
                    <option key={f.path} value={i}>
                      {f.path}
                    </option>
                  ))}
                </select>
              ) : file.url ? (
                <a href={file.url} target="_blank" rel="noopener" className="rv-link">
                  <code>{file.path}</code>
                </a>
              ) : (
                <code>{file.path}</code>
              )}
              {file.url && <FileLink url={file.url} showLink={!jumped && files.length > 1} />}
            </div>
            {tab === "source" ? (
              file.code ? (
                <Code
                  key={file.path}
                  code={file.code}
                  path={file.path}
                  linkOf={linkOf}
                  onJump={(target) => target !== file.path && setTrail((t) => [...t, target])}
                />
              ) : <p className="rv-empty">파일을 읽지 못했습니다.</p>
            ) : file.diff ? (
              <Diff text={file.diff} />
            ) : (
              <p className="rv-empty">비교 기준({base})과 달라진 내용 없음</p>
            )}
          </>
        ) : (
          <p className="rv-empty">케이스에 sources가 없습니다.</p>
        ))}

      {tab === "impacts" &&
        (impacts.length > 0 ? (
          <ul className="rv-list">
            {impacts.map((p) => (
              <li key={p}>
                <code>{p}</code>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rv-empty">영향받는 다른 파일이 없습니다.</p>
        ))}
    </section>
  );
}

// 모듈 이동(plan.md 8): import 경로 문자열과 import로 들여온 이름을 이동할 파일 path로 바꾼다
function linkResolver(file: SourceFile): LinkOf | undefined {
  if (Object.keys(file.imports).length === 0) return undefined;
  const names = new Map<string, string>();
  for (const m of file.code.matchAll(/\bimport\s+(?:type\s+)?([\w*{}\s,$]+?)\s+from\s+(["'])([^"'\n]+)\2/g)) {
    const target = file.imports[m[3]];
    if (!target) continue;
    const clause = m[1];
    const braces = clause.match(/\{([^}]*)\}/)?.[1] ?? "";
    for (const part of braces.split(",")) {
      const local = part.replace(/^\s*type\s+/, "").split(/\s+as\s+/).pop()?.trim();
      if (local) names.set(local, target);
    }
    const rest = clause.replace(/\{[^}]*\}/, "");
    const ns = rest.match(/\*\s+as\s+([\w$]+)/)?.[1];
    if (ns) names.set(ns, target);
    const def = rest.replace(/\*\s+as\s+[\w$]+/, "").match(/^\s*([\w$]+)/)?.[1];
    if (def) names.set(def, target);
  }
  return (content, types) => {
    if (types.includes("comment")) return undefined;
    if (types.includes("string")) return file.imports[content.replace(/^(["'])(.*)\1$/, "$2")];
    return names.get(content.trim());
  };
}

// Cmd나 Ctrl을 누르고 있는지. 누르는 동안 이동할 수 있는 토큰에 밑줄을 보여 준다 (plan.md 8)
function useModifierKey() {
  const [down, setDown] = useState(false);
  useEffect(() => {
    const update = (e: KeyboardEvent) => setDown(e.metaKey || e.ctrlKey);
    const reset = () => setDown(false);
    window.addEventListener("keydown", update);
    window.addEventListener("keyup", update);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", update);
      window.removeEventListener("keyup", update);
      window.removeEventListener("blur", reset);
    };
  }, []);
  return down;
}

// window.open은 아티팩트에서 대부분 null이므로 링크로 새 탭을 열고, 복사 버튼을 같이 둔다 (plan.md 8)
function FileLink({ url, showLink }: { url: string; showLink: boolean }) {
  const [mode, setMode] = useState<"idle" | "copied" | "manual-copy">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <span className="rv-row">
      {showLink && (
        <a href={url} target="_blank" rel="noopener" className="rv-link">
          GitHub에서 보기
        </a>
      )}
      <button
        type="button"
        className="rv-button rv-button-small"
        onClick={() =>
          navigator.clipboard.writeText(url).then(
            () => {
              setMode("copied");
              setTimeout(() => setMode("idle"), 1500);
            },
            // 클립보드에 쓰지 못하면 URL을 선택해 둔다 (plan.md 7)
            () => {
              setMode("manual-copy");
              requestAnimationFrame(() => inputRef.current?.select());
            },
          )
        }
      >
        {mode === "copied" ? "복사됨" : "링크 복사"}
      </button>
      {mode === "manual-copy" && (
        <input ref={inputRef} className="rv-input" readOnly value={url} aria-label="GitHub 링크" />
      )}
    </span>
  );
}

// diff는 +, - 줄 색만 칠한다 (plan.md 8)
function Diff({ text }: { text: string }) {
  return (
    <pre className="rv-pre">
      {text.split("\n").map((line, i) => {
        const kind = line.startsWith("+++") || line.startsWith("---")
          ? "meta"
          : line.startsWith("+")
            ? "add"
            : line.startsWith("-")
              ? "del"
              : line.startsWith("@@")
                ? "hunk"
                : "";
        return (
          <span key={i} className={kind ? `rv-diff-line rv-diff-${kind}` : "rv-diff-line"}>
            {line || " "}
          </span>
        );
      })}
    </pre>
  );
}
