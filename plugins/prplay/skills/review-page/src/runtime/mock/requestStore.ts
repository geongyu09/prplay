import type { RequestRecord } from "./startMocking";

// 요청 기록 저장소. 모킹은 React 밖에서 시작하므로 구독 방식으로 화면에 넘긴다 (plan.md 6.1)
export type RequestEntry = RequestRecord & { id: number; at: Date };

const MAX_ENTRIES = 100;

let entries: RequestEntry[] = [];
let nextId = 0;
// 비운 시각. 그 전에 시작된 요청(이전 시나리오의 지연 응답)은 늦게 끝나도 기록하지 않는다 (plan.md 6.3)
let clearedAt = 0;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

export const requestLog = {
  add(record: RequestRecord) {
    if (record.startedAt < clearedAt) return;
    entries = [{ ...record, id: ++nextId, at: new Date() }, ...entries].slice(0, MAX_ENTRIES);
    notify();
  },
  clear() {
    clearedAt = performance.now();
    entries = [];
    notify();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => entries,
};
