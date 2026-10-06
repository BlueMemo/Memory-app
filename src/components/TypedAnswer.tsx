"use client";

import { useI18n } from "@/i18n";
import { diffSegments, type AnswerMode, type TypedResult, type Verdict } from "@/lib/typedAnswer";

/** The box a learner types an answer into on a "type the answer" card. Enter checks it. */
export function TypedAnswerInput({ value, onChange, onSubmit }: { value: string; onChange: (value: string) => void; onSubmit: () => void }) {
  const t = useI18n().t.study;
  return (
    <input
      type="text"
      className="typed-input"
      value={value}
      autoFocus
      // Spelling is the point, so the browser must not "fix" what's typed.
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      aria-label={t.typeHere}
      placeholder={t.typeHere}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSubmit();
        }
      }}
    />
  );
}

/** Above the revealed answer: whether what was typed was right, and where it differs. */
export function TypedVerdict({ result, typed }: { result: TypedResult; typed: string }) {
  const t = useI18n().t.study;
  const labels: Record<Verdict, string> = {
    correct: t.verdictCorrect,
    almost: t.verdictAlmost,
    wrong: t.verdictWrong,
    empty: t.verdictEmpty,
  };
  const showTyped = result.verdict !== "empty";
  return (
    <div className={`typed-verdict ${result.verdict}`} role="status">
      <strong>{labels[result.verdict]}</strong>
      {showTyped && (
        <span className="typed-text">
          {t.youTyped}{" "}
          <span className="typed-value">
            {result.verdict === "correct"
              ? typed.trim()
              : diffSegments(typed.trim(), result.expected).map((s, i) => (
                  <span key={i} className={s.ok ? undefined : "typed-wrong"}>
                    {s.text}
                  </span>
                ))}
          </span>
        </span>
      )}
    </div>
  );
}

/** Two choices: flip the card, or type the answer. Used for each card and as the starting choice for new ones. */
export function AnswerStyleToggle({ value, onChange, hint, label }: { value: AnswerMode; onChange: (mode: AnswerMode) => void; hint?: string; label?: string }) {
  const t = useI18n().t.answerStyle;
  const options: { mode: AnswerMode; text: string }[] = [
    { mode: "show", text: t.show },
    { mode: "type", text: t.type },
  ];
  return (
    <div className="field">
      <span className="field-heading" id="answer-style-label">
        {label ?? t.label}
      </span>
      <div className="answer-style-toggle" role="group" aria-labelledby="answer-style-label">
        {options.map((o) => (
          <button key={o.mode} type="button" className={value === o.mode ? "active" : undefined} aria-pressed={value === o.mode} onClick={() => onChange(o.mode)}>
            {o.text}
          </button>
        ))}
      </div>
      <span className="hint">{hint ?? (value === "type" ? t.typeHint : t.showHint)}</span>
    </div>
  );
}
