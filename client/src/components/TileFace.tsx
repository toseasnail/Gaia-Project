import { tileArt } from "../../../shared/art.ts";
import { tileText } from "../../../shared/tiles.ts";

export function TileFace({
  kind,
  id,
  caption,
  kicker,
  current,
  held,
  taken,
  onClick,
}: {
  kind: "booster" | "round" | "final" | "tech" | "fed" | "action";
  id: string;
  caption?: string;
  kicker?: string;
  current?: boolean;
  held?: boolean;
  taken?: boolean;
  onClick?: () => void;
}) {
  const text = caption ?? tileText(kind === "round" ? "round" : kind === "final" ? "final" : kind, id);
  const className = `tile-face ${kind} ${current ? "current" : ""} ${held ? "held" : ""} ${taken ? "used" : ""}`;
  const body = (
    <>
      <img src={tileArt(kind, id)} alt={text} />
      <div className="tile-caption">
        {kicker ? <div className="tile-kicker">{kicker}</div> : null}
        <div>{text}</div>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick} disabled={taken}>
        {body}
      </button>
    );
  }
  return <article className={className}>{body}</article>;
}
