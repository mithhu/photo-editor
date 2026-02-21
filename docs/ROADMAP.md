# Photo Editor — Roadmap & Planning

> Vision: Build one of the best web-based photo editing applications, combining professional tools with approachable UX (think Prequel meets Photopea meets Canva).

---

## Current State (v0.1 — MVP)

- Image upload (drag & drop, file picker)
- Basic adjustments: brightness, contrast, saturation
- Crop: aspect ratios (Original, 1:1, 4:5, 16:9)
- Rotate: ±90°, Flip H/V
- Filter presets (Vintage, Cinematic, B&W, etc.)
- Export as PNG

---

## Phase 1: Foundation & Polish (4–6 weeks)

**Goal:** Solid core, good performance, reliable UX.

### 1.1 Editor UX

- [x] **Undo / Redo** — History stack for adjustments, filters, crop, rotate
- [x] **Zoom & Pan** — Pinch/scroll zoom, drag to pan on canvas
- [x] **Reset individual controls** — Per-slider reset vs full reset
- [ ] **Loading states** — Skeletons, progress for large images
- [x] **Error handling** — Invalid files, unsupported formats, export failures

### 1.2 More Adjustments

- [x] Exposure
- [x] Highlights & Shadows
- [x] Warmth / Tint
- [x] Clarity / Dehaze
- [x] Vibrance (vs saturation)
- [x] Vignette

### 1.3 Advanced Crop

- [x] Custom crop (numeric x, y, w, h)
- [x] More ratios: 9:16, 3:4, 2:3
- [x] Resizable crop handles (visual)
- [x] Free crop with custom dimensions

### 1.4 Technical

- [ ] **TypeScript** — Add types for state, props, canvas APIs
- [x] **Image size limits** — Warn/cap large uploads (20MB, 8192px)
- [x] **Responsive layout** — Mobile tabs, responsive header, touch support

---

## Phase 2: Professional Tools (6–8 weeks)

**Goal:** Feel closer to professional editors (Lightroom/Photopea).

### 2.1 Layers & Composition

- [x] **Text overlay** — Add text with content, color
- [x] **Stickers / shapes** — Basic shapes (circle, square, triangle, star, heart, arrows)
- [x] **Layer panel** — Reorder, toggle visibility, delete

### 2.2 Drawing & Brushes

- [x] **Brush tool** — Draw with adjustable size, opacity, color
- [x] **Eraser**
- [ ] **Healing brush** — Clone/stamp (simplified)

### 2.3 Curves & Color Grading

- [x] RGB curves
- [ ] Color wheels (shadows, midtones, highlights)
- [ ] Split toning
- [x] HSL sliders per color

### 2.4 Local Adjustments

- [ ] Radial mask
- [ ] Linear/gradient mask
- [ ] Apply adjustments only within mask

---

## Phase 3: AI & Smart Features (8–12 weeks)

**Goal:** AI-assisted editing like modern apps.

### 3.1 AI Features (client-side or API)

- [x] **Background removal** — @imgly/background-removal (ONNX, client-side)
- [x] **Smart auto-crop** — COCO-SSD object detection + bounding box crop with padding
- [x] **Style transfer** — Magenta arbitrary style transfer (4 presets + custom upload + strength)
- [ ] **Upscaling** — 2x/4x upscale
- [ ] **Denoise** — Reduce noise
- [x] **Auto-enhance** — One-click balance (exposure, contrast, color)
- [ ] **Object removal** — Inpainting (API or model)

### 3.2 Smart Suggestions

- [x] Auto crop / composition suggestions (via smart crop)
- [ ] Suggested filters based on image content
- [ ] Exposure/white balance suggestions

---

## Phase 4: Templates & Social (4–6 weeks)

**Goal:** Templates and export presets for social media.

### 4.1 Templates

- [ ] **Story templates** — Instagram/Snap layouts, borders, overlays
- [ ] **Collage builder** — Multiple photos in one frame
- [ ] **Custom templates** — Save and reuse layouts

### 4.2 Export & Sharing

- [x] **Share modal** — native OS share sheet (Web Share API), copy to clipboard
- [x] **Social sharing** — Twitter/X, Facebook, WhatsApp, Instagram buttons
- [x] Quality slider (JPEG compression) + format selection (PNG/JPEG/WEBP)
- [x] Resize on export with aspect ratio lock
- [x] Preset formats — IG Square, Story, Post, FB Cover, YT Thumb, Twitter
- [ ] Bulk export for collages
- [x] Optional watermark — text, position, opacity

---

## Phase 5: Platform & Scale (ongoing)

**Goal:** Reliable, fast, and scalable app.

### 5.1 Performance

- [ ] Web Workers for heavy processing (curves, filters)
- [ ] WebGL rendering (e.g. PixiJS or custom shaders)
- [ ] Lazy load editor UI
- [ ] Virtual scrolling for layers

### 5.2 Cloud & Sync

- [x] Save projects to localStorage / IndexedDB
- [ ] Optional cloud save (auth + backend)
- [x] Project versioning / auto-save

### 5.3 Sharing & Collaboration

- [ ] Share link to edited image
- [ ] Optional comments or annotations
- [ ] Embed widget for other sites

---

## Phase 6: Differentiation & Premium (future)

Ideas to stand out:

- **Presets marketplace** — Community filter and LUT packs
- **Batch processing** — Apply edits to multiple images
- **Plugins / extensions** — Third-party tools or filters
- **Pro features** — RAW support, non-destructive edits, HDR merge
- **Mobile PWA** — Camera capture, offline editing
- **Desktop app** — Electron/Tauri wrapper for installable app

---

## Tech Stack Considerations

| Area          | Current        | Potential Upgrades              |
|---------------|----------------|---------------------------------|
| Canvas        | 2D Canvas API  | WebGL (PixiJS), OffscreenCanvas |
| State         | React useState | Zustand, Jotai, or Immer        |
| History       | None           | Custom stack or Immer + patches |
| AI            | None           | TensorFlow.js, or REST APIs     |
| Styling       | Tailwind       | Keep or add design system       |
| Build         | Vite           | Keep                            |

---

## Priority Order (Suggested)

1. **Undo/Redo** — Critical for serious editing
2. **More adjustments** — Exposure, highlights, shadows
3. **Custom crop** — Resizable selection
4. **Text overlay** — High-impact feature
5. **Background removal** — Strong differentiator
6. **Zoom & pan** — Better handling of large images

---

## Success Metrics

- **Performance:** &lt; 2s load for 4K image, smooth 60fps sliders
- **UX:** &lt; 3 clicks to apply filter, clear visual feedback
- **Reliability:** No crashes on supported formats
- **Adoption:** Mobile-friendly, works offline for basic edits (PWA)

---

*Last updated: Feb 2026*
