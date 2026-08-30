import { sectorArt } from "../../../shared/art.ts";
import { FACTION_INFO, PLANET_COLORS, type FactionId, type PlanetType } from "../../../shared/factions.ts";
import { BUILDING_LABELS } from "../../../shared/tiles.ts";
import type { GameView, HexView } from "../../../shared/types.ts";

const SIZE = 36;

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

function playerColor(view: GameView, index: number | undefined) {
  if (index === undefined) return "#fff";
  const faction = view.players[index]?.faction as FactionId | null;
  return (faction && FACTION_INFO[faction]?.color) || ["#3d8bfd", "#ff8a3d", "#3dcf7a", "#e5484d"][index] || "#fff";
}

function StructureMark({
  x,
  y,
  building,
  color,
}: {
  x: number;
  y: number;
  building: string;
  color: string;
}) {
  const label = BUILDING_LABELS[building] ?? building;
  if (building === "m") {
    return (
      <g>
        <title>{label}</title>
        <rect x={x - 8} y={y - 5} width="16" height="12" rx="2" fill={color} stroke="#fff" strokeWidth="1.6" />
        <polygon points={`${x - 9},${y - 5} ${x},${y - 13} ${x + 9},${y - 5}`} fill={color} stroke="#fff" strokeWidth="1.4" />
      </g>
    );
  }
  if (building === "ts") {
    return (
      <g>
        <title>{label}</title>
        <rect x={x - 10} y={y - 10} width="20" height="20" rx="3" fill={color} stroke="#fff" strokeWidth="1.8" />
        <rect x={x - 4} y={y - 2} width="8" height="12" fill="#0b1220" />
      </g>
    );
  }
  if (building === "lab") {
    return (
      <g>
        <title>{label}</title>
        <polygon points={`${x},${y - 13} ${x + 12},${y} ${x},${y + 13} ${x - 12},${y}`} fill={color} stroke="#fff" strokeWidth="1.8" />
      </g>
    );
  }
  if (building === "PI") {
    return (
      <g>
        <title>{label}</title>
        <polygon points={hexPath(x, y, 14)} fill={color} stroke="#fff" strokeWidth="2" />
        <circle cx={x} cy={y} r="4" fill="#fff" />
      </g>
    );
  }
  if (building === "ac1" || building === "ac2") {
    return (
      <g>
        <title>{label}</title>
        <polygon
          points={`${x},${y - 14} ${x + 4},${y - 4} ${x + 14},${y - 4} ${x + 6},${y + 3} ${x + 9},${y + 13} ${x},${y + 7} ${x - 9},${y + 13} ${x - 6},${y + 3} ${x - 14},${y - 4} ${x - 4},${y - 4}`}
          fill={color}
          stroke="#fff"
          strokeWidth="1.4"
        />
      </g>
    );
  }
  if (building === "gf") {
    return (
      <g>
        <title>{label}</title>
        <circle cx={x} cy={y} r="10" fill="#9b51e0" stroke="#fff" strokeWidth="1.6" />
        <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="700">
          G
        </text>
      </g>
    );
  }
  return (
    <g>
      <title>{label}</title>
      <circle cx={x} cy={y} r="9" fill={color} stroke="#fff" strokeWidth="1.6" />
      <text x={x} y={y + 3} textAnchor="middle" fontSize="8" fill="#071018" fontWeight="700">
        {building}
      </text>
    </g>
  );
}

function PlanetOrb({ x, y, planet }: { x: number; y: number; planet: PlanetType }) {
  const color = PLANET_COLORS[planet];
  const r = planet === "transdim" ? 10 : 13;
  return (
    <g>
      <defs>
        <radialGradient id={`p-${planet}-${x}-${y}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="45%" stopColor={color} />
          <stop offset="100%" stopColor="#071018" />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={r} fill={`url(#p-${planet}-${x}-${y})`} stroke="#071018" strokeWidth="1.1" />
    </g>
  );
}

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
  const minX = Math.min(...pts.map((p) => p.x)) - 56;
  const minY = Math.min(...pts.map((p) => p.y)) - 56;
  const maxX = Math.max(...pts.map((p) => p.x)) + 56;
  const maxY = Math.max(...pts.map((p) => p.y)) + 56;

  return (
    <div className="map-wrap">
      <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} width="100%" height="720">
        {(view.sectors ?? []).map((sector) => {
          const { x, y } = pixel(sector.q, sector.r);
          const radius = SIZE * 2.58;
          const width = radius * Math.sqrt(3);
          const height = radius * 2;
          return (
            <image
              key={`${sector.id}-${sector.q}-${sector.r}`}
              href={sectorArt(sector.id)}
              x={x - width / 2}
              y={y - height / 2}
              width={width}
              height={height}
              transform={`rotate(${sector.rotation * 60} ${x} ${y})`}
              opacity="0.92"
            />
          );
        })}
        {view.map.map((hex) => {
          const { x, y } = pixel(hex.q, hex.r);
          const planet = (hex.planet || "empty") as PlanetType;
          const active = highlighted.has(hex.id) || highlighted.has(hex.coord);
          return (
            <g key={hex.id} onClick={() => onHex(hex)} style={{ cursor: "pointer" }}>
              <polygon
                points={hexPath(x, y)}
                fill={active ? "#16352899" : "#0b122033"}
                stroke={hex.federations.length ? "#f4c15d" : active ? "#3dcf7a" : "#8fb4ff55"}
                strokeWidth={hex.federations.length ? 2.6 : 1.05}
              />
              {planet !== "empty" ? <PlanetOrb x={x} y={y} planet={planet} /> : null}
              {hex.building && hex.player !== undefined ? (
                <StructureMark x={x} y={y} building={hex.building} color={playerColor(view, hex.player)} />
              ) : null}
              {hex.additionalMine !== undefined ? (
                <circle cx={x + 11} cy={y - 11} r="5" fill={playerColor(view, hex.additionalMine)} stroke="#fff" />
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="map-legend">
        <span>
          <i className="leg-mine" /> Mine
        </span>
        <span>
          <i className="leg-ts" /> Trading station
        </span>
        <span>
          <i className="leg-lab" /> Lab
        </span>
        <span>
          <i className="leg-pi" /> Planetary institute
        </span>
        <span>
          <i className="leg-ac" /> Academy
        </span>
        <span>
          <i className="leg-gf" /> Gaiaformer
        </span>
      </div>
    </div>
  );
}
