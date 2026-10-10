import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { linter, lintGutter } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { useEffect, useRef } from "react";

// 파일 크기를 줄이려고 basicSetup 대신 JSON 편집에 필요한 것만 넣는다
const extensions = [
  history(),
  keymap.of([...defaultKeymap, ...historyKeymap]),
  json(),
  syntaxHighlighting(defaultHighlightStyle),
  bracketMatching(),
  linter(jsonParseLinter()),
  lintGutter(),
  EditorView.lineWrapping,
  EditorView.theme({
    "&": { fontSize: "15px", border: "1px solid var(--rv-line)", borderRadius: "6px", background: "#fff" },
    "&.cm-focused": { outline: "2px solid var(--rv-accent)", outlineOffset: "-1px" },
    ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", maxHeight: "240px" },
  }),
];

// 목 body JSON 편집기 (plan.md 6.3). 리뷰 화면이 Shadow DOM 안이라
// CodeMirror는 부모 요소의 root(shadowRoot)를 찾아 그 안에 스타일을 넣는다 (plan.md 4.3)
export function JsonEditor({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const view = new EditorView({
      parent: parentRef.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          ...extensions,
          EditorView.contentAttributes.of({ id, "aria-label": "body JSON" }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => view.destroy();
    // 편집기는 한 번만 만들고, 값은 아래 effect로 맞춘다
  }, []);

  // 시나리오 전환이나 "원래대로"처럼 바깥에서 값이 바뀌면 편집기 내용을 바꾼다
  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  return <div ref={parentRef} className="rv-json" />;
}
