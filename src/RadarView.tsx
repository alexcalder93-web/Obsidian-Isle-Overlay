import type React from "react";

export type RadarMarker = {
  id: string;
  u: number;
  v: number;
  label: string;
  color: string;
  kind: "place" | "friend";
  shape?: string;
  icon?: string | null;
};

function Glyph({
  kind,
  shape,
  color,
  r,
}: {
  kind: string;
  shape?: string;
  color: string;
  r: number;
}) {
  const stroke = "rgba(0,0,0,0.75)";

  if (kind === "friend") {
    return (
      <>
        <circle
          r={r + 4}
          fill={color}
          fillOpacity={0.08}
        />

        <circle
          r={r}
          fill={color}
          fillOpacity={0.95}
          stroke={stroke}
          strokeWidth={1.5}
        />

        <circle
          r={r * 0.42}
          fill="#07100b"
        />

        <circle
          r={r * 0.18}
          fill="#ffffff"
          fillOpacity={0.7}
        />
      </>
    );
  }

  if (shape === "polygon" || shape === "diamond") {
    return (
      <polygon
        points={`0,${-r} ${r},0 0,${r} ${-r},0`}
        fill={color}
        fillOpacity={0.95}
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    );
  }

  if (shape === "triangle") {
    return (
      <polygon
        points={`0,${-r} ${r},${r} ${-r},${r}`}
        fill={color}
        fillOpacity={0.95}
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    );
  }

  if (shape === "square" || shape === "rectangle") {
    return (
      <rect
        x={-r}
        y={-r}
        width={2 * r}
        height={2 * r}
        rx={2}
        fill={color}
        fillOpacity={0.95}
        stroke={stroke}
        strokeWidth={1.4}
      />
    );
  }

  return (
    <circle
      r={r}
      fill={color}
      fillOpacity={0.95}
      stroke={stroke}
      strokeWidth={1.4}
    />
  );
}

export function RadarView({
  layerBase,
  diameter,
  selfU,
  selfV,
  headingDeg,
  rangeUV,
  rangeLabel,
  markers,
  showLabels,
}: {
  layerBase: string;
  diameter: number;
  selfU: number | null;
  selfV: number | null;
  headingDeg: number | null;
  rangeUV: number;
  rangeLabel: string;
  markers: RadarMarker[];
  showLabels: boolean;
}) {
  const D = diameter;
  const cx = D / 2;
  const cy = D / 2;
  const R = D / 2;

  if (selfU == null || selfV == null) {
    return (
      <div style={ringWrap(D)}>
        <RingsOnly D={D} />

        <div style={noSignalStyle}>
          <div style={noSignalIcon}>
            <span />
          </div>

          <div style={noSignalTitle}>
            NO SIGNAL
          </div>

          <div style={noSignalText}>
            Join a server as a dino to acquire your position.
          </div>
        </div>

        <div style={statusStyle}>
          <span style={statusDotOffline} />
          OFFLINE
        </div>
      </div>
    );
  }

  const mapSize = D / (2 * rangeUV);

  const originX = cx - selfU * mapSize;
  const originY = cy - selfV * mapSize;

  const shown = markers
    .map((m) => {
      const x = originX + m.u * mapSize;
      const y = originY + m.v * mapSize;

      const d = Math.hypot(
        x - cx,
        y - cy,
      );

      return {
        m,
        x,
        y,
        d,
      };
    })
    .filter((p) => p.d <= R - 7)
    .sort((a, b) => b.d - a.d);

  const nearestFew = new Set(
    [...shown]
      .sort((a, b) => a.d - b.d)
      .slice(0, 4)
      .map((p) => p.m.id),
  );

  return (
    <div style={ringWrap(D)}>
      {/* MAP */}
      <div
        style={{
          position: "absolute",
          left: originX,
          top: originY,
          width: mapSize,
          height: mapSize,
        }}
      >
        {["base", "water", "land"].map((layer) => (
          <img
            key={layer}
            src={`${layerBase}/${layer}.webp`}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        ))}
      </div>

      {/* DARK VIGNETTE */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, rgba(6,10,8,0) 38%, rgba(6,10,8,0.12) 55%, rgba(6,10,8,0.45) 78%, rgba(6,10,8,0.94) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* RADAR SVG */}
      <svg
        width={D}
        height={D}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        {/* RANGE RINGS */}
        {[0.33, 0.66, 1].map((f, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={R * f - 1}
            fill="none"
            stroke={
              i === 2
                ? "rgba(124,242,166,0.36)"
                : "rgba(124,242,166,0.17)"
            }
            strokeWidth={i === 2 ? 1.5 : 1}
          />
        ))}

        {/* CROSSHAIR */}
        <line
          x1={cx}
          y1={8}
          x2={cx}
          y2={D - 8}
          stroke="rgba(124,242,166,0.075)"
          strokeWidth={1}
        />

        <line
          x1={8}
          y1={cy}
          x2={D - 8}
          y2={cy}
          stroke="rgba(124,242,166,0.075)"
          strokeWidth={1}
        />

        {/* CENTER CROSS */}
        <line
          x1={cx - 18}
          y1={cy}
          x2={cx + 18}
          y2={cy}
          stroke="rgba(124,242,166,0.18)"
          strokeWidth={1}
        />

        <line
          x1={cx}
          y1={cy - 18}
          x2={cx}
          y2={cy + 18}
          stroke="rgba(124,242,166,0.18)"
          strokeWidth={1}
        />

        {/* RANGE TICKS */}
        {[0.33, 0.66, 1].map((f, i) => {
          const rr = R * f - 1;

          return (
            <g key={`tick-${i}`}>
              <line
                x1={cx - 4}
                y1={cy - rr}
                x2={cx + 4}
                y2={cy - rr}
                stroke="rgba(124,242,166,0.32)"
                strokeWidth={1}
              />

              <line
                x1={cx + rr}
                y1={cy - 4}
                x2={cx + rr}
                y2={cy + 4}
                stroke="rgba(124,242,166,0.32)"
                strokeWidth={1}
              />

              <line
                x1={cx - 4}
                y1={cy + rr}
                x2={cx + 4}
                y2={cy + rr}
                stroke="rgba(124,242,166,0.32)"
                strokeWidth={1}
              />

              <line
                x1={cx - rr}
                y1={cy - 4}
                x2={cx - rr}
                y2={cy + 4}
                stroke="rgba(124,242,166,0.32)"
                strokeWidth={1}
              />
            </g>
          );
        })}

        {/* MARKERS */}
        {shown.map(({ m, x, y }) => {
          const r =
            m.kind === "friend"
              ? 7
              : 5.5;

          const label =
            showLabels || nearestFew.has(m.id)
              ? m.label
              : null;

          return (
            <g
              key={m.id}
              transform={`translate(${x} ${y})`}
            >
              {m.icon ? (
                <image
                  href={m.icon}
                  x={-10}
                  y={-10}
                  width={20}
                  height={20}
                  preserveAspectRatio="xMidYMid meet"
                />
              ) : (
                <Glyph
                  kind={m.kind}
                  shape={m.shape}
                  color={m.color}
                  r={r}
                />
              )}

              {label ? (
                <>
                  <rect
                    x={-38}
                    y={-r - 20}
                    width={76}
                    height={16}
                    rx={4}
                    fill="rgba(3,7,5,0.78)"
                    stroke="rgba(124,242,166,0.13)"
                  />

                  <text
                    x={0}
                    y={-r - 8}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#edf4ef"
                    style={{
                      fontWeight: 650,
                      letterSpacing: 0.2,
                    }}
                  >
                    {m.label}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}

        {/* PLAYER */}
        <g
          transform={`translate(${cx} ${cy}) rotate(${headingDeg ?? 0})`}
        >
          {/* Large glow */}
          <circle
            r={23}
            fill="rgba(255,206,84,0.06)"
            stroke="rgba(255,206,84,0.18)"
            strokeWidth={1}
          />

          {/* Outer targeting ring */}
          <circle
            r={18}
            fill="none"
            stroke="rgba(255,206,84,0.55)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />

          {/* Inner glow */}
          <circle
            r={13}
            fill="rgba(255,206,84,0.15)"
            stroke="rgba(255,206,84,0.72)"
            strokeWidth={1.2}
          />

          {/* Direction arrow */}
          <polygon
            points="22,0 -9,-10 -5,0 -9,10"
            fill="#ffce54"
            stroke="#1a1205"
            strokeWidth={1.7}
            strokeLinejoin="round"
          />

          {/* Arrow highlight */}
          <polygon
            points="15,0 -5,-6 -2,0 -5,6"
            fill="#fff1a8"
            fillOpacity={0.85}
          />

          {/* Player centre */}
          <circle
            r={3.5}
            fill="#ffce54"
            stroke="#1a1205"
            strokeWidth={1}
          />
        </g>
      </svg>

      {/* COMPASS */}
      <div style={compassTopStyle}>N</div>
      <div style={compassRightStyle}>E</div>
      <div style={compassBottomStyle}>S</div>
      <div style={compassLeftStyle}>W</div>

      {/* STATUS */}
      <div style={statusStyle}>
        <span style={statusDotOnline} />
        LIVE
      </div>

      {/* RANGE */}
      <div style={rangeStyle}>
        <span style={{ opacity: 0.5 }}>
          RANGE
        </span>

        <span style={{ marginLeft: 5 }}>
          {rangeLabel}
        </span>
      </div>
    </div>
  );
}

function RingsOnly({
  D,
}: {
  D: number;
}) {
  const cx = D / 2;
  const R = D / 2;

  return (
    <svg
      width={D}
      height={D}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: 0.65,
      }}
    >
      {[0.33, 0.66, 1].map((f, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cx}
          r={R * f - 1}
          fill="none"
          stroke={
            i === 2
              ? "rgba(124,242,166,0.28)"
              : "rgba(124,242,166,0.14)"
          }
          strokeWidth={1}
        />
      ))}

      <line
        x1={cx}
        y1={0}
        x2={cx}
        y2={D}
        stroke="rgba(124,242,166,0.06)"
      />

      <line
        x1={0}
        y1={cx}
        x2={D}
        y2={cx}
        stroke="rgba(124,242,166,0.06)"
      />
    </svg>
  );
}

function ringWrap(
  D: number,
): React.CSSProperties {
  return {
    position: "relative",
    width: D,
    height: D,
    borderRadius: "50%",
    overflow: "hidden",
    background: "#070b09",
    border: "1px solid rgba(124,242,166,0.28)",
    boxShadow: `
      inset 0 0 0 1px rgba(124,242,166,0.07),
      inset 0 0 30px rgba(0,0,0,0.65),
      0 0 20px rgba(0,0,0,0.4),
      0 0 8px rgba(124,242,166,0.05)
    `,
    flexShrink: 0,
  };
}

const compassTopStyle: React.CSSProperties = {
  position: "absolute",
  top: 7,
  left: "50%",
  transform: "translateX(-50%)",
  fontFamily: "var(--mono)",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 1,
  color: "#dce7df",
  pointerEvents: "none",
};

const compassRightStyle: React.CSSProperties = {
  position: "absolute",
  right: 8,
  top: "50%",
  transform: "translateY(-50%)",
  fontFamily: "var(--mono)",
  fontSize: 9,
  fontWeight: 700,
  color: "var(--faint)",
  pointerEvents: "none",
};

const compassBottomStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 7,
  left: "50%",
  transform: "translateX(-50%)",
  fontFamily: "var(--mono)",
  fontSize: 9,
  fontWeight: 700,
  color: "var(--faint)",
  pointerEvents: "none",
};

const compassLeftStyle: React.CSSProperties = {
  position: "absolute",
  left: 8,
  top: "50%",
  transform: "translateY(-50%)",
  fontFamily: "var(--mono)",
  fontSize: 9,
  fontWeight: 700,
  color: "var(--faint)",
  pointerEvents: "none",
};

const statusStyle: React.CSSProperties = {
  position: "absolute",
  top: 9,
  left: 11,
  display: "flex",
  alignItems: "center",
  gap: 5,
  fontFamily: "var(--mono)",
  fontSize: 8,
  fontWeight: 700,
  letterSpacing: 0.8,
  color: "rgba(220,231,223,0.72)",
  pointerEvents: "none",
};

const statusDotOnline: React.CSSProperties = {
  width: 5,
  height: 5,
  borderRadius: "50%",
  background: "#7cf2a6",
  boxShadow: "0 0 7px rgba(124,242,166,0.8)",
};

const statusDotOffline: React.CSSProperties = {
  width: 5,
  height: 5,
  borderRadius: "50%",
  background: "#ff6b6b",
  boxShadow: "0 0 7px rgba(255,107,107,0.6)",
};

const rangeStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 8,
  right: 10,
  display: "flex",
  alignItems: "center",
  padding: "3px 6px",
  borderRadius: 4,
  background: "rgba(3,7,5,0.72)",
  border: "1px solid rgba(124,242,166,0.11)",
  fontFamily: "var(--mono)",
  fontSize: 8,
  fontWeight: 650,
  letterSpacing: 0.6,
  color: "#dce7df",
  pointerEvents: "none",
};

const noSignalStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  textAlign: "center",
  padding: 30,
};

const noSignalIcon: React.CSSProperties = {
  width: 30,
  height: 30,
  marginBottom: 10,
  borderRadius: "50%",
  border: "1px solid rgba(124,242,166,0.2)",
  display: "grid",
  placeItems: "center",
};

const noSignalTitle: React.CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 2,
  color: "var(--muted)",
};

const noSignalText: React.CSSProperties = {
  marginTop: 6,
  maxWidth: 190,
  fontSize: 10,
  lineHeight: 1.5,
  color: "var(--faint)",
};