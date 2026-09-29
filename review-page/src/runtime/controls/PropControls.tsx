import { useEffect, useState } from "react";
import type { PropMeta } from "virtual:review-cases";

type Props = {
  values: Record<string, unknown>;
  meta: Record<string, PropMeta>;
  onChange: (name: string, value: unknown) => void;
};

// 케이스 props 키마다 컨트롤을 만든다. 타입은 docgen, 없으면 기본값의 typeof (plan.md 5.1)
export function resolveMeta(name: string, value: unknown, meta: Record<string, PropMeta>): PropMeta {
  const found = meta[name];
  if (found) return found;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return { kind: t };
  if (t === "function") return { kind: "function" };
  return { kind: "json" };
}

export function PropControls({ values, meta, onChange }: Props) {
  const entries = Object.entries(values)
    .map(([name, value]) => [name, value, resolveMeta(name, value, meta)] as const)
    .filter(([, , m]) => m.kind !== "function" && m.kind !== "node");

  if (entries.length === 0) return <p className="rv-empty">편집할 props가 없습니다.</p>;

  return (
    <div className="rv-controls">
      {entries.map(([name, value, m]) => (
        <label key={name} className="rv-field">
          <span className="rv-field-name">
            {name}
            {m.raw && <code className="rv-field-type">{m.raw}</code>}
          </span>
          <Control name={name} value={value} meta={m} onChange={onChange} />
          {m.description && <span className="rv-field-desc">{m.description}</span>}
        </label>
      ))}
    </div>
  );
}

function Control({
  name,
  value,
  meta,
  onChange,
}: {
  name: string;
  value: unknown;
  meta: PropMeta;
  onChange: Props["onChange"];
}) {
  switch (meta.kind) {
    case "string":
      return (
        <input
          className="rv-input"
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(name, e.target.value)}
        />
      );
    case "number":
      return (
        <input
          className="rv-input"
          type="number"
          value={Number.isFinite(value) ? String(value) : ""}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            if (!Number.isNaN(n)) onChange(name, n);
          }}
        />
      );
    case "boolean":
      return (
        <input
          className="rv-checkbox"
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(name, e.target.checked)}
        />
      );
    case "select": {
      const options = meta.options ?? [];
      const index = options.findIndex((o) => Object.is(o, value));
      return (
        <select
          className="rv-input"
          value={index}
          onChange={(e) => onChange(name, options[Number(e.target.value)])}
        >
          {index < 0 && <option value={-1}>{JSON.stringify(value)}</option>}
          {options.map((o, i) => (
            <option key={i} value={i}>
              {JSON.stringify(o)}
            </option>
          ))}
        </select>
      );
    }
    default:
      return <JsonControl value={value} onChange={(v) => onChange(name, v)} />;
  }
}

// 객체·배열·풀지 못한 타입. 올바른 JSON일 때만 반영한다
function JsonControl({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
    setError(null);
  }, [value]);

  return (
    <>
      <textarea
        className="rv-textarea"
        value={text}
        rows={Math.min(8, text.split("\n").length)}
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            setError(null);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      />
      {error && <span className="rv-field-error">{error}</span>}
    </>
  );
}
