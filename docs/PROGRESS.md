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
- [x] Visual crop handles — 8 drag points, rule-of-thirds grid, aspect ratio enforcement
- [x] Rotate — ±90°
- [x] Flip — horizontal & vertical
- [x] Filter presets — 18 total (Clarendon, Juno, Teal & Orange, VHS, Dreamy, Y2K, etc.)
- [x] Text overlay — add text, edit content, color picker, delete; font family, size (12–120px), bold/italic, shadow, opacity, position (x/y), rotation (−180°–180°); collapsible per-item controls
- [x] Zoom & pan — scroll to zoom, drag to pan, pinch-to-zoom on mobile
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
- [x] Estimated file size preview
- [x] Error handling — file type, size limits (20MB/8192px), corrupted file detection

### Color Grading (v0.6)
- [x] HSL sliders — per-color hue/saturation/luminance for 8 color ranges
- [x] RGB curves — interactive canvas with draggable control points
- [x] Channel selector (RGB, Red, Green, Blue) with smooth-step interpolation

### Smart Features (v0.7)
- [x] Auto-enhance — one-click histogram analysis for brightness/contrast/exposure/saturation
- [x] Project save — auto-save to localStorage every 10s, restore on reload

### Layer Management (v0.8)
- [x] Layer panel — unified view of text and shape layers
- [x] Layer visibility toggle, reorder (up/down), delete
- [x] layerVisibility state integrated into canvas rendering

### Mobile & Export (v0.9)
- [x] Responsive header — collapse to overflow menu on mobile
- [x] Mobile tab navigation — 7 tabs (Adjust, Color, Crop, Draw, Layers, Templates, Filters)
- [x] Touch support — single-finger draw/pan, two-finger pinch zoom
- [x] Watermark on export — text, position, opacity
- [x] Preset export formats — IG Square/Story/Post, FB Cover, YT Thumb, Twitter

### Local Adjustments (v1.1)
- [x] Radial gradient mask — center, radiusX/Y, feather; brightness/contrast/saturation; invert
- [x] Linear gradient mask — start/end points; brightness/contrast/saturation; invert
- [x] Mask panel in Adjust tab — add/delete masks, up to 3 for performance

### AI Features (v1.0)
- [x] Smart auto-crop — COCO-SSD object detection to find subjects and auto-crop with 15% padding
- [x] Style transfer — Magenta arbitrary style transfer with 4 built-in presets + custom upload
- [x] Style strength slider (10–100%) for blending original and stylized output

### Templates & Social (v1.2)
- [x] Collage builder — 7 layouts (2-grid, 3-horizontal, 3-vertical, 4-grid, 6-grid, 1+2, 2+1), gap/radius/bg controls, 4 output sizes, canvas compositing with cover-fill and rounded corners

### Templates & Social (v1.2)
- [x] Template panel — sidebar with pre-designed layouts (Clean Story, Bold Story, Minimal Post, Vintage Post, FB Cover, YT Thumbnail, Cinematic, Moody)
- [x] Category filter — Stories, Posts, Social, Styles
