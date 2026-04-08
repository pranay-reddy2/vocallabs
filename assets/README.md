# Assets

Place the following files here before building:

- `icon.png` — 256×256 app icon (PNG)
- `icon.ico` — Windows icon file (for installer)
- `tray-icon.png` — 16×16 or 32×32 tray icon (PNG)

You can convert a PNG to ICO using https://convertico.com or:

```bash
# Using ImageMagick
magick icon.png -resize 256x256 icon.ico
```
