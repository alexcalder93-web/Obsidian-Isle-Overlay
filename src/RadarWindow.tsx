import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type React from "react";

import type {
  MapPlayerShape,
  MapZoneShape,
} from "./livemap/MapCanvas";

import {
  worldToNormalized,
  type MapCalibration,
} from "./livemap/calibration";

import {
  RadarView,
  type RadarMarker,
} from "./RadarView";

import type { LiveFrame } from "./preload";

type MapResp = {
  liveMapEnabled?: boolean;
  allowed?: boolean;
  calibration?: MapCalibration | null;
  pois?: MapZoneShape[];
  markers?: MapPlayerShape[];
  error?: string;
  status?: number;
};

const RANGE_UV = [
  0.05,
  0.1,
  0.2,
  0.4,
];

const RANGE_LABEL = [
  "CLOSE",
  "MID",
  "FAR",
  "MAX",
];

function centroidUV(
  cal: MapCalibration,
  points: { x: number; y: number }[],
): {
  u: number;
  v: number;
} | null {
  if (!points.length) {
    return null;
  }

  const cx =
    points.reduce(
      (sum, point) => sum + point.x,
      0,
    ) / points.length;

  const cy =
    points.reduce(
      (sum, point) => sum + point.y,
      0,
    ) / points.length;

  return worldToNormalized(
    cal,
    cx,
    cy,
  );
}

export function RadarWindow() {
  const [data, setData] =
    useState<MapResp | null>(null);

  const [base, setBase] =
    useState(
      "https://islepilot.eu",
    );

  const [live, setLive] =
    useState<LiveFrame | null>(null);

  const [rangeIdx, setRangeIdx] =
    useState(1);

  const [showLabels, setShowLabels] =
    useState(false);

  const [size, setSize] =
    useState({
      w: 320,
      h: 320,
    });

  const rootRef =
    useRef<HTMLDivElement>(null);

  /* SETTINGS */
  useEffect(() => {
    const apply = (
      settings: {
        apiBaseUrl?: string;
        radarRange?: number;
        radarLabels?: boolean;
      },
    ) => {
      if (settings.apiBaseUrl) {
        setBase(
          settings.apiBaseUrl.replace(
            /\/+$/,
            "",
          ),
        );
      }

      if (
        typeof settings.radarRange ===
        "number"
      ) {
        setRangeIdx(
          Math.max(
            0,
            Math.min(
              3,
              settings.radarRange,
            ),
          ),
        );
      }

      if (
        typeof settings.radarLabels ===
        "boolean"
      ) {
        setShowLabels(
          settings.radarLabels,
        );
      }
    };

    void window.isleOverlay
      .getSettings()
      .then(apply);

    const off =
      window.isleOverlay.onSettingsChanged(
        apply,
      );

    return off;
  }, []);

  /* MAP DATA */
  const refresh = useCallback(
    async () => {
      try {
        const response =
          await window.isleOverlay.apiGet<MapResp>(
            "/api/overlay/map",
          );

        setData(
          response as MapResp,
        );
      } catch {
        setData(null);
      }
    },
    [],
  );

  useEffect(() => {
    void refresh();

    const timer = setInterval(
      refresh,
      15000,
    );

    return () => {
      clearInterval(timer);
    };
  }, [refresh]);

  /* LIVE PLAYER DATA */
  useEffect(() => {
    const off =
      window.isleOverlay.onLive(
        setLive,
      );

    return off;
  }, []);

  /* WINDOW SIZE */
  useEffect(() => {
    const element =
      rootRef.current;

    if (!element) {
      return;
    }

    const resizeObserver =
      new ResizeObserver(() => {
        setSize({
          w: element.clientWidth,
          h: element.clientHeight,
        });
      });

    resizeObserver.observe(
      element,
    );

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const calibration =
    data?.calibration ?? null;

  /* PLAYER POSITION */
  const selfUV = useMemo(() => {
    if (
      !calibration ||
      !live?.position
    ) {
      return null;
    }

    return worldToNormalized(
      calibration,
      live.position.x,
      live.position.y,
    );
  }, [
    calibration,
    live,
  ]);

  /* PLAYER HEADING */
  const headingDeg = useMemo(() => {
    if (
      !calibration ||
      !live?.position ||
      live.position.yaw == null ||
      !selfUV
    ) {
      return null;
    }

    const radians =
      (live.position.yaw * Math.PI) /
      180;

    const ahead =
      worldToNormalized(
        calibration,
        live.position.x +
          1000 *
            Math.cos(radians),
        live.position.y +
          1000 *
            Math.sin(radians),
      );

    return (
      (Math.atan2(
        ahead.v - selfUV.v,
        ahead.u - selfUV.u,
      ) *
        180) /
      Math.PI
    );
  }, [
    calibration,
    live,
    selfUV,
  ]);

  /* RADAR MARKERS */
  const markers = useMemo<
    RadarMarker[]
  >(() => {
    if (!calibration) {
      return [];
    }

    const output: RadarMarker[] = [];

    /* POINTS OF INTEREST */
    for (
      const poi of data?.pois ?? []
    ) {
      const uv = centroidUV(
        calibration,
        poi.points,
      );

      if (!uv) {
        continue;
      }

      output.push({
        id: poi.id,
        u: uv.u,
        v: uv.v,
        label: poi.name,
        color: poi.color,
        kind: "place",
        shape: poi.shape,
        icon: poi.icon,
      });
    }

    /* OTHER PLAYERS */
    for (
      const player of data?.markers ?? []
    ) {
      if (player.self) {
        continue;
      }

      const uv =
        worldToNormalized(
          calibration,
          player.x,
          player.y,
        );

      output.push({
        id: player.steamId,
        u: uv.u,
        v: uv.v,
        label: player.label,
        color: "#7cf2a6",
        kind: "friend",
      });
    }

    return output;
  }, [
    calibration,
    data,
  ]);

  const layerBase =
    `${base}/maps/gateway-v0.21`;

  /*
   * Leave some breathing room around
   * the radar so it doesn't touch the
   * edge of the overlay window.
   */
  const diameter = Math.max(
    160,
    Math.min(
      size.w,
      size.h,
    ) - 16,
  );

  /* DRAGGING */
  const onDragStart =
    useCallback(
      (
        event: React.PointerEvent<HTMLDivElement>,
      ) => {
        if (event.button !== 0) {
          return;
        }

        event.preventDefault();

        const target =
          event.currentTarget;

        const pointerId =
          event.pointerId;

        const startMouseX =
          event.screenX;

        const startMouseY =
          event.screenY;

        void window.isleOverlay
          .radarGetBounds()
          .then((baseBounds) => {
            if (!baseBounds) {
              return;
            }

            try {
              target.setPointerCapture(
                pointerId,
              );
            } catch {}

            const onMove = (
              moveEvent: PointerEvent,
            ) => {
              void window.isleOverlay
                .radarSetBounds({
                  x:
                    baseBounds.x +
                    (moveEvent.screenX -
                      startMouseX),

                  y:
                    baseBounds.y +
                    (moveEvent.screenY -
                      startMouseY),

                  width:
                    baseBounds.width,

                  height:
                    baseBounds.height,
                });
            };

            const onUp = () => {
              try {
                target.releasePointerCapture(
                  pointerId,
                );
              } catch {}

              target.removeEventListener(
                "pointermove",
                onMove,
              );

              target.removeEventListener(
                "pointerup",
                onUp,
              );
            };

            target.addEventListener(
              "pointermove",
              onMove,
            );

            target.addEventListener(
              "pointerup",
              onUp,
            );
          });
      },
      [],
    );

  return (
    <div
      ref={rootRef}
      style={shell}
    >
      {/* HUD HEADER */}
      <div
        style={hudHeader}
        onPointerDown={onDragStart}
      >
        <div style={hudTitle}>
          <span style={hudAccent} />
          RADAR
        </div>

        <div style={hudSubtitle}>
          OBSIDIAN ISLE
        </div>
      </div>

      {/* RADAR */}
      <div
        onPointerDown={onDragStart}
        style={{
          cursor: "grab",
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <RadarView
          layerBase={layerBase}
          diameter={diameter}
          selfU={
            selfUV?.u ?? null
          }
          selfV={
            selfUV?.v ?? null
          }
          headingDeg={
            headingDeg
          }
          rangeUV={
            RANGE_UV[
              Math.max(
                0,
                Math.min(
                  3,
                  rangeIdx,
                ),
              )
            ]
          }
          rangeLabel={
            RANGE_LABEL[
              Math.max(
                0,
                Math.min(
                  3,
                  rangeIdx,
                ),
              )
            ]
          }
          markers={markers}
          showLabels={
            showLabels
          }
        />
      </div>

      {/* HUD FOOTER */}
      <div
        style={hudFooter}
        onPointerDown={onDragStart}
      >
        <span>
          TRACKING SYSTEM
        </span>

        <span>
          {live?.position
            ? "POSITION LOCKED"
            : "SEARCHING"}
        </span>
      </div>
    </div>
  );
}

const shell: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  background: "transparent",
  color: "#dce7df",
  pointerEvents: "none",
  userSelect: "none",
};

const hudHeader: React.CSSProperties = {
  width: "min(92%, 520px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "3px 8px",
  cursor: "grab",
  pointerEvents: "auto",
  fontFamily: "var(--mono)",
};

const hudTitle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: 1.5,
  color: "#dce7df",
};

const hudAccent: React.CSSProperties = {
  width: 5,
  height: 5,
  borderRadius: "50%",
  background: "#7cf2a6",
  boxShadow:
    "0 0 7px rgba(124,242,166,0.75)",
};

const hudSubtitle: React.CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: 8,
  fontWeight: 650,
  letterSpacing: 1,
  color: "rgba(220,231,223,0.42)",
};

const hudFooter: React.CSSProperties = {
  width: "min(92%, 520px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "2px 8px",
  cursor: "grab",
  pointerEvents: "auto",
  fontFamily: "var(--mono)",
  fontSize: 7,
  fontWeight: 650,
  letterSpacing: 0.8,
  color: "rgba(220,231,223,0.35)",
};