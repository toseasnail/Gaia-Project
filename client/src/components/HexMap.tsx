import { PLANET_COLORS, type PlanetType } from "../../../shared/factions.ts";
import type { GameView, HexView } from "../../../shared/types.ts";

const SIZE = 26;

function pixel(q: number, r: number) {
  return {
    x: SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r),
    y: SIZE * (1.5 * r),
  };
}

function hexPath(x: number, y: number, size = SIZE - 1.2) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = ((60 * i - 30) * Math.PI) / 180;
    pts.push(`${x + size * Math.cos(a)},${y + size * Math.sin(a)}`);
  }
  return pts.join(" ");
}

const PLAYER_FILL = ["#3d8bfd", "#ff8a3d", "#3dcf7a", "#e5484d"];

export function HexMap({
  view,
  highlighted,
  onHex,
}: {
  view: GameView;
  highlighted: Set<string>;
  onHex: (hex: HexView) => void;
}) {
  if (!view.map.length) {
    return <div className="map-wrap" />;
  }
  const pts = view.map.map((hex) => pixel(hex.q, hex.r));
  const minX = Math.min(...pts.map((p) => p.x)) - 40;
  const minY = Math.min(...pts.map((p) => p.y)) - 40;
  const maxX = Math.max(...pts.map((p) => p.x)) + 40;
  const maxY = Math.max(...pts.map((p) => p.y)) + 40;

  return (
    <div className="map-wrap">
      <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} width="100%" height="620">
        {view.map.map((hex) => {
          const { x, y } = pixel(hex.q, hex.r);
          const planet = (hex.planet || "empty") as PlanetType;
          const active = highlighted.has(hex.id) || highlighted.has(hex.coord);
          return (
            <g key={hex.id} onClick={() => onHex(hex)} style={{ cursor: "pointer" }}>
              <polygon
                points={hexPath(x, y)}
                fill={active ? "#1d3a2a" : "#0b1220"}
                stroke={active ? "#3dcf7a" : "#2a3854"}
                strokeWidth={hex.federations.length ? 2.4 : 1}
              />
              {planet !== "empty" ? (
                <circle
                  cx={x}
                  cy={y}
                  r={planet === "transdim" ? 8 : 10}
                  fill={PLANET_COLORS[planet]}
                  stroke="#071018"
                  strokeWidth="1"
                />
              ) : null}
              {hex.building && hex.player !== undefined ? (
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="IBM Plex Mono"
                  fill={PLAYER_FILL[hex.player] ?? "#fff"}
                >
                  {hex.building}
                </text>
              ) : null}
              <text className="hex-label" x={x} y={y + SIZE - 6} textAnchor="middle">
                {hex.sector.replace(/[AB]/, "")}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
