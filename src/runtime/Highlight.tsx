import { Highlight, themes } from "prism-react-renderer";

// 소스 문법 강조 (plan.md 8). 크기 비교 결과 prism-react-renderer를 쓴다 (4.3)
function languageOf(path: string) {
  if (/\.[jt]sx$/.test(path)) return "tsx";
  if (/\.[cm]?[jt]s$/.test(path)) return "typescript";
  if (/\.css$/.test(path)) return "css";
  return null;
}

export function Code({ code, path }: { code: string; path: string }) {
  const language = languageOf(path);
  if (!language) return <pre className="rv-pre">{code}</pre>;
  return (
    <Highlight code={code} language={language} theme={themes.github}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className="rv-pre rv-code-lines">
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              <span className="rv-line-no" aria-hidden="true">
                {i + 1}
              </span>
              {line.map((token, j) => (
                <span key={j} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}
