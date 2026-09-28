/**
 * Hero illustration: a mini take-log card that IS the product session.
 * Purely decorative (aria-hidden); no live data implied.
 */
export function HeroSlate() {
  const lines = [
    { n: "01", text: "Eighteen hours. That is all this takes.", state: "clean" },
    { n: "02", text: "Coarse grind one cup of your darkest roast.", state: "clean" },
    { n: "03", text: "Add four cups of cold, filtered water.", state: "retake" },
    { n: "04", text: "Stir once, cover it, and walk away.", state: "pending" },
  ] as const;

  return (
    <div aria-hidden className="hairline relative bg-raised p-7">
      <div className="flex items-center justify-between">
        <span className="microlabel">Session 47 · Cold brew</span>
        <span className="microlabel text-cut-text">Take 02</span>
      </div>

      <div className="mt-6 space-y-4">
        {lines.map((l) => (
          <div key={l.n} className="flex items-baseline gap-3">
            <span
              className={`microlabel w-7 shrink-0 text-right ${l.state === "retake" ? "text-cut-text" : "text-ink-fade"}`}
            >
              {l.n}
            </span>
            {l.state === "retake" ? (
              <span className="relative text-lg leading-snug text-cut-text line-through decoration-2">
                {l.text}
              </span>
            ) : (
              <span
                className={`text-lg leading-snug ${l.state === "clean" ? "text-ink" : "text-ink-fade"}`}
              >
                {l.text}
              </span>
            )}
            {l.state === "retake" && (
              <span className="microlabel shrink-0 bg-mark px-2 py-0.5 text-ink">↻ retake</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-7 flex items-end gap-1" aria-hidden>
        {[0.25, 0.5, 0.8, 0.45, 0.9, 0.6, 0.35, 0.75, 1, 0.55, 0.3, 0.65, 0.85, 0.4, 0.7, 0.5].map(
          (h, i) => (
            <div
              key={i}
              className="w-1.5 bg-ink"
              style={{ height: `${6 + h * 26}px`, opacity: 0.2 + h * 0.6 }}
            />
          ),
        )}
        <span className="microlabel ml-3">Cut. Line three: four cups.</span>
      </div>
    </div>
  );
}
