import { useMemo, useState } from "react";
import { Highlight, themes } from "prism-react-renderer";

// 소스 문법 강조 (plan.md 8). 크기 비교 결과 prism-react-renderer를 쓴다 (4.3)
function languageOf(path: string) {
  if (/\.[jt]sx$/.test(path)) return "tsx";
  if (/\.[cm]?[jt]s$/.test(path)) return "typescript";
  if (/\.css$/.test(path)) return "css";
  return null;
}

// 토큰 글자와 종류를 받아 이동할 파일 path를 돌려준다 (plan.md 8 모듈 이동)
export type LinkOf = (content: string, types: string[]) => string | undefined;

type CodeProps = {
  code: string;
  path: string;
  linkOf?: LinkOf;
  onJump?: (target: string) => void;
};

export function Code({ code, path, linkOf, onJump }: CodeProps) {
  const language = languageOf(path);
  const regions = useMemo(() => foldRegions(code.split("\n")), [code]);
  // 접힌 범위의 시작 줄 번호(0부터). 파일이 바뀌면 CodePanel이 key로 다시 마운트해 모두 펼친다 (plan.md 8)
  const [folded, setFolded] = useState<Set<number>>(() => new Set());
  const toggle = (start: number) =>
    setFolded((prev) => {
      const next = new Set(prev);
      if (next.has(start)) next.delete(start);
      else next.add(start);
      return next;
    });

  if (!language) return <pre className="rv-pre">{code}</pre>;
  return (
    <Highlight code={code} language={language} theme={themes.github}>
      {({ tokens, getLineProps, getTokenProps }) => {
        const rows = [];
        let hiddenUntil = -1;
        for (let i = 0; i < tokens.length; i++) {
          if (i <= hiddenUntil) continue;
          const line = tokens[i];
          const end = regions.get(i);
          const isFolded = end !== undefined && folded.has(i);
          if (isFolded) hiddenUntil = end;
          rows.push(
            <div key={i} {...getLineProps({ line })}>
              <span className="rv-line-no" aria-hidden="true">
                {i + 1}
              </span>
              {end !== undefined ? (
                <button
                  type="button"
                  className={isFolded ? "rv-fold rv-folded" : "rv-fold"}
                  aria-expanded={!isFolded}
                  aria-label={isFolded ? `${i + 1}번 줄 펼치기` : `${i + 1}번 줄 접기`}
                  onClick={() => toggle(i)}
                >
                  {isFolded ? "›" : "⌄"}
                </button>
              ) : (
                <span className="rv-fold" aria-hidden="true" />
              )}
              {line.map((token, j) => {
                const target = linkOf?.(token.content, token.types);
                const props = getTokenProps({ token });
                if (!target || !onJump) return <span key={j} {...props} />;
                return (
                  <span
                    key={j}
                    {...props}
                    className={`${props.className} rv-jump`}
                    title={target}
                    onClick={(e) => {
                      if (!e.metaKey && !e.ctrlKey) return;
                      e.preventDefault();
                      onJump(target);
                    }}
                  />
                );
              })}
              {isFolded && (
                <button
                  type="button"
                  className="rv-fold-ellipsis"
                  title={`${end - i}줄 접힘`}
                  onClick={() => toggle(i)}
                >
                  ⋯
                </button>
              )}
            </div>,
          );
        }
        return <pre className="rv-pre rv-code-lines">{rows}</pre>;
      }}
    </Highlight>
  );
}

// 접는 범위 (plan.md 8 코드 접기). 시작 줄 번호 → 끝 줄 번호(포함, 0부터).
// 들여쓰기 기반: 다음 비어 있지 않은 줄이 더 깊으면 시작, 같거나 얕은 줄 직전까지. 끝의 빈 줄은 뺀다
export function foldRegions(lines: string[]): Map<number, number> {
  const regions = new Map<number, number>();
  const indent = (s: string) => s.match(/^\s*/)![0].length;
  const blank = (s: string) => s.trim() === "";

  for (let i = 0; i < lines.length; i++) {
    if (blank(lines[i])) continue;
    const depth = indent(lines[i]);
    let j = i + 1;
    while (j < lines.length && blank(lines[j])) j++;
    if (j >= lines.length || indent(lines[j]) <= depth) continue;
    let end = j;
    for (let k = j + 1; k < lines.length; k++) {
      if (blank(lines[k])) continue;
      if (indent(lines[k]) <= depth) break;
      end = k;
    }
    regions.set(i, end);
  }

  // import 묶음: 연달아 있는 import 문 전체(사이 빈 줄 포함)를 하나로. 같은 줄의 들여쓰기 범위보다 우선한다
  const isImportStart = (s: string) => /^\s*import\b/.test(s);
  const isImportEnd = (s: string) => /\bfrom\s+["'][^"']+["']\s*;?\s*$/.test(s) || /^\s*import\s+["'][^"']+["']\s*;?\s*$/.test(s);
  for (let i = 0; i < lines.length; i++) {
    if (!isImportStart(lines[i])) continue;
    let last = -1;
    let j = i;
    while (j < lines.length) {
      if (!isImportStart(lines[j])) {
        if (blank(lines[j]) && last >= 0) {
          j++;
          continue;
        }
        break;
      }
      while (j < lines.length && !isImportEnd(lines[j])) j++;
      if (j >= lines.length) break;
      last = j;
      j++;
    }
    if (last > i) regions.set(i, last);
    i = Math.max(i, last);
  }
  return regions;
}
