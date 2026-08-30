#!/usr/bin/env python3
"""Resize generated artwork and slice tile sheets into individual faces."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

SRC = Path("/opt/cursor/artifacts/assets")
OUT = Path(__file__).resolve().parents[1] / "client" / "public" / "art"
TILES = OUT / "tiles"
FACTIONS = OUT / "factions"
BOARDS = OUT / "boards"


def ensure() -> None:
    for path in (TILES, FACTIONS, BOARDS):
        path.mkdir(parents=True, exist_ok=True)


def save_jpeg(im: Image.Image, dest: Path, size: tuple[int, int] | None = None, quality: int = 82) -> None:
    work = im.convert("RGB")
    if size:
        work = ImageOps.fit(work, size, Image.Resampling.LANCZOS)
    work.save(dest, "JPEG", quality=quality, optimize=True)


def save_png(im: Image.Image, dest: Path, max_side: int = 280) -> None:
    work = im.convert("RGBA")
    w, h = work.size
    scale = min(1.0, max_side / max(w, h))
    if scale < 1:
        work = work.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)
    work.save(dest, "PNG", optimize=True)


def boxes_from_grid(im: Image.Image, rows: int, cols: int, inset: float = 0.04) -> list[tuple[int, int, int, int]]:
    w, h = im.size
    cw, ch = w / cols, h / rows
    out = []
    for r in range(rows):
        for c in range(cols):
            x0 = int(c * cw + cw * inset)
            y0 = int(r * ch + ch * inset)
            x1 = int((c + 1) * cw - cw * inset)
            y1 = int((r + 1) * ch - ch * inset)
            out.append((x0, y0, x1, y1))
    return out


def detect_boxes(im: Image.Image, expected: int, min_area: int = 8000) -> list[tuple[int, int, int, int]]:
    gray = ImageOps.grayscale(im).filter(ImageFilter.GaussianBlur(1.2))
    w, h = gray.size
    pix = gray.load()
    visited = [[False] * w for _ in range(h)]
    boxes: list[tuple[int, int, int, int, int]] = []

    def brightness(x: int, y: int) -> int:
        return pix[x, y]

    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if visited[y][x] or brightness(x, y) < 28:
                continue
            stack = [(x, y)]
            visited[y][x] = True
            minx = maxx = x
            miny = maxy = y
            area = 0
            while stack:
                cx, cy = stack.pop()
                area += 1
                if cx < minx:
                    minx = cx
                if cx > maxx:
                    maxx = cx
                if cy < miny:
                    miny = cy
                if cy > maxy:
                    maxy = cy
                for nx, ny in ((cx + 2, cy), (cx - 2, cy), (cx, cy + 2), (cx, cy - 2)):
                    if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and brightness(nx, ny) >= 28:
                        visited[ny][nx] = True
                        stack.append((nx, ny))
            if area >= min_area // 4:
                pad = 4
                boxes.append((max(0, minx - pad), max(0, miny - pad), min(w, maxx + pad), min(h, maxy + pad), area))

    boxes.sort(key=lambda b: (round(b[1] / 40), b[0]))
    # Merge overlapping detections
    merged: list[tuple[int, int, int, int]] = []
    for x0, y0, x1, y1, _ in boxes:
        hit = False
        for i, (mx0, my0, mx1, my1) in enumerate(merged):
            if x0 < mx1 and x1 > mx0 and y0 < my1 and y1 > my0:
                merged[i] = (min(mx0, x0), min(my0, y0), max(mx1, x1), max(my1, y1))
                hit = True
                break
        if not hit:
            merged.append((x0, y0, x1, y1))
    merged.sort(key=lambda b: (round(b[1] / 50), b[0]))
    if len(merged) == expected:
        return merged
    return []


def slice_named(sheet: str, names: list[str], rows: int, cols: int, max_side: int = 260) -> None:
    im = Image.open(SRC / sheet)
    found = detect_boxes(im, len(names))
    boxes = found if found else boxes_from_grid(im, rows, cols)[: len(names)]
    if len(boxes) < len(names):
        raise SystemExit(f"{sheet}: expected {len(names)} tiles, got {len(boxes)}")
    for name, box in zip(names, boxes):
        save_png(im.crop(box), TILES / f"{name}.png", max_side=max_side)
        print(f"  {name} {box}")


def main() -> None:
    ensure()

    for path in SRC.glob("faction-*.png"):
        dest = FACTIONS / f"{path.stem.replace('faction-', '')}.jpg"
        save_jpeg(Image.open(path), dest, (420, 420), quality=84)
        print("faction", dest.name)

    save_jpeg(Image.open(SRC / "research-board.png"), BOARDS / "research-board.jpg", (1600, 900), quality=85)
    console = Path(__file__).resolve().parents[1] / "client" / "public" / "art" / "console.jpg"
    if console.exists():
        save_jpeg(Image.open(console), BOARDS / "scoring-board.jpg", (1100, 1100), quality=84)
    print("boards written")

    slice_named(
        "scoring-tiles-sheet.png",
        [f"score{i}" for i in range(1, 11)],
        2,
        5,
        240,
    )
    slice_named(
        "boosters-sheet.png",
        [f"booster{i}" for i in range(1, 11)],
        1,
        10,
        220,
    )
    slice_named(
        "federations-sheet.png",
        ["fed1", "fed2", "fed3", "fed4", "fed5", "fed6", "gleens"],
        2,
        4,
        220,
    )
    slice_named(
        "final-scoring-sheet.png",
        ["final-structure", "final-structureFed", "final-planetType", "final-gaia", "final-sector", "final-satellite"],
        2,
        3,
        280,
    )
    slice_named(
        "tech-tiles-sheet.png",
        [f"tech{i}" for i in range(1, 10)] + [f"advtech{i}" for i in range(1, 16)],
        3,
        9,
        200,
    )
    slice_named(
        "power-actions-sheet.png",
        ["power1", "power2", "power3", "power4", "power5", "power6", "power7", "qic1", "qic2", "qic3"],
        3,
        4,
        220,
    )
    print("done", TILES)


if __name__ == "__main__":
    main()
