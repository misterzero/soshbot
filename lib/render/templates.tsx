/**
 * Promo asset templates (F3), rendered by Satori.
 * Satori supports a flexbox subset: every multi-child element is explicit
 * about display:flex, and there is no CSS grid — the monthly calendar is
 * built from flex rows.
 */

export type BrandColors = {
  primary: string;
  secondary: string;
  background: string;
};

export const DEFAULT_COLORS: BrandColors = {
  primary: "#c9a86a",
  secondary: "#1f3a4d",
  background: "#12191f",
};

type Size = { w: number; h: number };

const base = (colors: BrandColors, size: Size) =>
  ({
    width: size.w,
    height: size.h,
    display: "flex",
    flexDirection: "column" as const,
    backgroundImage: `linear-gradient(135deg, ${colors.background} 0%, ${colors.secondary} 100%)`,
    color: "#f4efe4",
    fontFamily: "Outfit",
    padding: size.w * 0.06,
    justifyContent: "space-between",
  }) as const;

function Footer({ venueName, colors, scale }: { venueName: string; colors: BrandColors; scale: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 * scale }}>
      <div style={{ display: "flex", width: 40 * scale, height: 4 * scale, backgroundColor: colors.primary }} />
      <div style={{ display: "flex", fontSize: 26 * scale, letterSpacing: 2, textTransform: "uppercase" }}>
        {venueName}
      </div>
    </div>
  );
}

export function DailyPost(props: {
  actName: string;
  hook: string | null;
  whenLine: string;
  space: string | null;
  venueName: string;
  colors: BrandColors;
  photoDataUri: string | null;
  size: Size;
}) {
  const { colors, size } = props;
  const scale = size.w / 1080;
  return (
    <div style={{ ...base(colors, size), position: "relative" }}>
      {props.photoDataUri && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={props.photoDataUri}
          alt=""
          width={size.w}
          height={size.h}
          style={{ position: "absolute", top: 0, left: 0, objectFit: "cover", opacity: 0.28 }}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 30 * scale, color: colors.primary, letterSpacing: 6, textTransform: "uppercase" }}>
          Live at {props.space ?? "the venue"}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Big Shoulders",
            fontWeight: 700,
            fontSize: Math.min(120 * scale, (size.w * 1.6) / Math.max(props.actName.length, 8)),
            lineHeight: 1.05,
            textTransform: "uppercase",
          }}
        >
          {props.actName}
        </div>
        {props.hook && (
          <div style={{ display: "flex", fontSize: 34 * scale, color: "#cdd6dd", marginTop: 18 * scale }}>{props.hook}</div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 * scale }}>
        <div style={{ display: "flex", fontSize: 44 * scale, fontWeight: 700, color: colors.primary }}>{props.whenLine}</div>
        <Footer venueName={props.venueName} colors={colors} scale={scale} />
      </div>
    </div>
  );
}

export function WeeklyLineup(props: {
  rows: { day: string; act: string }[];
  venueName: string;
  colors: BrandColors;
  size: Size;
}) {
  const { colors, size } = props;
  const scale = size.w / 1080;
  return (
    <div style={base(colors, size)}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 28 * scale, color: colors.primary, letterSpacing: 6, textTransform: "uppercase" }}>
          This week
        </div>
        <div style={{ display: "flex", fontFamily: "Big Shoulders", fontWeight: 700, fontSize: 84 * scale, textTransform: "uppercase" }}>
          Live Lineup
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 * scale }}>
        {props.rows.slice(0, 7).map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 24 * scale }}>
            <div style={{ display: "flex", width: 120 * scale, fontSize: 30 * scale, color: colors.primary, textTransform: "uppercase" }}>
              {r.day}
            </div>
            <div style={{ display: "flex", fontFamily: "Big Shoulders", fontWeight: 700, fontSize: 46 * scale, textTransform: "uppercase" }}>
              {r.act}
            </div>
          </div>
        ))}
        {props.rows.length === 0 && (
          <div style={{ display: "flex", fontSize: 40 * scale }}>See you at the bar.</div>
        )}
      </div>
      <Footer venueName={props.venueName} colors={colors} scale={scale} />
    </div>
  );
}

export type MonthCell = { day: number | null; hasEvent: boolean; label: string | null };

export function MonthlyCalendar(props: {
  monthLabel: string;
  weeks: MonthCell[][];
  venueName: string;
  colors: BrandColors;
  size: Size;
}) {
  const { colors, size } = props;
  const scale = size.w / 1080;
  const cellW = (size.w - size.w * 0.12) / 7;
  // Cell height must fit the available vertical space (header + footer take
  // ~38% of the canvas), or landscape sizes overflow the bottom edge.
  const rows = Math.max(props.weeks.length, 1);
  const cellH = Math.min(cellW * 0.72, (size.h * 0.62 - 40 * scale) / rows);
  return (
    <div style={base(colors, size)}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20 * scale }}>
        <div style={{ display: "flex", fontFamily: "Big Shoulders", fontWeight: 700, fontSize: 72 * scale, textTransform: "uppercase" }}>
          {props.monthLabel}
        </div>
        <div style={{ display: "flex", fontSize: 26 * scale, color: colors.primary, letterSpacing: 4, textTransform: "uppercase" }}>
          Live events
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 * scale }}>
        <div style={{ display: "flex" }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} style={{ display: "flex", width: cellW, justifyContent: "center", fontSize: 22 * scale, color: colors.primary }}>
              {d}
            </div>
          ))}
        </div>
        {props.weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex" }}>
            {week.map((cell, ci) => (
              <div
                key={ci}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: cellW,
                  height: cellH,
                  padding: 6 * scale,
                  border: `1px solid ${cell.day ? "rgba(255,255,255,0.14)" : "transparent"}`,
                  backgroundColor: cell.hasEvent ? colors.primary : "transparent",
                  color: cell.hasEvent ? "#161006" : "#f4efe4",
                }}
              >
                <div style={{ display: "flex", fontSize: 22 * scale, fontWeight: 700 }}>{cell.day ?? ""}</div>
                {cell.label && (
                  <div style={{ display: "flex", fontSize: 15 * scale, lineHeight: 1.1 }}>
                    {cell.label.length > 14 ? `${cell.label.slice(0, 13)}…` : cell.label}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <Footer venueName={props.venueName} colors={colors} scale={scale} />
    </div>
  );
}
