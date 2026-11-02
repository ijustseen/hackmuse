import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { JUDGES, VOTING_JUDGES } from "@/lib/judges";
import { headlineScore } from "@/lib/feed";
import { reviewOverall } from "@/lib/review";
import { gradeFor, survival } from "@/lib/rubric";
import { getPublicVerdict, readJudgmentId } from "@/lib/server/db";
import { OG, OgBar, OgFin, ogFonts } from "@/lib/server/og";

export const alt = "A HACKMUSE verdict";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = readJudgmentId((await params).id);
  const verdict = id ? await getPublicVerdict(id) : null;
  const fonts = await ogFonts();

  // Unknown or unshared: a plain brand card that gives nothing away.
  if (!verdict) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: OG.cream }}>
          <OgBar right="Verdict" />
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Display",
              fontSize: 110,
              textTransform: "uppercase",
              color: OG.ink,
            }}
          >
            Into the tank.
          </div>
        </div>
      ),
      { ...size, fonts },
    );
  }

  const { debate, review, feed } = verdict;
  const overall = headlineScore((review && reviewOverall(review)) ?? debate.overall, feed);
  const grade = gradeFor(overall);
  const survived = survival(debate.votes);

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: OG.cream }}>
        <OgBar right="Shark tank verdict" />
        <div style={{ display: "flex", flex: 1, padding: "34px 44px 36px", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div
              style={{
                display: "flex",
                fontFamily: "Display",
                fontSize: 88,
                lineHeight: 0.9,
                textTransform: "uppercase",
                color: OG.ink,
              }}
            >
              {clip(debate.title, 38)}
            </div>
            <div style={{ display: "flex", marginTop: 18, fontSize: 26, lineHeight: 1.3, color: OG.ink, opacity: 0.8 }}>
              {clip(verdict.idea, 130)}
            </div>
            <div style={{ display: "flex", flex: 1 }} />
            <div style={{ display: "flex", fontFamily: "Mono", fontSize: 22, letterSpacing: 3, textTransform: "uppercase" }}>
              {survived.line}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              {VOTING_JUDGES.map((judge) => {
                const letGo = survived.survived.includes(judge);
                return (
                  <div
                    key={judge}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: 112,
                      padding: "8px 0",
                      border: `4px solid ${OG.ink}`,
                      background: letGo ? JUDGES[judge].color : OG.paper,
                    }}
                  >
                    <OgFin color={letGo ? OG.paper : JUDGES[judge].color} size={40} />
                    <div style={{ display: "flex", fontFamily: "Display", fontSize: 30, textTransform: "uppercase" }}>
                      {JUDGES[judge].short}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        fontFamily: "Mono",
                        fontSize: 15,
                        letterSpacing: 2,
                        color: letGo ? OG.ink : OG.coralDeep,
                      }}
                    >
                      {letGo ? "LET GO" : "BIT"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: 360,
              background: OG.paper,
              border: `6px solid ${OG.ink}`,
              boxShadow: `16px 16px 0 0 ${OG.blood}`,
            }}
          >
            <div style={{ display: "flex", fontFamily: "Mono", fontSize: 20, letterSpacing: 4 }}>OVERALL</div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <span style={{ fontFamily: "Display", fontSize: 200, lineHeight: 1, color: OG.ink }}>{overall}</span>
              <span style={{ fontFamily: "Display", fontSize: 54, lineHeight: 1.6, color: OG.ink, opacity: 0.4 }}>/100</span>
            </div>
            {/* Satori has no double borders: two nested solid ones make the stamp. */}
            <div
              style={{
                display: "flex",
                marginTop: 6,
                padding: 4,
                border: `4px solid ${OG.coralDeep}`,
                transform: "rotate(-6deg)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  padding: "2px 18px",
                  border: `2px solid ${OG.coralDeep}`,
                  color: OG.coralDeep,
                  fontFamily: "Display",
                  fontSize: 58,
                  textTransform: "uppercase",
                }}
              >
                {grade.label}
              </div>
            </div>
            {feed && (
              <div style={{ display: "flex", marginTop: 22, fontFamily: "Mono", fontSize: 18, letterSpacing: 2 }}>
                {`FEED · ${feed.counts.share}/${feed.people.length} WOULD SHARE`}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
