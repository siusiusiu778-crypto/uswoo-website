# USWOO Website

Static export of the USWOO Claude Design project, ready to deploy on Vercel.

## Structure

- `USWOO Home.dc.html`, `USWOO Services.dc.html`, `USWOO Partners.dc.html`, `USWOO City Guides.dc.html` — the four pages. Each is a self-contained HTML document that loads React/ReactDOM from a CDN at runtime and renders via `support.js` (the Claude Design canvas runtime).
- `support.js`, `image-slot.js` — runtime scripts required by every page (parses the `<x-dc>` template, mounts React, handles the `<image-slot>` custom element).
- `.image-slots.state.json` — sidecar file holding the images that were dropped into `<image-slot>` placeholders in the design tool (stored as base64 data URIs). Must stay a sibling of the `.dc.html` files.
- `assets/uswoo-hero-video.mp4` — the Home page hero footage, with `assets/uswoo-hero-poster.jpg` as its poster frame.
  The generator's sparkle watermark was painted out of the bottom right with ffmpeg's `removelogo`, using the shape mask in
  `tools/hero-watermark-mask.pgm`: `ffmpeg -i in.mp4 -vf removelogo=filename=tools/hero-watermark-mask.pgm -an -c:v libx264 -preset slower -crf 20 -pix_fmt yuv420p -movflags +faststart out.mp4`.
  The audio track was silent and unused (the element is `muted`), so it is dropped.
- `assets/uswoo-hero-city.webp` — the skyline matted out of that footage (transparent above the roofline). It is laid back over the video so the giant `USWOO` wordmark in the hero can sit between the sky and the buildings. It is registered to the footage by `.hero-frame`, which reproduces the video's `object-fit:cover` box, so both layers stay aligned at any viewport size. Regenerate it if the hero footage ever changes.
- `assets/uswoo-hero.jpg`, `assets/uswoo-hero-nyc.jpg` — earlier hero stills, no longer referenced.
- `vercel.json` — routes `/` to the Home page and adds friendly aliases (`/services`, `/partners`, `/city-guides`, `/home`); the original `.dc.html` links between pages keep working unchanged.

No build step — this is plain static HTML/JS. Vercel will deploy it as-is.

## Deploy

```bash
npx vercel --prod
```

Or connect the folder as a Git repo to Vercel and import it — no framework preset or build command needed (leave both blank / "Other").

## Notes

- Image drag-and-drop editing (from the design tool) only works inside the Claude Design canvas; in production the site just reads the images already saved in `.image-slots.state.json`.
- Leaflet (city guide maps) and Google Fonts are loaded from public CDNs at runtime — no local dependency needed.
