import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Actions, MockRoute, ReviewAddress } from "review-kit";
import type { CaseEntry } from "virtual:review-cases";
import { meta } from "virtual:review-cases";

import { ActionLog, type ActionCall } from "./controls/ActionLog";
import { AddressBar } from "./controls/AddressBar";
import { PropControls } from "./controls/PropControls";
import { StatePanel } from "./controls/StatePanel";
import { caseStorage, type CaseStorage } from "./controls/storage";
import { RequestLog } from "./mock/RequestLog";
import { requestLog } from "./mock/requestStore";
import { ScenarioPanel } from "./mock/ScenarioPanel";
import { CodePanel } from "./CodePanel";
import { ErrorBoundary, Providers } from "./Preview";

type PropValues = Record<string, unknown>;
type Scenarios = Record<string, MockRoute[]>;

// 모킹 엔진이 읽는 "지금 적용된 라우트". 시나리오를 적용하거나 탭을 바꿀 때 바꾼다 (plan.md 3.4, 6.3)
export const mock = { routes: [] as MockRoute[] };

const isRoute = (r: unknown): r is MockRoute =>
  !!r &&
  typeof r === "object" &&
  typeof (r as MockRoute).method === "string" &&
  typeof (r as MockRoute).path === "string" &&
  typeof (r as MockRoute).status === "number";

// 케이스 하나에서 바뀌지 않는 값들. 탭마다 플레이그라운드를 새로 마운트하므로 마운트할 때 한 번 만든다
function prepare(entry: CaseEntry) {
  const c = entry.case;
  const defaults = c.props as PropValues;
  const baseScenarios: Scenarios = c.scenarios ?? {};
  const storage: CaseStorage = caseStorage(meta.pr, entry.name);

  // 저장된 시나리오는 케이스에 있는 이름만 받는다 (plan.md 7)
  const mergeScenarios = (saved: unknown): Scenarios => {
    const next: Scenarios = { ...baseScenarios };
    if (saved && typeof saved === "object") {
      for (const [name, routes] of Object.entries(saved)) {
        if (name in baseScenarios && Array.isArray(routes) && routes.every(isRoute)) next[name] = routes;
      }
    }
    return next;
  };

  // 저장된 값은 케이스 props에 있는 키만 받는다 (plan.md 5.1, 7)
  const mergeProps = (saved: unknown): PropValues => {
    const next = { ...defaults };
    if (saved && typeof saved === "object") {
      for (const [k, v] of Object.entries(saved)) if (k in defaults) next[k] = v;
    }
    return next;
  };

  // 케이스 기본값과 다른 시나리오만 저장한다 (plan.md 7)
  const changedScenarios = (scenarios: Scenarios) =>
    Object.fromEntries(
      Object.entries(scenarios).filter(
        ([name, routes]) => JSON.stringify(routes) !== JSON.stringify(baseScenarios[name]),
      ),
    );

  return {
    c,
    defaults,
    presets: (c.presets ?? {}) as Record<string, Partial<PropValues>>,
    baseScenarios,
    scenarioNames: Object.keys(baseScenarios),
    storage,
    mergeScenarios,
    mergeProps,
    changedScenarios,
  };
}

// 탭을 열 때 부른다. 그 케이스의 첫 시나리오(편집한 값 포함)를 적용하고 요청 기록을 비운다 (plan.md 3.4)
// 미리보기가 첫 요청을 보내기 전에 라우트가 바뀌어 있어야 하므로 마운트 전에 부른다
export function activateCase(entry: CaseEntry) {
  const p = prepare(entry);
  mock.routes = p.mergeScenarios(p.storage.load().scenarios)[p.scenarioNames[0]] ?? [];
  requestLog.clear();
}

// 함수 값은 JSON으로 저장하지 않는다
const serializable = (props: PropValues) =>
  Object.fromEntries(Object.entries(props).filter(([, v]) => typeof v !== "function"));

const MAX_CALLS = 100;
const MIN_WIDTH = 240;
const MAX_WIDTH = 1280;

export function Playground({ entry, previewEl }: { entry: CaseEntry; previewEl: HTMLElement }) {
  const p = useMemo(() => prepare(entry), [entry]);
  const { c, defaults, presets, baseScenarios, scenarioNames, storage } = p;
  const propsMeta = entry.props;

  const [props, setPropsState] = useState<PropValues>(() => p.mergeProps(storage.load().props));
  // props가 바뀔 때마다 미리보기 전체를 다시 마운트한다 (plan.md 4.2). QueryClient도 새로 만들어진다
  const [renderKey, setRenderKey] = useState(0);
  const [calls, setCalls] = useState<ActionCall[]>([]);
  const [width, setWidth] = useState<number | null>(null);
  const [scenarios, setScenariosState] = useState<Scenarios>(() => p.mergeScenarios(storage.load().scenarios));
  const [activeScenario, setActiveScenario] = useState(scenarioNames[0] ?? "");

  // 라우트를 바꾸고 요청 기록을 비운 뒤 다시 마운트한다. 새 QueryClient가 만들어져 이전 캐시가 남지 않는다 (plan.md 4.2)
  const applyRoutes = useCallback((routes: MockRoute[]) => {
    mock.routes = routes;
    requestLog.clear();
    setRenderKey((k) => k + 1);
  }, []);

  // 편집한 시나리오는 props와 같은 키에 함께 저장한다 (plan.md 7)
  const setScenarios = useCallback(
    (next: Scenarios) => {
      setScenariosState(next);
      storage.save({ ...storage.load(), scenarios: p.changedScenarios(next) });
    },
    [p, storage],
  );
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

  const setProps = useCallback(
    (next: PropValues) => {
      setPropsState(next);
      setRenderKey((k) => k + 1);
      storage.save({ ...storage.load(), props: serializable(next) });
    },
    [storage],
  );

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
  }, [propsMeta]);

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
        {/* 결정 목록은 PR 단위라 개요 탭에 있다 (plan.md 3.4, 8) */}
        <CodePanel files={entry.files} sha={meta.sha} base={meta.base} impacts={c.impacts ?? []} />
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
              JSON.stringify({ props: serializable(props), scenarios: p.changedScenarios(scenarios) }, null, 2)
            }
            onApply={(json) => {
              try {
                const parsed = JSON.parse(json) as { props?: unknown; scenarios?: unknown };
                if (!parsed || typeof parsed !== "object" || !("props" in parsed || "scenarios" in parsed)) {
                  return '{"props": {...}, "scenarios": {...}} 형식이어야 합니다.';
                }
                // 붙여넣은 JSON에 있는 키만 바꾼다 (plan.md 7)
                if ("scenarios" in parsed) {
                  const next = p.mergeScenarios(parsed.scenarios);
                  setScenarios(next);
                  mock.routes = next[activeScenario] ?? [];
                }
                if ("props" in parsed) setProps(p.mergeProps(parsed.props));
                else applyRoutes(mock.routes);
                return null;
              } catch (error) {
                return (error as Error).message;
              }
            }}
            onReset={() => {
              storage.clear();
              setPropsState({ ...defaults });
              setScenariosState(baseScenarios);
              setActiveScenario(scenarioNames[0] ?? "");
              applyRoutes(baseScenarios[scenarioNames[0]] ?? []);
            }}
          />
        </section>
      </aside>

      {createPortal(preview, previewEl)}
    </div>
  );
}
