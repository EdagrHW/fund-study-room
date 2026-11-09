"""Generate dependency-free PNG icons for the installable study app."""
from pathlib import Path
import struct
import sys
import zlib

BACKGROUND = (20, 45, 43, 255)
PAPER = (247, 240, 223, 255)
GOLD = (217, 183, 117, 255)


def inside_polygon(x, y, points):
    inside = False
    previous = points[-1]
    for current in points:
        x1, y1 = previous
        x2, y2 = current
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
        previous = current
    return inside


def png_chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def generate(size, destination):
    left_page = [(0.21, 0.28), (0.46, 0.35), (0.46, 0.73), (0.21, 0.65)]
    right_page = [(0.54, 0.35), (0.79, 0.28), (0.79, 0.65), (0.54, 0.73)]
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            nx, ny = x / size, y / size
            color = BACKGROUND
            if (nx - 0.5) ** 2 + (ny - 0.5) ** 2 < 0.32 ** 2:
                color = (25, 57, 51, 255)
            if inside_polygon(nx, ny, left_page) or inside_polygon(nx, ny, right_page):
                color = PAPER
            if 0.485 < nx < 0.515 and 0.34 < ny < 0.74:
                color = GOLD
            row.extend(color)
        rows.append(bytes(row))
    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    content = b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", header)
    content += png_chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + png_chunk(b"IEND", b"")
    Path(destination).write_bytes(content)


if __name__ == "__main__":
    output = Path(sys.argv[1])
    output.mkdir(parents=True, exist_ok=True)
    for icon_size in (192, 512):
        target = output / f"icon-{icon_size}.png"
        generate(icon_size, target)
        print(f"Generated {target}")
