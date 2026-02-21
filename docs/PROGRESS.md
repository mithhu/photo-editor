# Photo Editor — Progress

> Manually updated when completing features. All contributors: update this file.

---

## Summary

### Project Setup
- [x] Vite + React project (pnpm)
- [x] Tailwind CSS v4 with @tailwindcss/postcss
- [x] Code style guide (`docs/CODE_STYLE.md`) and Cursor rules

### Photo Editor MVP (v0.1)
- [x] Image upload — drag & drop, file picker, loading states
- [x] Adjustments — brightness, contrast, saturation, exposure, highlights, shadows
- [x] Crop — aspect ratios (Original, 1:1, 4:5, 16:9, 9:16, 3:4, 2:3, custom)
- [x] Custom crop — numeric x, y, w, h inputs
- [x] Rotate — ±90°
- [x] Flip — horizontal & vertical
- [x] Filter presets — 18 total (Clarendon, Juno, Teal & Orange, VHS, Dreamy, Y2K, etc.)
- [x] Text overlay — add text, edit content, color picker, delete
- [x] Zoom & pan — scroll to zoom, drag to pan
- [x] Export — download as PNG
- [x] Undo / Redo — history stack, ⌘Z / ⌘⇧Z
- [x] Per-slider reset — ↺ button when value differs from default
- [x] Keyboard shortcuts — B (brush), E (eraser), Escape (exit), [ / ] (brush size ±5)
- [x] Modular structure — components, hooks, constants, utils

### Sharing (v0.2)
- [x] Share modal — native OS share sheet (Web Share API), copy to clipboard
- [x] Platform share buttons — Twitter/X, Facebook, WhatsApp, Instagram

### Advanced Adjustments (v0.3)
- [x] Warmth / Tint — pixel-level color temperature and green-magenta shift
- [x] Vibrance — selective saturation that boosts muted colors
- [x] Clarity — mid-tone contrast enhancement via luminance weighting
- [x] Dehaze — contrast boost to cut through haze/fog
- [x] Vignette — radial gradient edge darkening

### Professional Tools (v0.4)
- [x] Brush tool — draw with adjustable size, color, and opacity
- [x] Eraser — destination-out compositing
- [x] Shapes overlay — circle, square, triangle, star, heart, arrows
- [x] Visual crop handles — 8 drag points, rule-of-thirds grid, aspect ratio enforcement
- [x] Before/after comparison — hold "Compare" button to see original
- [x] History panel — visual edit step list in sidebar

### Export & Quality (v0.5)
- [x] Export dialog — format selection (PNG/JPEG/WEBP)
- [x] Quality slider for JPEG/WEBP exports
- [x] Resize on export with aspect ratio lock
- [x] Preset export formats — IG Square, IG Story, IG Post, FB Cover, YT Thumb, Twitter
- [x] Watermark on export — text, position (bottom-right/left, center), opacity
- [x] Estimated file size preview
- [x] Error handling — file type, size limits (20MB/8192px), corrupted file detection

### Smart Features & Persistence (v0.6)
- [x] Auto-enhance — one-click histogram analysis to auto-adjust brightness, contrast, exposure, saturation
- [x] Project save/load — auto-save to localStorage every 10s, save on unload, restore prompt on upload screen

### Responsive & Mobile (v0.7)
- [x] Responsive header — mobile overflow "⋯" menu for secondary actions, undo/redo always visible
- [x] Mobile tab navigation — sidebar sections organized into swipeable tabs (Adjust, Color, Crop, Draw, Layers, Filters)
- [x] Touch support — single-touch drawing/pan, two-finger pinch-to-zoom on canvas
- [x] Scroll prevention — `touch-none` on canvas to prevent page scroll during editing
- [x] Click-outside dismissal — mobile header menu closes on outside tap
