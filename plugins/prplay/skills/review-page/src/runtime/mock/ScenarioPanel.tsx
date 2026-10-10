import { useEffect, useState } from "react";
import type { MockRoute } from "review-kit";

import { JsonEditor } from "./JsonEditor";

type Draft = { status: string; delayMs: string; body: string };

const toDraft = (route: MockRoute): Draft => ({
  status: String(route.status),
  delayMs: route.delayMs ? String(route.delayMs) : "",
  body: JSON.stringify(route.body, null, 2) ?? "null",
});

// 입력이 올바르면 라우트를, 아니면 필드별 오류를 돌려준다
function parseDraft(route: MockRoute, draft: Draft): { route?: MockRoute; errors: string[] } {
  const errors: string[] = [];
  const status = Number(draft.status);
  if (!Number.isInteger(status) || status < 100 || status > 599) {
    errors.push("상태 코드는 100~599 사이 정수여야 합니다.");
  }
  const delayMs = draft.delayMs.trim() === "" ? 0 : Number(draft.delayMs);
  if (!Number.isInteger(delayMs) || delayMs < 0) errors.push("지연은 0 이상의 정수(ms)여야 합니다.");
  let body: unknown;
  try {
    body = JSON.parse(draft.body);
  } catch (error) {
    errors.push(`body JSON 오류: ${(error as Error).message}`);
  }
  if (errors.length > 0) return { errors };
  return { route: { ...route, status, delayMs: delayMs || undefined, body }, errors };
}

type Props = {
  names: string[];
  active: string;
  routes: MockRoute[]; // 지금 적용된 active 시나리오의 라우트
  isEdited: boolean; // 케이스 기본값과 다른지
  onSelect: (name: string) => void;
  onApply: (routes: MockRoute[]) => void;
  onRestore: () => void;
};

// plan.md 6.3. 시나리오 버튼은 바로 적용하고, 라우트 편집은 "적용"을 눌러야 반영한다
export function ScenarioPanel({ names, active, routes, isEdited, onSelect, onApply, onRestore }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>(() => routes.map(toDraft));

  // 시나리오를 바꾸거나 적용·원래대로를 누르면 편집 칸을 적용된 값으로 다시 채운다
  useEffect(() => setDrafts(routes.map(toDraft)), [routes]);

  const parsed = routes.map((route, i) => parseDraft(route, drafts[i] ?? toDraft(route)));
  const hasError = parsed.some((p) => p.errors.length > 0);
  const isDirty = drafts.some((d, i) => JSON.stringify(d) !== JSON.stringify(toDraft(routes[i])));

  const update = (i: number, patch: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  return (
    <div className="rv-scenario">
      <div className="rv-row" role="group" aria-label="시나리오">
        {names.map((name) => (
          <button
            key={name}
            type="button"
            className={name === active ? "rv-button rv-button-primary" : "rv-button"}
            aria-pressed={name === active}
            onClick={() => onSelect(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {routes.length === 0 ? (
        <p className="rv-empty">이 시나리오에는 라우트가 없습니다.</p>
      ) : (
        <ol className="rv-routes">
          {routes.map((route, i) => {
            const draft = drafts[i] ?? toDraft(route);
            const idBase = `rv-route-${active}-${i}`;
            return (
              <li key={`${route.method} ${route.path}`} className="rv-route">
                <div className="rv-route-head">
                  <strong>{route.method}</strong>
                  <code>{route.path}</code>
                </div>
                <div className="rv-row">
                  <label className="rv-inline" htmlFor={`${idBase}-status`}>
                    상태
                    <input
                      id={`${idBase}-status`}
                      className="rv-input rv-input-short"
                      inputMode="numeric"
                      value={draft.status}
                      onChange={(e) => update(i, { status: e.target.value })}
                    />
                  </label>
                  <label className="rv-inline" htmlFor={`${idBase}-delay`}>
                    지연(ms)
                    <input
                      id={`${idBase}-delay`}
                      className="rv-input rv-input-short"
                      inputMode="numeric"
                      placeholder="0"
                      value={draft.delayMs}
                      onChange={(e) => update(i, { delayMs: e.target.value })}
                    />
                  </label>
                </div>
                <JsonEditor id={`${idBase}-body`} value={draft.body} onChange={(body) => update(i, { body })} />
                {parsed[i].errors.map((message) => (
                  <p key={message} className="rv-field-error">
                    {message}
                  </p>
                ))}
              </li>
            );
          })}
        </ol>
      )}

      <div className="rv-row">
        <button
          type="button"
          className="rv-button rv-button-primary"
          disabled={hasError || !isDirty}
          onClick={() => onApply(parsed.map((p) => p.route!))}
        >
          적용
        </button>
        <button type="button" className="rv-button" disabled={!isEdited && !isDirty} onClick={onRestore}>
          원래대로
        </button>
        {isDirty && <span className="rv-note">적용 전</span>}
      </div>
    </div>
  );
}
