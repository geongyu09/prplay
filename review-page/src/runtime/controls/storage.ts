// plan.md 7. 값은 { props, scenarios } JSON. 시나리오는 3단계에서 채운다
export type SavedState = {
  props?: Record<string, unknown>;
  scenarios?: unknown;
};

const key = __REVIEW_STORAGE_KEY__;

// 비공개 창이나 저장소 차단에서는 localStorage 접근이 throw할 수 있다
export function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SavedState) : {};
  } catch {
    return {};
  }
}

export function saveState(state: SavedState) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // 저장하지 못해도 편집은 계속한다
  }
}

export function clearState() {
  try {
    localStorage.removeItem(key);
  } catch {
    // 무시
  }
}
