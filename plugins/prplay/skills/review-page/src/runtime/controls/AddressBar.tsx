import { useEffect, useState } from "react";

// 미리보기 라우터의 현재 URL. 입력하고 Enter를 누르면 이동하고, ↺는 시작 URL로 이동한다 (plan.md 4.1)
export function AddressBar({
  address,
  initialPath,
  onNavigate,
}: {
  address: string;
  initialPath: string;
  onNavigate: (path: string) => void;
}) {
  const [draft, setDraft] = useState(address);
  // 미리보기 안에서 이동하면 입력 중이던 값보다 실제 URL을 따른다
  useEffect(() => setDraft(address), [address]);

  return (
    <form
      className="rv-address"
      onSubmit={(e) => {
        e.preventDefault();
        const path = draft.trim();
        if (path) onNavigate(path.startsWith("/") ? path : `/${path}`);
      }}
    >
      <span>URL</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => setDraft(address)}
        spellCheck={false}
        aria-label="미리보기 URL"
      />
      <button
        type="button"
        className="rv-button rv-button-small"
        title={`시작 URL(${initialPath})로 이동`}
        onClick={() => onNavigate(initialPath)}
      >
        ↺
      </button>
    </form>
  );
}
