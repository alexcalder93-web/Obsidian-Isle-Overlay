import { useCallback, useEffect, useMemo, useState } from "react";

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

export function RadarPanel({
  live,
  base,
  rangeIdx,
  showLabels,
  diameter,
}: {
  live: LiveFrame | null;
  base: string;
  rangeIdx: number;
  showLabels: boolean;
  diameter: number;
}) {
  const [data, setData] =
    useState<MapResp | null>(null);

  const refresh = useCallback(
    async () => {
      try {
        const response =
          await window.isleOverlay.apiGet<MapResp>(
            "/api/overlay/map",
          );

        setData(response as MapResp);
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

  const calibration =
    data?.calibration ?? null;

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

  const markers = useMemo<
    RadarMarker[]
  >(() => {
    if (!calibration) {
      return [];
    }

    const output: RadarMarker[] = [];

    /* POIs */
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

  return (
    <div
      className="radarPanel dragHandle"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: diameter,
        height: diameter,
      }}
    >
      <RadarView
        layerBase={`${base}/maps/gateway-v0.21`}
        diameter={diameter}
        selfU={selfUV?.u ?? null}
        selfV={selfUV?.v ?? null}
        headingDeg={headingDeg}
        rangeUV={
          RANGE_UV[
            Math.max(
              0,
              Math.min(
                RANGE_UV.length - 1,
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
                RANGE_LABEL.length - 1,
                rangeIdx,
              ),
            )
          ]
        }
        markers={markers}
        showLabels={showLabels}
      />
    </div>
  );
}