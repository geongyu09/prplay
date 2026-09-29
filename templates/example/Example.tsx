// review-kit init이 만든 예시 컴포넌트. 확인이 끝나면 지워도 된다
type Props = {
  /** 인사말 */
  greeting: string;
  /** 누른 횟수 시작값 */
  count: number;
  tone: "calm" | "loud";
  disabled?: boolean;
  onPress?: (count: number) => void;
};

export default function Example({ greeting, count, tone, disabled = false, onPress }: Props) {
  const text = tone === "loud" ? `${greeting.toUpperCase()}!` : greeting;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", fontFamily: "sans-serif" }}>
      <span style={{ overflowWrap: "anywhere" }}>{text}</span>
      <button type="button" disabled={disabled} onClick={() => onPress?.(count + 1)}>
        {count}
      </button>
    </div>
  );
}
