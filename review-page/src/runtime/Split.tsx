import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

// 플레이그라운드 좌우 배치 (plan.md 3.4). ratio는 왼쪽 칸 폭 비율이다
type Layout = { codeFirst: boolean; ratio: number };

const KEY = "review-kit:layout";
const DEFAULT: Layout = { codeFirst: true, ratio: 0.5 };
const MIN = 0.2;
const MAX = 0.8;
const STEP = 0.05;

const clamp = (r: number) => Math.min(MAX, Math.max(MIN, r));

// 열람자 취향이라 케이스와 상관없이 한 키에 저장한다. 접근이 throw해도 기본값으로 그린다 (plan.md 7)
function loadLayout(): Layout {
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<Layout>) : {};
    return {
      codeFirst: typeof saved.codeFirst === "boolean" ? saved.codeFirst : DEFAULT.codeFirst,
      ratio: typeof saved.ratio === "number" ? clamp(saved.ratio) : DEFAULT.ratio,
    };
  } catch {
    return DEFAULT;
  }
}

function saveLayout(layout: Layout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(layout));
  } catch {
    // 저장하지 못해도 배치는 바꾼다
  }
}

type Side = "code" | "play";

export function Split({ code, play }: { code: ReactNode; play: ReactNode }) {
  const [layout, setLayoutState] = useState(loadLayout);
  // 손잡이를 끄는 중인 칸과, 지금 놓으면 자리가 바뀌는지
  const [dragging, setDragging] = useState<{ side: Side; over: boolean } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const resizing = useRef(false);

  const setLayout = (next: Layout) => {
    setLayoutState(next);
    saveLayout(next);
  };

  // 포인터가 디바이더 오른쪽에 있는지
  const isRightOfDivider = (x: number) => {
    const rect = dividerRef.current?.getBoundingClientRect();
    return rect ? x > rect.left + rect.width / 2 : false;
  };

  const sideIsLeft = (side: Side) => (side === "code") === layout.codeFirst;

  const handleProps = (side: Side) => ({
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging({ side, over: false });
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      // 왼쪽 칸은 오른쪽으로, 오른쪽 칸은 왼쪽으로 넘어가야 바뀐다
      const over = sideIsLeft(side) === isRightOfDivider(e.clientX);
      if (over !== dragging.over) setDragging({ side, over });
    },
    onPointerUp: () => {
      if (dragging?.over) setLayout({ ...layout, codeFirst: !layout.codeFirst });
      setDragging(null);
    },
    onPointerCancel: () => setDragging(null),
  });

  const onDividerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizing.current = true;
  };

  const onDividerMove = (e: PointerEvent<HTMLDivElement>) => {
    const rect = bodyRef.current?.getBoundingClientRect();
    if (!resizing.current || !rect) return;
    setLayoutState({ ...layout, ratio: clamp((e.clientX - rect.left) / rect.width) });
  };

  const onDividerUp = () => {
    if (!resizing.current) return;
    resizing.current = false;
    saveLayout(layout);
  };

  const onDividerKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") setLayout({ ...layout, ratio: clamp(layout.ratio - STEP) });
    else if (e.key === "ArrowRight") setLayout({ ...layout, ratio: clamp(layout.ratio + STEP) });
    else return;
    e.preventDefault();
  };

  // 두 칸은 CSS order로 좌우를 정하고, flex-grow 비율로 폭을 나눈다
  const column = (side: Side, label: string, children: ReactNode) => {
    const left = sideIsLeft(side);
    const target = dragging?.over && dragging.side !== side;
    return (
      <div
        className={`rv-col rv-${side}-col${target ? " rv-col-target" : ""}${dragging?.side === side ? " rv-col-dragging" : ""}`}
        style={{ order: left ? 0 : 2, flexGrow: left ? layout.ratio : 1 - layout.ratio }}
      >
        <div className="rv-col-handle" title="끌어서 좌우 자리 바꾸기" {...handleProps(side)}>
          <span aria-hidden="true">⠿</span> {label}
        </div>
        {children}
      </div>
    );
  };

  return (
    <div className="rv-body" ref={bodyRef}>
      {column("code", "코드", code)}
      <div
        ref={dividerRef}
        className="rv-divider"
        role="separator"
        aria-orientation="vertical"
        aria-label="좌우 폭 조절"
        aria-valuemin={MIN * 100}
        aria-valuemax={MAX * 100}
        aria-valuenow={Math.round(layout.ratio * 100)}
        tabIndex={0}
        title="끌어서 폭 조절, 두 번 눌러 반반"
        onPointerDown={onDividerDown}
        onPointerMove={onDividerMove}
        onPointerUp={onDividerUp}
        onPointerCancel={onDividerUp}
        onDoubleClick={() => setLayout({ ...layout, ratio: DEFAULT.ratio })}
        onKeyDown={onDividerKey}
      />
      {column("play", "미리보기", play)}
    </div>
  );
}
