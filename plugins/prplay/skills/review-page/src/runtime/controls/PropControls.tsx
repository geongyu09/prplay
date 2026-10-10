import { useEffect, useState } from "react";
import type { PropMeta } from "virtual:review-cases";

// 케이스 controls 한 키 (review-kit PropControl를 타입 인자 없이 본 모양)
type ControlSpec = { options?: readonly unknown[]; min?: number; max?: number; step?: number };

type Props = {
  values: Record<string, unknown>;
  meta: Record<string, PropMeta>;
  controls: Record<string, ControlSpec | undefined>;
  onChange: (name: string, value: unknown) => void;
};

const isPrimitive = (t: string): t is "string" | "number" | "boolean" =>
  t === "string" || t === "number" || t === "boolean";

// 케이스 props 키마다 컨트롤을 만든다. 타입은 docgen, 없거나 풀지 못했으면 기본값의 typeof.
// 케이스 controls의 options·범위가 그 위에 덮인다 (plan.md 5.1)
export function resolveMeta(
  name: string,
  value: unknown,
  meta: Record<string, PropMeta>,
  control?: ControlSpec,
): PropMeta {
  const t = typeof value;
  let base: PropMeta = meta[name] ?? { kind: "json" };
  if (!meta[name] && t === "function") base = { kind: "function" };
  else if (base.kind === "json" && isPrimitive(t)) base = { ...base, kind: t };
  if (!control) return base;
  const { options, min, max, step } = control;
  return { ...base, ...(options && { kind: "select", options: [...options] }), min, max, step };
}

export function PropControls({ values, meta, controls, onChange }: Props) {
  const entries = Object.entries(values)
    .map(([name, value]) => [name, value, resolveMeta(name, value, meta, controls[name])] as const)
    .filter(([, , m]) => m.kind !== "function" && m.kind !== "node");

  if (entries.length === 0) return <p className="rv-empty">편집할 props가 없습니다.</p>;

  return (
    <div className="rv-controls">
      {entries.map(([name, value, m]) => (
        <label key={name} className="rv-field">
          <span className="rv-field-name">
            {name}
            {m.raw && <code className="rv-field-type">{m.raw}</code>}
            {m.kind === "number" && rangeText(m) && <span className="rv-field-range">{rangeText(m)}</span>}
          </span>
          <Control name={name} value={value} meta={m} onChange={onChange} />
          {m.description && <span className="rv-field-desc">{m.description}</span>}
        </label>
      ))}
    </div>
  );
}

const isIntegerStep = (m: PropMeta) => m.step !== undefined && Number.isInteger(m.step);

// "1 ~ 20 · 정수"
function rangeText(m: PropMeta) {
  const parts: string[] = [];
  if (m.min !== undefined || m.max !== undefined) parts.push(`${m.min ?? ""} ~ ${m.max ?? ""}`.trim());
  if (isIntegerStep(m) && m.step === 1) parts.push("정수");
  else if (m.step !== undefined) parts.push(`${m.step} 단위`);
  return parts.join(" · ");
}

// 받을 수 없는 숫자면 이유를, 받을 수 있으면 null
function numberIssue(n: number, m: PropMeta): string | null {
  if (!Number.isFinite(n)) return "숫자만 넣을 수 있습니다";
  if (m.min !== undefined && n < m.min) return `${m.min} 이상이어야 합니다`;
  if (m.max !== undefined && n > m.max) return `${m.max} 이하여야 합니다`;
  if (m.step !== undefined && m.step > 0) {
    const k = (n - (m.min ?? 0)) / m.step;
    if (Math.abs(k - Math.round(k)) > 1e-9) return m.step === 1 ? "정수만 넣을 수 있습니다" : `${m.step} 단위로 넣어야 합니다`;
  }
  return null;
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
      return <NumberControl value={value} meta={meta} onChange={(v) => onChange(name, v)} />;
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

// 범위·step에 맞는 숫자만 반영한다. 프리셋·저장값이 범위 밖이면 그대로 두고 이유만 보여 준다 (plan.md 5.1)
function NumberControl({ value, meta, onChange }: { value: unknown; meta: PropMeta; onChange: (v: number) => void }) {
  const shown = typeof value === "number" && Number.isFinite(value) ? String(value) : "";
  const [text, setText] = useState(shown);

  useEffect(() => setText(shown), [shown]);

  const error =
    text.trim() === ""
      ? typeof value === "number" && !Number.isFinite(value)
        ? `지금 값 ${String(value)}은 입력칸에 보일 수 없습니다`
        : "값을 넣어 주세요"
      : numberIssue(Number(text), meta);
  const hasRange = meta.min !== undefined && meta.max !== undefined;

  const change = (next: string) => {
    setText(next);
    const n = Number(next);
    if (next.trim() !== "" && numberIssue(n, meta) === null) onChange(n);
  };

  return (
    <>
      <span className="rv-number">
        <input
          className="rv-input"
          type="number"
          inputMode={isIntegerStep(meta) ? "numeric" : "decimal"}
          min={meta.min}
          max={meta.max}
          step={meta.step ?? "any"}
          value={text}
          aria-invalid={error !== null}
          onChange={(e) => change(e.target.value)}
        />
        {hasRange && (
          <input
            className="rv-slider"
            type="range"
            min={meta.min}
            max={meta.max}
            step={meta.step ?? "any"}
            value={Math.min(meta.max!, Math.max(meta.min!, Number(text) || 0))}
            onChange={(e) => change(e.target.value)}
          />
        )}
      </span>
      {error && <span className="rv-field-error">{error}</span>}
    </>
  );
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
