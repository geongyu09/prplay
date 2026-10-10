import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import cases, { meta, pr } from "virtual:review-cases";
import mockHandlers from "virtual:review-handlers";

import "virtual:review-styles";
import shellCss from "./shell.css?inline";
import { requestLog } from "./mock/requestStore";
import { startMocking } from "./mock/startMocking";
import { Overview } from "./Overview";
import { activateCase, type CaseStart, mock, Playground } from "./Playground";

const OVERVIEW = "\0overview";

// 맨 위 탭: [개요] [대상 1] [대상 2] ... pr.ts가 없으면 개요 탭 없이 첫 대상부터 (plan.md 3.4)
const tabs = [
  ...(pr ? [{ id: OVERVIEW, label: "개요" }] : []),
  ...cases.map((entry) => ({ id: entry.name, label: entry.case.title })),
];

function App({ previewEl }: { previewEl: HTMLElement }) {
  const [tab, setTab] = useState(tabs[0].id);
  // 개요 화면 사진을 눌러 열었으면 그 상태로 시작한다 (plan.md 3.4)
  const [start, setStart] = useState<CaseStart>();
  const entry = cases.find((c) => c.name === tab);

  const open = (id: string, nextStart?: CaseStart) => {
    if (id === tab) return;
    // 개요 탭에서는 미리보기를 그리지 않는다. 대상 탭은 마운트 전에 그 케이스의 라우트로 바꾼다
    const next = cases.find((c) => c.name === id);
    setStart(nextStart);
    if (next) activateCase(next, nextStart);
    else {
      mock.routes = [];
      requestLog.clear();
    }
    setTab(id);
  };

  return (
    <div className="rv-app">
      <header className="rv-header">
        <h1>
          {meta.prUrl ? (
            <a className="rv-title-link" href={meta.prUrl} target="_blank" rel="noopener">
              {meta.title}
            </a>
          ) : (
            meta.title
          )}
        </h1>
        {tabs.length > 1 && (
          <nav className="rv-tabs rv-page-tabs" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className="rv-tab"
                onClick={() => open(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {entry ? (
        // 탭을 바꾸면 새로 마운트한다. props와 편집한 시나리오는 케이스마다 저장돼 있다 (plan.md 3.4, 7)
        <Playground key={entry.name} entry={entry} previewEl={previewEl} start={start} />
      ) : (
        pr && <Overview pr={pr} cases={cases} onOpen={open} />
      )}
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

// 첫 탭이 대상이면 그 케이스의 라우트로 시작한다 (plan.md 3.4)
const first = cases.find((c) => c.name === tabs[0].id);
if (first) activateCase(first);
// 미리보기가 첫 요청을 보내기 전에 가로채기를 켠다 (plan.md 6.1)
startMocking(() => mock.routes, requestLog.add, mockHandlers);

document.title = `Review · ${meta.title}`;
createRoot(container).render(
  <StrictMode>
    <App previewEl={previewEl} />
  </StrictMode>,
);
