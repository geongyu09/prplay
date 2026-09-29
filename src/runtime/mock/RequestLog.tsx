import { useSyncExternalStore } from "react";

import { requestLog } from "./requestStore";

// plan.md 6.1. 페이지가 부르는 API를 코드 없이 알 수 있게 메서드, URL, 상태, 걸린 시간을 보여준다
export function RequestLog() {
  const entries = useSyncExternalStore(requestLog.subscribe, requestLog.getSnapshot);

  return (
    <div className="rv-log">
      {entries.length === 0 ? (
        <p className="rv-empty">아직 요청이 없습니다.</p>
      ) : (
        <ol className="rv-log-list">
          {entries.map((e) => (
            <li key={e.id} className="rv-log-item rv-request">
              <strong>{e.method}</strong>
              {e.source === "handlers" && (
                <span className="rv-source" title="시나리오에 없어 기존 MSW 핸들러가 응답했습니다">
                  기존
                </span>
              )}
              <code title={e.url}>{toPath(e.url)}</code>
              <span className={e.status >= 400 ? "rv-status rv-status-error" : "rv-status"}>
                {e.status}
              </span>
              <time>{e.ms}ms</time>
            </li>
          ))}
        </ol>
      )}
      {entries.length > 0 && (
        <button type="button" className="rv-button rv-button-small" onClick={requestLog.clear}>
          기록 지우기
        </button>
      )}
    </div>
  );
}

// 같은 문서 안의 요청은 경로만, 다른 주소는 전체를 보여준다
function toPath(url: string) {
  try {
    const u = new URL(url);
    return u.origin === location.origin || u.protocol === "file:" ? u.pathname + u.search : url;
  } catch {
    return url;
  }
}
