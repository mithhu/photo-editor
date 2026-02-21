# PhotosAI — Progress

> Manually updated when completing features. All contributors: update this file.

---

## Summary

### Project Setup
- [x] Vite + React project (pnpm)
- [x] Tailwind CSS v4 with @tailwindcss/postcss
- [x] Code style guide (`docs/CODE_STYLE.md`) and Cursor rules

### PhotosAI MVP (v0.1)
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
- [x] Before/after comparison slider — draggable split-screen overlay with Original/Edited labels
- [x] History panel — visual edit step list in sidebar
- [x] Filter thumbnail previews — 48x48 preview of each filter on the actual image (Instagram-style)
- [x] Keyboard shortcuts overlay — press ? for cheat sheet, grouped by category
- [x] Sticker library — 50 emoji stickers in 5 categories (Popular, Emoji, Arrows, Badges, Decorative)
- [x] Perspective correction — horizontal/vertical skew + fine rotation sliders

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
- [x] Face detection portrait crop — BlazeFace for fast face detection; 3:4 portrait crop with headroom
- [x] Style transfer — Magenta arbitrary style transfer with 4 built-in presets + custom upload
- [x] Style strength slider (10–100%) for blending original and stylized output
- [x] AI Upscale (2x) — UpscalerJS super resolution with progress feedback and model caching
- [x] Denoise — bilateral-filter-inspired noise reduction with adjustable strength

### Templates & Social (v1.2)
- [x] Collage builder — 7 layouts (2-grid, 3-horizontal, 3-vertical, 4-grid, 6-grid, 1+2, 2+1), gap/radius/bg controls, 4 output sizes, canvas compositing with cover-fill and rounded corners

### Templates & Social (v1.2)
- [x] Template panel — sidebar with pre-designed layouts (Clean Story, Bold Story, Minimal Post, Vintage Post, FB Cover, YT Thumbnail, Cinematic, Moody)
- [x] Category filter — Stories, Posts, Social, Styles

### Batch Processing (v1.3)
- [x] Batch processor — upload multiple images, apply current edit state to all at once
- [x] Thumbnail grid with progress indicator and per-image status
- [x] Sequential download of all processed images
- [x] Accessible from upload screen, editor header (desktop + mobile)

### Smart Suggestions (v1.4)
- [x] Exposure/white balance suggestions — canvas analysis detects underexposed, overexposed, color cast, low contrast
- [x] Suggestion chips in EditorSidebar (Adjustments section) and MobileBottomTray (Adjust panel)
- [x] One-tap apply for suggested brightness, exposure, warmth, tint, contrast changes

### Healing Brush (v1.5)
- [x] Heal / clone stamp tool — set source point, drag to clone pixels with soft blending
- [x] Visual feedback — crosshair at source, dashed circle at cursor, connecting line during drag
- [x] Destructive apply via onImageReplace for undo support
- [x] Keyboard shortcut: H to toggle heal mode
- [x] Heal button in EditorSidebar (Drawing section) and MobileBottomTray (Draw panel)

### Image Info & Focus Blur (v1.6)
- [x] Image info panel — collapsible section showing dimensions, megapixels, file type, estimated size
- [x] Available in EditorSidebar (bottom) and MobileBottomTray (More panel)
- [x] Tilt-shift / focus blur — linear and radial modes with position, size, and blur controls
- [x] Multi-pass box blur for quality (3-pass Gaussian approximation)
- [x] Controls in EditorSidebar (Adjustments section) and MobileBottomTray (Adjust panel)
- [x] Applied as post-processing step in EditorCanvas after masks, before overlays

### Frames & Borders (v1.7)
- [x] Frame presets — None, Simple, Rounded, Shadow, Polaroid, Film Strip, Vintage, Gradient
- [x] Frame controls — type selector grid, color picker, width slider (0-50px)
- [x] Canvas rendering — frames drawn as post-processing step over image edges
- [x] Controls in EditorSidebar (new Frames section) and MobileBottomTray (new Frames tab)

### Color Picker / Eyedropper (v1.7)
- [x] Eyedropper tool — click on canvas to sample pixel color, converts RGB to hex
- [x] Floating color badge near cursor showing sampled color
- [x] Auto-copy hex to clipboard on pick
- [x] "Use as brush" button to apply picked color to brush
- [x] Picker button in Drawing section (sidebar + mobile) and next to brush color input
- [x] Keyboard shortcut: I to toggle picker mode
- [x] pickedColor state persisted in edit state

### Creative Effects (v1.8)
- [x] Film grain — per-pixel monochromatic noise with amount (0-100) and size (1=fine, 2=medium, 3=coarse)
- [x] Selective color (color splash) — keep one hue range colored while desaturating the rest; hue slider (0-360) with rainbow gradient track, range slider (5-90°)
- [x] Light leaks / bokeh overlays — 5 canvas-generated presets (Warm, Cool, Rainbow, Flare, Bokeh) composited via screen blend mode with intensity slider (0-1)
- [x] Controls in EditorSidebar (Adjustments section) and MobileBottomTray (Adjust panel)
- [x] Utility modules: src/utils/grain.js, src/utils/lightLeaks.js

### LUT Import & Resize Tool (v1.9)
- [x] LUT parser — parse .cube files (1D and 3D LUTs) with domain min/max, trilinear interpolation
- [x] LUT application — apply 3D LUT to pixel data after film emulation, before grain
- [x] LUT controls — import .cube file picker, clear LUT, show loaded name (EditorSidebar + MobileBottomTray)
- [x] Resize tool — separate from crop: width/height inputs, aspect ratio lock toggle, reset to original
- [x] Resize rendering — output canvas scaled to target dimensions after all processing
- [x] Utility modules: src/utils/lutParser.js, src/utils/lutApply.js

### Loading States (v1.4)
- [x] Full-screen loading spinner overlay in App.jsx during large image upload
- [x] Skeleton/loading indicator in EditorCanvas before image finishes loading
- [x] AI operations loading states verified consistent (spinners + progress bars)
