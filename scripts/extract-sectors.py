#!/usr/bin/env python3
"""Split the composite Gaia Project map photo into 10 sector tiles."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SRC = Path("/home/ubuntu/.cursor/projects/workspace/assets/3936bb93-ebaa-4116-bcd1-e7c2f804a351.jpg")
OUT = Path(__file__).resolve().parents[1] / "client" / "public" / "sectors"


def hex_points(cx: float, cy: float, radius: float) -> list[tuple[float, float]]:
    """Pointy-top hexagon vertices."""
    pts = []
    for i in range(6):
        angle = math.radians(60 * i - 30)
        pts.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    return pts


def crop_hex(im: Image.Image, cx: float, cy: float, radius: float) -> Image.Image:
    size = int(math.ceil(radius * 2) + 8)
    left = int(round(cx - size / 2))
    top = int(round(cy - size / 2))
    box = (left, top, left + size, top + size)
    tile = im.crop(box)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    local = hex_points(size / 2, size / 2, radius - 1)
    draw.polygon(local, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(0.6))
    rgba = tile.convert("RGBA")
    rgba.putalpha(mask)
    return rgba


def sector_centers(width: int, height: int, radius: float) -> dict[str, tuple[float, float]]:
    """
    Official 4-player shape (pointy-top sectors):

          10   01   05
        09   02   03   06
          08   04   07
    """
    horiz = math.sqrt(3) * radius
    vert = 1.5 * radius
    # Nudge so the photographed cluster sits in frame.
    ox = width * 0.50
    oy = height * 0.515
    layout = {
        "10": (-horiz, -vert),
        "01": (0.0, -vert),
        "05": (horiz, -vert),
        "09": (-1.5 * horiz, 0.0),
        "02": (-0.5 * horiz, 0.0),
        "03": (0.5 * horiz, 0.0),
        "06": (1.5 * horiz, 0.0),
        "08": (-horiz, vert),
        "04": (0.0, vert),
        "07": (horiz, vert),
    }
    return {name: (ox + dx, oy + dy) for name, (dx, dy) in layout.items()}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    im = Image.open(SRC).convert("RGB")
    width, height = im.size
    radius = min(width, height) * 0.168
    centers = sector_centers(width, height, radius)

    preview = im.copy()
    overlay = ImageDraw.Draw(preview)
    for name, (cx, cy) in centers.items():
        overlay.polygon(hex_points(cx, cy, radius), outline=(255, 255, 255))
        overlay.text((cx - 8, cy - 6), name, fill=(255, 255, 255))
        tile = crop_hex(im, cx, cy, radius)
        tile.save(OUT / f"sector-{name}.png")
        print(f"wrote {OUT / f'sector-{name}.png'} center=({cx:.1f},{cy:.1f})")

    preview.save(OUT / "_preview-cuts.png")
    print(f"preview {OUT / '_preview-cuts.png'} size={im.size} radius={radius:.1f}")


if __name__ == "__main__":
    main()
