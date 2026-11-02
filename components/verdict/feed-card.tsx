import {
  FEED_SIZE,
  FEED_WEIGHT,
  PLATFORM_LABEL,
  REACTIONS,
  REACTION_COLOR,
  REACTION_LABEL,
  REACTION_SHORT,
  type FeedQuote,
  type FeedResult,
} from "@/lib/feed";

/**
 * The feed's result: how 30 simulated people reacted. No hooks and no client code, so the live
 * scorecard and the static share page render the same card. `showAll` lists every person; the
 * share page leaves it off (decision F4).
 */
export function FeedCard({ feed, showAll = false }: { feed: FeedResult; showAll?: boolean }) {
  const quotes = feed.best.filter((q) => q.line);
  return (
    <div className="border-[3px] border-ink bg-paper shadow-brutal">
      <div className="flex items-center justify-between gap-3 border-b-[3px] border-ink bg-teal-deep px-4 py-2 text-cream">
        <span className="font-mono text-xs font-bold uppercase tracking-[0.25em]">The feed · {FEED_SIZE} people</span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-cream/70">
          {feed.source === "demo" ? "Demo" : `${Math.round(FEED_WEIGHT * 100)}% of the grade`}
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <p className="font-display text-4xl font-black uppercase leading-none sm:text-5xl">
            {feed.counts.share} of {FEED_SIZE} <span className="text-ink/45">would share</span>
          </p>
          <p className="font-display text-3xl font-black tabular-nums">
            {feed.score}
            <span className="text-lg text-ink/40">/100</span>
          </p>
        </div>
        <p className="mt-2 text-sm leading-snug text-ink/70">
          {feed.changed > 0
            ? `${feed.changed} changed their mind after reading the others' replies.`
            : "Nobody changed their mind after reading the replies."}
        </p>

        {/* One stacked bar, then the legend under it. */}
        <div className="mt-4 flex h-5 border-2 border-ink bg-cream" aria-hidden>
          {REACTIONS.filter((r) => feed.counts[r] > 0).map((r) => (
            <span
              key={r}
              className="h-full border-r-2 border-ink last:border-r-0"
              style={{ width: `${(feed.counts[r] / FEED_SIZE) * 100}%`, backgroundColor: REACTION_COLOR[r] }}
            />
          ))}
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
          {REACTIONS.map((r) => (
            <li key={r} className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider">
              <span className="h-3 w-3 shrink-0 border-2 border-ink" style={{ backgroundColor: REACTION_COLOR[r] }} />
              <span className="truncate">{REACTION_SHORT[r]}</span>
              <span className="ml-auto tabular-nums sm:ml-0">{feed.counts[r]}</span>
            </li>
          ))}
        </ul>

        {quotes.length > 0 && (
          <ul className="mt-5 space-y-3">
            {quotes.map((q) => (
              <Quote key={`${q.handle}-${q.line}`} quote={q} />
            ))}
          </ul>
        )}

        {showAll && (
          <details className="mt-5 border-t-2 border-dashed border-ink/25 pt-3">
            <summary data-cursor="open" className="cursor-pointer font-mono text-[11px] font-bold uppercase tracking-wider text-ink/70">
              All {feed.people.length} reactions
            </summary>
            <ul className="mt-3 divide-y-2 divide-dashed divide-ink/15">
              {feed.people.map((p) => (
                <li key={p.handle + p.who} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 py-2 text-sm">
                  <span className="mt-1 h-3 w-3 border-2 border-ink" style={{ backgroundColor: REACTION_COLOR[p.final.reaction] }} />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-2 font-mono text-[10px] font-bold uppercase tracking-wider">
                      <span>{p.handle}</span>
                      <span className="text-ink/55">{PLATFORM_LABEL[p.platform]}</span>
                      <span className="text-ink/55">
                        {p.first.reaction !== p.final.reaction
                          ? `${REACTION_LABEL[p.first.reaction]} → ${REACTION_LABEL[p.final.reaction]}`
                          : REACTION_LABEL[p.final.reaction]}
                      </span>
                    </p>
                    <p className="text-xs text-ink/60">{p.who}</p>
                    {p.final.line && <p className="mt-0.5 leading-snug">&ldquo;{p.final.line}&rdquo;</p>}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )}

        <p className="mt-5 text-xs leading-snug text-ink/60">
          Simulated people, written by Gemma: a gut check on how a feed might take the idea, not a survey.
        </p>
      </div>
    </div>
  );
}

function Quote({ quote }: { quote: FeedQuote }) {
  return (
    <li className="border-l-[6px] bg-cream px-3 py-2" style={{ borderColor: REACTION_COLOR[quote.reaction] }}>
      <p className="text-base font-medium leading-snug">&ldquo;{quote.line}&rdquo;</p>
      <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink/65">
        {quote.handle} · {PLATFORM_LABEL[quote.platform]} · {REACTION_LABEL[quote.reaction]}
      </p>
    </li>
  );
}
