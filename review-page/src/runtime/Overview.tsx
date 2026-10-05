import type { PrCodeStep, PrDecision, PrDiagram, PrEvidence, PrExample, PrLink, PrRevision, PrRisk, ReviewPr } from "review-kit";
import type { ReactNode } from "react";
import type { CaseEntry } from "virtual:review-cases";
import { meta } from "virtual:review-cases";
import { Code } from "./Highlight";
import type { CaseStart } from "./Playground";

// 개요 탭 (plan.md 3.4). 좋은 리뷰에 필요한 7가지 순서:
// 요약(+화면 사진, 리뷰 반영) → 1 맥락 → 2 길잡이 → 3 증거 → 4 직접 만져 보기 → 5 크기 → 6 위험과 영향 범위 → 7 리뷰 방법
export function Overview({
  pr,
  cases,
  onOpen,
}: {
  pr: ReviewPr;
  cases: CaseEntry[];
  onOpen: (name: string, start?: CaseStart) => void;
}) {
  const { context, guide, evidence, risk } = pr;
  return (
    <div className="rv-overview">
      <p className="rv-summary">
        <Inline text={pr.summary} />
      </p>
      {shots.length > 0 && <ShotsSection cases={cases} onOpen={onOpen} />}
      {pr.revisions && pr.revisions.length > 0 && <RevisionSection revisions={pr.revisions} />}

      <Section title="1. 맥락: 왜 바꿨나">
        <Paragraphs items={context.problem.slice(0, 3)} />
        {context.links && context.links.length > 0 && <Links links={context.links} />}
        {context.basics && context.basics.length > 0 && (
          <details className="rv-basics">
            <summary>처음이라면: 기존 구조</summary>
            <Paragraphs items={context.basics.slice(0, 4)} />
          </details>
        )}
        <Sub title="결정과 이유">
          <Decisions decisions={context.decisions} />
        </Sub>
        <Sub title="범위">
          <div className="rv-grid">
            <Cell title="이번에 하는 것" items={context.scope.does} max={3} />
            <Cell title="일부러 하지 않은 것" items={context.scope.doesNot} max={3} />
          </div>
        </Sub>
        {pr.intuition && (
          <Sub title="핵심 아이디어">
            <p className="rv-idea">
              <Inline text={pr.intuition.idea} />
            </p>
            {pr.intuition.examples.slice(0, 2).map((example) => (
              <Figure key={example.caption} example={example} />
            ))}
          </Sub>
        )}
        {pr.diagrams && pr.diagrams.length > 0 && (
          <Sub title="구조">
            {pr.diagrams.slice(0, 2).map((diagram) => (
              <DiagramFigure key={diagram.caption} diagram={diagram} />
            ))}
          </Sub>
        )}
      </Section>

      <Section title="2. 길잡이: 어디부터 볼까">
        <Sub title="변경 요약">
          <List items={guide.changes} max={5} />
        </Sub>
        {guide.readingOrder.length > 0 && (
          <Sub title="읽는 순서">
            <ReadingOrder steps={guide.readingOrder} cases={cases} onOpen={onOpen} />
          </Sub>
        )}
        <div className="rv-grid">
          <Cell title="집중해서 봐 주세요" items={guide.focus} max={3} />
          <Cell title="대충 봐도 돼요" items={guide.skim} max={3} />
        </div>
      </Section>

      <Section title="3. 증거: 동작 확인">
        <EvidenceSection evidence={evidence} />
      </Section>

      <Section title="4. 직접 만져 보기">
        <ul className="rv-cases">
          {cases.map((entry) => (
            <li key={entry.name}>
              <button type="button" className="rv-button" onClick={() => onOpen(entry.name)}>
                {entry.case.title}
              </button>
              {entry.case.sources[0] && <code className="rv-note">{entry.case.sources[0]}</code>}
              <CaseStates entry={entry} />
            </li>
          ))}
        </ul>
        {pr.previews && pr.previews.length > 0 && <Links links={pr.previews} />}
      </Section>

      <Section title="5. 크기">
        <SizeSection size={pr.size} />
      </Section>

      <Section title="6. 위험과 영향 범위">
        <RiskSection risk={risk} />
      </Section>

      <Section title="7. 리뷰 방법">
        <ul className="rv-list">
          <li>
            코멘트 앞에 우선순위를 붙여 주세요: <code>must</code> 머지 전에 고쳐야 함, <code>nit</code> 사소한 제안,{" "}
            <code>question</code> 질문.
          </li>
          <li>린트·포맷·타입 오류는 CI가 확인합니다. 설계와 로직에 집중해 주세요.</li>
        </ul>
      </Section>

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rv-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rv-sub">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

// 빈 목록은 "해당 없음"
function List({ items, max, empty = "해당 없음" }: { items: string[]; max: number; empty?: string }) {
  if (items.length === 0) return <p className="rv-empty">{empty}</p>;
  return (
    <ul className="rv-list">
      {items.slice(0, max).map((item) => (
        <li key={item}>
          <Inline text={item} />
        </li>
      ))}
    </ul>
  );
}

// 백틱으로 감싼 부분만 인라인 코드로 보여 준다. 다른 마크다운은 해석하지 않는다 (plan.md 3.4)
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/`([^`]+)`/).map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rv-inline-code">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

function Cell({ title, items, max }: { title: string; items: string[]; max: number }) {
  return (
    <div className="rv-cell">
      <h3>{title}</h3>
      <List items={items} max={max} />
    </div>
  );
}

function Paragraphs({ items }: { items: string[] }) {
  return (
    <div className="rv-prose">
      {items.map((item) => (
        <p key={item}>
          <Inline text={item} />
        </p>
      ))}
    </div>
  );
}

function Links({ links }: { links: PrLink[] }) {
  return (
    <p className="rv-links">
      {links.map((link) => (
        <a key={link.url} className="rv-link" href={link.url} target="_blank" rel="noopener">
          {link.label}
        </a>
      ))}
    </p>
  );
}

// build가 결과 HTML에 끼워 넣은 화면 사진 (plan.md 3.4). 없거나 읽을 수 없으면 빈 배열
type Shot = {
  case: string;
  state: string;
  kind: "default" | "preset" | "scenario";
  src: string;
  width: number;
  height: number;
};

const shots: Shot[] = (() => {
  try {
    const parsed: unknown = JSON.parse(document.getElementById("review-shots")?.textContent ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is Shot =>
        !!s &&
        typeof s.case === "string" &&
        typeof s.state === "string" &&
        ["default", "preset", "scenario"].includes(s.kind) &&
        typeof s.src === "string" &&
        s.src.startsWith("data:image/") &&
        typeof s.width === "number" &&
        typeof s.height === "number",
    );
  } catch {
    return [];
  }
})();

// 사진을 누르면 그 대상 탭을 그 상태로 연다
function ShotsSection({ cases, onOpen }: { cases: CaseEntry[]; onOpen: (name: string, start?: CaseStart) => void }) {
  const titles = new Map(cases.map((entry) => [entry.name, entry.case.title]));
  return (
    <section className="rv-section">
      <h2>화면</h2>
      <div className="rv-shots">
        {shots
          .filter((shot) => titles.has(shot.case))
          .map((shot) => (
            <button
              key={`${shot.case}:${shot.kind}:${shot.state}`}
              type="button"
              className="rv-shot"
              onClick={() =>
                onOpen(
                  shot.case,
                  shot.kind === "preset" ? { preset: shot.state } : shot.kind === "scenario" ? { scenario: shot.state } : undefined,
                )
              }
            >
              {/* 찍힌 크기 그대로, 칸보다 넓으면 줄인다 */}
              <img
                src={shot.src}
                width={shot.width}
                height={shot.height}
                alt={`${titles.get(shot.case)} · ${shot.state}`}
                loading="lazy"
              />
              <span className="rv-shot-caption">
                {titles.get(shot.case)} · {shot.state}
              </span>
            </button>
          ))}
      </div>
    </section>
  );
}

// 리뷰 반영 후 바뀐 점. 지난 리뷰 커밋부터 지금 커밋까지의 비교 링크를 단다
function RevisionSection({ revisions }: { revisions: PrRevision[] }) {
  return (
    <section className="rv-section rv-revisions">
      <h2>리뷰 반영 후 바뀐 점</h2>
      {revisions.map((revision) => (
        <div key={revision.since} className="rv-sub">
          <h3>
            <code>{revision.since.slice(0, 7)}</code> 이후
            {meta.repoUrl && meta.sha && (
              <>
                {" · "}
                <a
                  className="rv-link"
                  href={`${meta.repoUrl}/compare/${revision.since}...${meta.sha}`}
                  target="_blank"
                  rel="noopener"
                >
                  바뀐 부분만 보기
                </a>
              </>
            )}
          </h3>
          <List items={revision.changes} max={5} />
        </div>
      ))}
    </section>
  );
}

function Decisions({ decisions }: { decisions: PrDecision[] }) {
  if (decisions.length === 0) return <p className="rv-empty">적힌 결정이 없습니다.</p>;
  return (
    <ol className="rv-list rv-decisions">
      {decisions.slice(0, 3).map((d) => (
        <li key={d.question}>
          <strong>
            <Inline text={d.question} />
          </strong>
          <span>
            <Inline text={d.choice} />
          </span>
          <span className="rv-note">이유: <Inline text={d.why} /></span>
          {d.rejected && <span className="rv-note">버린 대안: <Inline text={d.rejected} /></span>}
          {d.code && d.code.length > 0 && (
            <span className="rv-note rv-decision-code">
              코드:{" "}
              {d.code.slice(0, 4).map((name, i) => (
                <span key={name}>
                  {i > 0 && ", "}
                  <code>{name}</code>
                </span>
              ))}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

// 단계 파일이 대상 sources에 있으면 그 대상 탭으로 가는 버튼을 단다 (plan.md 3.4)
function ReadingOrder({
  steps,
  cases,
  onOpen,
}: {
  steps: PrCodeStep[];
  cases: CaseEntry[];
  onOpen: (name: string) => void;
}) {
  return (
    <ol className="rv-walk">
      {steps.slice(0, 5).map((step) => (
        <li key={step.title}>
          <span className={step.role === "core" ? "rv-badge rv-badge-core" : "rv-badge"}>
            {step.role === "core" ? "핵심" : "부수"}
          </span>
          <strong>
            <Inline text={step.title} />
          </strong>
          {cases
            .filter((entry) => entry.case.sources.some((source) => step.files.includes(source)))
            .map((entry) => (
              <button
                key={entry.name}
                type="button"
                className="rv-button rv-button-small rv-walk-open"
                onClick={() => onOpen(entry.name)}
              >
                플레이그라운드에서 보기: {entry.case.title} →
              </button>
            ))}
          {step.files.map((file) => (
            <code key={file} className="rv-note rv-walk-file">
              {file}
            </code>
          ))}
          <p>
            <Inline text={step.explain} />
          </p>
          {step.snippet && <Code code={step.snippet} path={step.files[0] ?? ""} />}
        </li>
      ))}
    </ol>
  );
}

const CI_LABEL = { pass: "통과", fail: "실패", pending: "진행 중", skip: "건너뜀" } as const;

function EvidenceSection({ evidence }: { evidence: PrEvidence }) {
  return (
    <>
      <Sub title="테스트">
        {evidence.tests.length === 0 ? (
          <p className="rv-empty">추가한 테스트 없음</p>
        ) : (
          <ul className="rv-list">
            {evidence.tests.slice(0, 5).map((t) => (
              <li key={t.file}>
                <code>{t.file}</code> <Inline text={t.guarantees} />
              </li>
            ))}
          </ul>
        )}
      </Sub>
      <Sub title="직접 확인한 방법">
        <List items={evidence.manual} max={3} />
      </Sub>
      <Sub title="CI">
        {evidence.ci.length === 0 ? (
          <p className="rv-empty">CI 결과 없음</p>
        ) : (
          <ul className="rv-ci">
            {evidence.ci.map((c) => (
              <li key={c.name}>
                <span className={`rv-ci-state rv-ci-${c.state}`}>{CI_LABEL[c.state]}</span>
                {c.name}
              </li>
            ))}
          </ul>
        )}
      </Sub>
    </>
  );
}

// 대상 탭에서 바로 볼 수 있는 상태(프리셋·시나리오) 이름
function CaseStates({ entry }: { entry: CaseEntry }) {
  const names = [...Object.keys(entry.case.presets ?? {}), ...Object.keys(entry.case.scenarios ?? {})];
  if (names.length === 0) return null;
  return <span className="rv-note rv-states">{names.join(" · ")}</span>;
}

// 400줄이 넘으면 나눠 읽기를 권한다 (plan.md 3.4)
const LARGE_LINES = 400;

function SizeSection({ size }: { size?: string }) {
  const { stats, commits } = meta;
  const large = stats && stats.additions + stats.deletions > LARGE_LINES;
  return (
    <>
      {stats ? (
        <p>
          파일 {stats.files}개 · <span className="rv-add">+{stats.additions}</span>{" "}
          <span className="rv-del">-{stats.deletions}</span> · 커밋 {commits.length}개
        </p>
      ) : (
        <p className="rv-empty">비교 기준과의 차이를 읽지 못했습니다.</p>
      )}
      {large && <p className="rv-warn">{LARGE_LINES}줄이 넘습니다. 커밋 단위로 나눠 읽어 주세요.</p>}
      {size && (
        <p>
          <Inline text={size} />
        </p>
      )}
      {commits.length > 0 && (
        <ol className="rv-commits">
          {commits.map((c) => (
            <li key={c.sha}>
              {meta.repoUrl ? (
                <a className="rv-link" href={`${meta.repoUrl}/commit/${c.sha}`} target="_blank" rel="noopener">
                  <code>{c.sha}</code>
                </a>
              ) : (
                <code>{c.sha}</code>
              )}{" "}
              {c.subject}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function RiskSection({ risk }: { risk: PrRisk }) {
  return (
    <div className="rv-grid">
      <Cell title="영향 범위" items={risk.impact} max={3} />
      <Cell title="호환성" items={risk.compatibility} max={3} />
      <Cell title="배포 주의사항" items={risk.deploy} max={3} />
      <Cell title="보안·성능" items={risk.securityPerf} max={3} />
    </div>
  );
}

// 예시 그림. flow는 단계 상자를 화살표로 잇고, compare는 전/후 상자를 나란히 둔다
function Figure({ example }: { example: PrExample }) {
  return (
    <figure className="rv-figure">
      {example.kind === "flow" ? (
        <ol className="rv-flow">
          {example.steps.slice(0, 5).map((step, i) => (
            <li key={i} className="rv-flow-step">
              <span className="rv-flow-label">
                <Inline text={step.label} />
              </span>
              {step.data && <code className="rv-flow-data">{step.data}</code>}
            </li>
          ))}
        </ol>
      ) : (
        <div className="rv-compare">
          {[example.before, example.after].map((side, i) => (
            <div key={i} className={i === 0 ? "rv-side rv-side-before" : "rv-side rv-side-after"}>
              <span className="rv-side-label">
                <Inline text={side.label} />
              </span>
              <pre className="rv-side-data">{side.data}</pre>
            </div>
          ))}
        </div>
      )}
      <figcaption>
        <Inline text={example.caption} />
      </figcaption>
    </figure>
  );
}

function DiagramFigure({ diagram }: { diagram: PrDiagram }) {
  const svg = cleanSvg(diagram.svg);
  return (
    <figure className="rv-figure">
      {svg ? (
        <div className="rv-diagram" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <p className="rv-empty">그림을 그릴 수 없습니다.</p>
      )}
      <figcaption>
        <Inline text={diagram.caption} />
      </figcaption>
    </figure>
  );
}

// 스크립트·외부 링크·이벤트 속성을 지운 SVG 문자열. 읽을 수 없으면 null
function cleanSvg(source: string): string | null {
  const doc = new DOMParser().parseFromString(source.trim(), "image/svg+xml");
  const root = doc.documentElement;
  if (root.nodeName !== "svg" || doc.getElementsByTagName("parsererror").length > 0) return null;
  root.querySelectorAll("script, foreignObject, image, iframe, style").forEach((el) => el.remove());
  for (const el of [root, ...root.querySelectorAll("*")]) {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const isOuterLink = (name === "href" || name === "xlink:href") && !attr.value.startsWith("#");
      if (name.startsWith("on") || isOuterLink) el.removeAttribute(attr.name);
    }
  }
  root.removeAttribute("width");
  root.removeAttribute("height");
  return new XMLSerializer().serializeToString(root);
}
