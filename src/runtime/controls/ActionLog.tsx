export type ActionCall = { id: number; name: string; args: unknown[]; at: Date };

// plan.md 5.1. 함수 props 호출 기록 (이름, 인자, 시각)
export function ActionLog({ calls, onClear }: { calls: ActionCall[]; onClear: () => void }) {
  return (
    <div className="rv-log">
      {calls.length === 0 ? (
        <p className="rv-empty">아직 호출이 없습니다.</p>
      ) : (
        <ol className="rv-log-list">
          {calls.map((c) => (
            <li key={c.id} className="rv-log-item">
              <time>{c.at.toTimeString().slice(0, 8)}</time>
              <strong>{c.name}</strong>
              <code>{c.args.length ? c.args.map(formatArg).join(", ") : "()"}</code>
            </li>
          ))}
        </ol>
      )}
      {calls.length > 0 && (
        <button type="button" className="rv-button rv-button-small" onClick={onClear}>
          기록 지우기
        </button>
      )}
    </div>
  );
}

// 이벤트 객체처럼 순환 참조가 있는 인자도 한 줄로 보이게 한다
function formatArg(arg: unknown): string {
  if (arg && typeof arg === "object" && "nativeEvent" in arg) {
    return `SyntheticEvent(${(arg as { type?: string }).type ?? ""})`;
  }
  try {
    return JSON.stringify(arg) ?? String(arg);
  } catch {
    return String(arg);
  }
}
