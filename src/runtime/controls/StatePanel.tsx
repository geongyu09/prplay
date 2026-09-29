import { useRef, useState } from "react";

type Props = {
  getJson: () => string;
  onApply: (json: string) => string | null; // 실패하면 오류 메시지
  onReset: () => void;
};

// plan.md 7. JSON 복사/붙여넣기와 초기화. 아티팩트에서는 confirm()과 클립보드 읽기가 막혀 있어 화면 안 UI로 만든다
export function StatePanel({ getJson, onApply, onReset }: Props) {
  const [mode, setMode] = useState<"idle" | "copied" | "manual-copy" | "paste" | "confirm-reset">("idle");
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const copyRef = useRef<HTMLTextAreaElement>(null);

  const copy = () => {
    const json = getJson();
    // 클릭 핸들러 안에서 바로 불러야 아티팩트에서도 동작한다
    navigator.clipboard
      .writeText(json)
      .then(() => setMode("copied"))
      .catch(() => {
        setMode("manual-copy");
        requestAnimationFrame(() => copyRef.current?.select());
      });
  };

  return (
    <div className="rv-state">
      <div className="rv-row">
        <button type="button" className="rv-button" onClick={copy}>
          JSON 복사
        </button>
        <button
          type="button"
          className="rv-button"
          onClick={() => {
            setMode("paste");
            setError(null);
          }}
        >
          JSON 붙여넣기
        </button>
        <button type="button" className="rv-button rv-button-danger" onClick={() => setMode("confirm-reset")}>
          초기화
        </button>
      </div>

      {mode === "copied" && <p className="rv-note">복사했습니다.</p>}
      {mode === "manual-copy" && (
        <>
          <p className="rv-note">클립보드에 쓰지 못했습니다. 아래 내용을 직접 복사하세요.</p>
          <textarea ref={copyRef} className="rv-textarea" readOnly rows={6} value={getJson()} />
        </>
      )}
      {mode === "paste" && (
        <>
          <textarea
            className="rv-textarea"
            rows={6}
            placeholder='{"props": {...}, "scenarios": {...}}'
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          {error && <span className="rv-field-error">{error}</span>}
          <div className="rv-row">
            <button
              type="button"
              className="rv-button rv-button-primary"
              onClick={() => {
                const message = onApply(pasteText);
                if (message) setError(message);
                else {
                  setMode("idle");
                  setPasteText("");
                }
              }}
            >
              적용
            </button>
            <button type="button" className="rv-button" onClick={() => setMode("idle")}>
              취소
            </button>
          </div>
        </>
      )}
      {mode === "confirm-reset" && (
        <div className="rv-row">
          <span className="rv-note">편집한 값을 모두 지우고 기본값으로 돌아갈까요?</span>
          <button
            type="button"
            className="rv-button rv-button-danger"
            onClick={() => {
              onReset();
              setMode("idle");
            }}
          >
            초기화
          </button>
          <button type="button" className="rv-button" onClick={() => setMode("idle")}>
            취소
          </button>
        </div>
      )}
    </div>
  );
}
