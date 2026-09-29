// plan.md 7. 케이스마다 `review-kit:{PR번호}:{케이스}` 키에 { props, scenarios } JSON을 저장한다
export type SavedState = {
  props?: Record<string, unknown>;
  scenarios?: unknown;
};

export type CaseStorage = {
  load: () => SavedState;
  save: (state: SavedState) => void;
  clear: () => void;
};

// 비공개 창이나 저장소 차단에서는 localStorage 접근이 throw할 수 있다
export function caseStorage(pr: string, caseName: string): CaseStorage {
  const key = `review-kit:${pr}:${caseName}`;
  return {
    load() {
      try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as SavedState) : {};
      } catch {
        return {};
      }
    },
    save(state) {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // 저장하지 못해도 편집은 계속한다
      }
    },
    clear() {
      try {
        localStorage.removeItem(key);
      } catch {
        // 무시
      }
    },
  };
}
