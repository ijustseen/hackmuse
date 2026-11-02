import { ImageResponse } from "next/og";
import { JUDGES, VOTING_JUDGES } from "@/lib/judges";
import { OG, OgBar, OgFin, ogFonts } from "@/lib/server/og";

export const alt = "HACKMUSE: throw your hackathon idea to the sharks";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: OG.cream }}>
        <OgBar right="AI shark tank for hackathon ideas" />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "40px 44px 0" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "Display",
              fontSize: 118,
              lineHeight: 0.88,
              textTransform: "uppercase",
              color: OG.ink,
            }}
          >
            <span>Throw your hackathon</span>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <span>idea to the</span>
              <span
                style={{
                  display: "flex",
                  background: OG.coral,
                  border: `5px solid ${OG.ink}`,
                  boxShadow: `14px 14px 0 0 ${OG.blood}`,
                  padding: "0 22px",
                  transform: "rotate(-3deg)",
                }}
              >
                sharks.
              </span>
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 34, fontFamily: "Mono", fontSize: 24, color: OG.ink, opacity: 0.75 }}>
            Five AI sharks and 30 people from the feed. Find out what it survives.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-around",
            height: 120,
            background: OG.tealDeep,
            borderTop: `6px solid ${OG.ink}`,
            paddingBottom: 18,
          }}
        >
          {VOTING_JUDGES.map((id, i) => (
            <div key={id} style={{ display: "flex", transform: `translateY(${(i % 2) * -14}px)` }}>
              <OgFin color={JUDGES[id].color} size={84 - (i % 3) * 10} />
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
