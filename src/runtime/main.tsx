import { StrictMode, useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import type { Actions, MockRoute, ReviewAddress } from "review-kit";
import reviewCase from "virtual:review-case";
import mockHandlers from "virtual:review-handlers";
import propsMeta from "virtual:review-props";
import sources from "virtual:review-sources";

import "virtual:review-styles";
import shellCss from "./shell.css?inline";
import { ActionLog, type ActionCall } from "./controls/ActionLog";
import { AddressBar } from "./controls/AddressBar";
import { PropControls } from "./controls/PropControls";
import { StatePanel } from "./controls/StatePanel";
import { clearState, loadState, saveState } from "./controls/storage";
import { RequestLog } from "./mock/RequestLog";
import { requestLog } from "./mock/requestStore";
import { ScenarioPanel } from "./mock/ScenarioPanel";
import { startMocking } from "./mock/startMocking";
import { CodePanel } from "./CodePanel";
import { ErrorBoundary, Providers } from "./Preview";

type PropValues = Record<string, unknown>;

const c = reviewCase;
const defaults = c.props as PropValues;
const presets = (c.presets ?? {}) as Record<string, Partial<PropValues>>;
const baseScenarios = c.scenarios ?? {};
const scenarioNames = Object.keys(baseScenarios);

type Scenarios = Record<string, MockRoute[]>;

const isRoute = (r: unknown): r is MockRoute =>
  !!r &&
  typeof r === "object" &&
  typeof (r as MockRoute).method === "string" &&
  typeof (r as MockRoute).path === "string" &&
  typeof (r as MockRoute).status === "number";

// 저장된 시나리오는 케이스에 있는 이름만 받는다 (plan.md 7)
function mergeScenarios(saved: unknown): Scenarios {
  const next: Scenarios = { ...baseScenarios };
  if (saved && typeof saved === "object") {
    for (const [name, routes] of Object.entries(saved)) {
      if (name in baseScenarios && Array.isArray(routes) && routes.every(isRoute)) next[name] = routes;
    }
  }
  return next;
}

// 케이스 기본값과 다른 시나리오만 저장한다 (plan.md 7)
const changedScenarios = (scenarios: Scenarios) =>
  Object.fromEntries(
    Object.entries(scenarios).filter(
      ([name, routes]) => JSON.stringify(routes) !== JSON.stringify(baseScenarios[name]),
    ),
  );

const initialScenarios = mergeScenarios(loadState().scenarios);

// 모킹 엔진이 읽는 "지금 적용된 라우트". 시나리오를 적용할 때 바꾸고 미리보기를 다시 마운트한다 (plan.md 6.3)
const mock = { routes: initialScenarios[scenarioNames[0]] ?? [] };

// 저장된 값은 케이스 props에 있는 키만 받는다 (plan.md 5.1, 7)
function mergeProps(saved: unknown): PropValues {
  const next = { ...defaults };
  if (saved && typeof saved === "object") {
    for (const [k, v] of Object.entries(saved)) if (k in defaults) next[k] = v;
  }
  return next;
}

// 함수 값은 JSON으로 저장하지 않는다
const serializable = (props: PropValues) =>
  Object.fromEntries(Object.entries(props).filter(([, v]) => typeof v !== "function"));

const MAX_CALLS = 100;
const MIN_WIDTH = 240;
const MAX_WIDTH = 1280;

function App({ previewEl }: { previewEl: HTMLElement }) {
  const [props, setPropsState] = useState<PropValues>(() => mergeProps(loadState().props));
  // props가 바뀔 때마다 미리보기 전체를 다시 마운트한다 (plan.md 4.2). QueryClient도 새로 만들어진다
  const [renderKey, setRenderKey] = useState(0);
  const [calls, setCalls] = useState<ActionCall[]>([]);
  const [width, setWidth] = useState<number | null>(null);
  const [scenarios, setScenariosState] = useState<Scenarios>(initialScenarios);
  const [activeScenario, setActiveScenario] = useState(scenarioNames[0] ?? "");

  // 라우트를 바꾸고 요청 기록을 비운 뒤 다시 마운트한다. 새 QueryClient가 만들어져 이전 캐시가 남지 않는다 (plan.md 4.2)
  const applyRoutes = useCallback((routes: MockRoute[]) => {
    mock.routes = routes;
    requestLog.clear();
    setRenderKey((k) => k + 1);
  }, []);

  // 편집한 시나리오는 props와 같은 키에 함께 저장한다 (plan.md 7)
  const setScenarios = useCallback((next: Scenarios) => {
    setScenariosState(next);
    saveState({ ...loadState(), scenarios: changedScenarios(next) });
  }, []);
  const callId = useRef(0);

  // 주소 표시줄 (plan.md 4.1). 다시 마운트할 때는 보고 있던 주소에서 시작한다
  const [address, setAddress] = useState<string | null>(null);
  const currentPath = useRef<string | undefined>(undefined);
  const navigateRef = useRef<((path: string) => void) | null>(null);
  const addressBridge = useMemo<ReviewAddress>(
    () => ({
      report: (path) => {
        currentPath.current = path;
        setAddress(path);
      },
      connect: (navigate) => {
        navigateRef.current = navigate;
        return () => {
          if (navigateRef.current === navigate) navigateRef.current = null;
        };
      },
    }),
    [],
  );

  const setProps = useCallback((next: PropValues) => {
    setPropsState(next);
    setRenderKey((k) => k + 1);
    saveState({ ...loadState(), props: serializable(next) });
  }, []);

  // docgen에서 함수 타입인 props마다 호출 기록 로거를 만든다 (plan.md 5.1)
  const actions = useMemo<Actions>(() => {
    const names = Object.entries(propsMeta)
      .filter(([, m]) => m.kind === "function")
      .map(([name]) => name);
    return Object.fromEntries(
      names.map((name) => [
        name,
        (...args: unknown[]) =>
          setCalls((prev) =>
            [{ id: ++callId.current, name, args, at: new Date() }, ...prev].slice(0, MAX_CALLS),
          ),
      ]),
    );
  }, []);

  const hasFunctionProps = Object.keys(actions).length > 0;
  const presetNames = Object.keys(presets);

  const preview = (
    <ErrorBoundary key={renderKey}>
      <Providers initialPath={currentPath.current ?? c.initialPath} address={addressBridge}>
        {c.render(props as never, actions)}
      </Providers>
    </ErrorBoundary>
  );

  return (
    <div className="rv-app">
      <header className="rv-header">
        <h1>{c.title}</h1>
        <ul className="rv-sources">
          {c.sources.map((s) => (
            <li key={s}>
              <code>{s}</code>
            </li>
          ))}
        </ul>
      </header>

      <div className="rv-body">
        <section className="rv-stage" aria-label="미리보기">
          {address !== null && (
            <AddressBar
              address={address}
              initialPath={c.initialPath ?? "/"}
              onNavigate={(path) => navigateRef.current?.(path)}
            />
          )}
          <div className="rv-toolbar">
            <label className="rv-width">
              <span>폭</span>
              <input
                type="range"
                min={MIN_WIDTH}
                max={MAX_WIDTH}
                step={10}
                value={width ?? MAX_WIDTH}
                onChange={(e) => setWidth(Number(e.target.value))}
              />
              <output>{width === null ? "가득" : `${width}px`}</output>
            </label>
            {width !== null && (
              <button type="button" className="rv-button rv-button-small" onClick={() => setWidth(null)}>
                가득
              </button>
            )}
          </div>
          <div className="rv-frame" style={{ width: width === null ? "100%" : `${width}px` }}>
            <slot name="preview" />
          </div>
          {/* 결정 목록은 오른쪽 패널에서 코드 패널 탭으로 옮겼다 (plan.md 8) */}
          <CodePanel
            files={sources.files}
            sha={sources.sha}
            base={sources.base}
            decisions={c.decisions ?? []}
            impacts={c.impacts ?? []}
          />
        </section>

        <aside className="rv-panel">
          <section className="rv-section">
            <h2>Props</h2>
            <PropControls
              values={props}
              meta={propsMeta}
              onChange={(name, value) => setProps({ ...props, [name]: value })}
            />
          </section>

          {presetNames.length > 0 && (
            <section className="rv-section">
              <h2>프리셋</h2>
              <div className="rv-row">
                {presetNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="rv-button"
                    // 기본 props 위에 덮어쓴다 (plan.md 5.2)
                    onClick={() => setProps({ ...defaults, ...presets[name] })}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {hasFunctionProps && (
            <section className="rv-section">
              <h2>호출 기록</h2>
              <ActionLog calls={calls} onClear={() => setCalls([])} />
            </section>
          )}

          {scenarioNames.length > 0 && (
            <section className="rv-section">
              <h2>시나리오</h2>
              <ScenarioPanel
                names={scenarioNames}
                active={activeScenario}
                routes={scenarios[activeScenario]}
                isEdited={
                  JSON.stringify(scenarios[activeScenario]) !== JSON.stringify(baseScenarios[activeScenario])
                }
                onSelect={(name) => {
                  setActiveScenario(name);
                  applyRoutes(scenarios[name]);
                }}
                onApply={(routes) => {
                  setScenarios({ ...scenarios, [activeScenario]: routes });
                  applyRoutes(routes);
                }}
                onRestore={() => {
                  // 편집 칸도 다시 채워지도록 새 배열로 넘긴다
                  const routes = [...baseScenarios[activeScenario]];
                  setScenarios({ ...scenarios, [activeScenario]: routes });
                  applyRoutes(routes);
                }}
              />
            </section>
          )}

          <section className="rv-section">
            <h2>요청 기록</h2>
            <RequestLog />
          </section>

          <section className="rv-section">
            <h2>편집 상태</h2>
            <StatePanel
              getJson={() =>
                JSON.stringify({ props: serializable(props), scenarios: changedScenarios(scenarios) }, null, 2)
              }
              onApply={(json) => {
                try {
                  const parsed = JSON.parse(json) as { props?: unknown; scenarios?: unknown };
                  if (!parsed || typeof parsed !== "object" || !("props" in parsed || "scenarios" in parsed)) {
                    return '{"props": {...}, "scenarios": {...}} 형식이어야 합니다.';
                  }
                  // 붙여넣은 JSON에 있는 키만 바꾼다 (plan.md 7)
                  if ("scenarios" in parsed) {
                    const next = mergeScenarios(parsed.scenarios);
                    setScenarios(next);
                    mock.routes = next[activeScenario] ?? [];
                  }
                  if ("props" in parsed) setProps(mergeProps(parsed.props));
                  else applyRoutes(mock.routes);
                  return null;
                } catch (error) {
                  return (error as Error).message;
                }
              }}
              onReset={() => {
                clearState();
                setPropsState({ ...defaults });
                setScenariosState(baseScenarios);
                setActiveScenario(scenarioNames[0] ?? "");
                applyRoutes(baseScenarios[scenarioNames[0]] ?? []);
              }}
            />
          </section>

        </aside>
      </div>

      {createPortal(preview, previewEl)}
    </div>
  );
}

// 리뷰 화면은 Shadow DOM에 두고, 미리보기만 일반 DOM에 slot으로 꽂는다.
// 그래야 Knot GlobalStyle(태그 초기화)과 Emotion 스타일이 미리보기에만 적용되고 리뷰 화면 CSS도 새지 않는다 (plan.md 4.3)
const host = document.getElementById("review-root")!;
const shadow = host.attachShadow({ mode: "open" });
const style = document.createElement("style");
style.textContent = shellCss;
const container = document.createElement("div");
shadow.append(style, container);

const previewEl = document.createElement("div");
previewEl.slot = "preview";
previewEl.className = "review-preview";
host.append(previewEl);

// 미리보기가 첫 요청을 보내기 전에 가로채기를 켠다 (plan.md 6.1)
startMocking(() => mock.routes, requestLog.add, mockHandlers);

document.title = `Review · ${c.title}`;
createRoot(container).render(
  <StrictMode>
    <App previewEl={previewEl} />
  </StrictMode>,
);
