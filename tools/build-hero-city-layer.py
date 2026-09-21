#!/usr/bin/env python3
"""Rebuild the Home hero's skyline layer from a still of the hero footage.

The hero stacks three layers: the video, the giant USWOO wordmark, and this
cut-out of the skyline laid back on top, so the word reads as if it were
hanging behind the city. The footage is locked off (the buildings do not move
between frames), so a single matted still registers against every frame.

    # extract a frame first -- qlmanage is enough, ffmpeg works too
    qlmanage -t -s 1280 -o build assets/uswoo-hero-video.mp4
    python3 tools/build-hero-city-layer.py build/uswoo-hero-video.mp4.png

Writes assets/uswoo-hero-city.webp and assets/uswoo-hero-poster.jpg.
Needs Pillow; pass --debug to also drop a frame with the detected roofline
drawn on it, which is the thing to eyeball if the footage ever changes.
"""
import argparse
import os
from PIL import Image, ImageDraw, ImageFilter

# the window the roofline can fall in, in source pixels
Y0, Y1 = 140, 470
RUN = 3               # consecutive city rows needed to call it a roofline
TOP, BOT = 170, 470   # the band the overlay covers
FADE = 436            # alpha ramps to zero from here down to BOT

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def is_city(px, x, y):
    """Backlit buildings read dark and neutral; the sunset sky stays bright and
    strongly warm, including its darker cloud banks."""
    r, g, b = px[x, y]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    return lum < 108 or (lum < 135 and (r - b) < 18)


def find_roofline(src):
    """First solid city pixel per column, scanning down from the sky. Gaps
    between towers stay open to the sky above, so they survive as sky."""
    w, _ = src.size
    px = src.load()
    roof = []
    for x in range(w):
        hit, run = Y1, 0
        for y in range(Y0, Y1):
            if is_city(px, x, y):
                run += 1
                if run >= RUN:
                    hit = y - RUN + 1
                    break
            else:
                run = 0
        roof.append(hit)
    return roof


def build_mask(roof, w):
    mask = Image.new("L", (w, BOT - TOP), 0)
    mp = mask.load()
    for x in range(w):
        for y in range(max(roof[x], TOP), BOT):
            mp[x, y - TOP] = 255
    mask = mask.filter(ImageFilter.GaussianBlur(0.6))  # keep the roofline off the pixel grid
    mp = mask.load()
    for y in range(FADE, BOT):
        k = (BOT - y) / (BOT - FADE)
        for x in range(w):
            mp[x, y - TOP] = int(mp[x, y - TOP] * k)
    return mask


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("frame", help="a still extracted from assets/uswoo-hero-video.mp4")
    ap.add_argument("--debug", action="store_true", help="also write build/debug-roofline.png")
    args = ap.parse_args()

    src = Image.open(args.frame).convert("RGB")
    w, h = src.size
    if (w, h) != (1280, 720):
        raise SystemExit("expected a 1280x720 frame, got %dx%d" % (w, h))

    roof = find_roofline(src)
    city = src.crop((0, TOP, w, BOT)).convert("RGBA")
    city.putalpha(build_mask(roof, w))

    out = os.path.join(ROOT, "assets", "uswoo-hero-city.webp")
    city.save(out, "WEBP", quality=88, method=6)
    poster = os.path.join(ROOT, "assets", "uswoo-hero-poster.jpg")
    src.save(poster, "JPEG", quality=82, optimize=True, progressive=True)
    print("wrote %s (%d KB)" % (out, os.path.getsize(out) // 1024))
    print("wrote %s (%d KB)" % (poster, os.path.getsize(poster) // 1024))

    if args.debug:
        dbg = src.copy()
        d = ImageDraw.Draw(dbg)
        for x in range(w):
            d.point((x, roof[x]), fill=(255, 0, 255))
            d.point((x, roof[x] + 1), fill=(255, 0, 255))
        path = os.path.join(ROOT, "build", "debug-roofline.png")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        dbg.save(path)
        print("wrote", path)


if __name__ == "__main__":
    main()
