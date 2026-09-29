import type { ReviewPr } from "review-kit";
import type { CaseEntry } from "virtual:review-cases";
import { meta } from "virtual:review-cases";

// 개요 탭 (plan.md 3.4). pr.ts 내용과 플레이그라운드 목록
export function Overview({
  pr,
  cases,
  onOpen,
}: {
  pr: ReviewPr;
  cases: CaseEntry[];
  onOpen: (name: string) => void;
}) {
  return (
    <div className="rv-overview">
      <p className="rv-summary">{pr.summary}</p>

      <ListSection title="바뀐 점" items={pr.changes} max={5} />
      <ListSection title="결정" items={pr.decisions} max={5} ordered empty="적힌 결정이 없습니다." />
      <ListSection title="리뷰 포인트" items={pr.reviewPoints} max={3} />

      <section className="rv-section">
        <h2>플레이그라운드</h2>
        <ul className="rv-cases">
          {cases.map((entry) => (
            <li key={entry.name}>
              <button type="button" className="rv-button" onClick={() => onOpen(entry.name)}>
                {entry.case.title}
              </button>
              {entry.case.sources[0] && <code className="rv-note">{entry.case.sources[0]}</code>}
            </li>
          ))}
        </ul>
      </section>

      <p className="rv-note">
        {meta.prUrl && (
          <>
            <a className="rv-link" href={meta.prUrl} target="_blank" rel="noopener">
              GitHub에서 PR 보기
            </a>
            {" · "}
          </>
        )}
        비교 기준 <code>{meta.base}</code>
        {meta.sha && (
          <>
            {" · "}커밋 <code title={meta.sha}>{meta.sha.slice(0, 7)}</code>
          </>
        )}
      </p>
    </div>
  );
}

function ListSection({
  title,
  items,
  max,
  ordered,
  empty,
}: {
  title: string;
  items: string[];
  max: number;
  ordered?: boolean;
  empty?: string;
}) {
  if (items.length === 0 && !empty) return null;
  const List = ordered ? "ol" : "ul";
  return (
    <section className="rv-section">
      <h2>{title}</h2>
      {items.length > 0 ? (
        <List className="rv-list">
          {items.slice(0, max).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </List>
      ) : (
        <p className="rv-empty">{empty}</p>
      )}
    </section>
  );
}
