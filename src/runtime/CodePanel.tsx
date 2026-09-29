import { useRef, useState } from "react";
import type { SourceFile } from "virtual:review-sources";

import { Code } from "./Highlight";

// 코드 패널 (plan.md 8). 탭: 소스 전체, PR diff, 결정 목록, 영향 범위
type Tab = "source" | "diff" | "decisions" | "impacts";

const TABS: { id: Tab; label: string }[] = [
  { id: "source", label: "소스" },
  { id: "diff", label: "diff" },
  { id: "decisions", label: "결정" },
  { id: "impacts", label: "영향 범위" },
];

type Props = {
  files: SourceFile[];
  sha: string;
  base: string;
  decisions: string[];
  impacts: string[];
};

export function CodePanel({ files, sha, base, decisions, impacts }: Props) {
  const [tab, setTab] = useState<Tab>("source");
  const [fileIndex, setFileIndex] = useState(0);
  const file = files[fileIndex];

  return (
    <section className="rv-code" aria-label="코드">
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
              {files.length > 1 ? (
                <select
                  className="rv-input"
                  value={fileIndex}
                  onChange={(e) => setFileIndex(Number(e.target.value))}
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
              {file.url && <FileLink url={file.url} showLink={files.length > 1} />}
            </div>
            {tab === "source" ? (
              file.code ? <Code code={file.code} path={file.path} /> : <p className="rv-empty">파일을 읽지 못했습니다.</p>
            ) : file.diff ? (
              <Diff text={file.diff} />
            ) : (
              <p className="rv-empty">비교 기준({base})과 달라진 내용 없음</p>
            )}
          </>
        ) : (
          <p className="rv-empty">케이스에 sources가 없습니다.</p>
        ))}

      {tab === "decisions" &&
        (decisions.length > 0 ? (
          <ol className="rv-decisions">
            {decisions.slice(0, 5).map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ol>
        ) : (
          <p className="rv-empty">적힌 결정이 없습니다.</p>
        ))}

      {tab === "impacts" &&
        (impacts.length > 0 ? (
          <ul className="rv-decisions">
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
            // 클립보드에 쓰지 못하면 주소를 선택해 둔다 (plan.md 7)
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
