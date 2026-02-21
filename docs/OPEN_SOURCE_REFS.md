# Open Source References — Photo Editor

> Repos to study for architecture, patterns, and features.

---

## Core Libraries (Foundational)

| Repo | Stars | Purpose |
|------|-------|---------|
| [fabricjs/fabric.js](https://github.com/fabricjs/fabric.js) | ~28k | Canvas library for object manipulation, selection, layers. Used by many editors. |
| [konvajs/konva](https://github.com/konvajs/konva) | ~10k | Canvas framework with React bindings. Figma/Canva-style layer editing. |
| [pixijs/pixijs](https://github.com/pixijs/pixijs) | ~43k | WebGL 2D renderer. For high-performance filters and large images. |

---

## Full Photo / Image Editors (Open Source)

| Repo | Stars | Stack | What to Learn |
|------|-------|-------|---------------|
| [nihaojob/vue-fabric-editor](https://github.com/nihaojob/vue-fabric-editor) | ~7.5k | Vue + Fabric.js | Layers, undo/redo, templates, JSON export, i18n |
| [ximing/fabric-photo](https://github.com/ximing/fabric-photo) | ~240 | HTML5 Canvas + Fabric | MIT licensed, canvas-based, [demo](https://ximing.github.io/fabric-photo/) |
| [swimmingkiim/react-image-editor](https://github.com/swimmingkiim/react-image-editor) | varies | React + Fabric | React integration patterns |
| [mytac/react-konva-editor](https://github.com/mytac/react-konva-editor) | ~295 | React + Konva | Figma/Canva-style UI, layer panel |
| [LizAinslie/Canvo](https://github.com/LizAinslie/Canvo) | - | HTML5 Canvas | Lightweight, MIT, easy to read |

---

## Related (Design / Drawing Tools)

| Repo | Stars | Relevance |
|------|-------|-----------|
| [excalidraw/excalidraw](https://github.com/excalidraw/excalidraw) | ~116k | Collaborative canvas, undo/redo, state management |
| [tldraw/tldraw](https://github.com/tldraw/tldraw) | ~34k | Whiteboard with shapes, selection, keyboard shortcuts |

---

## CapCut-Style (Video + Photo)

| Repo | Stars | Purpose |
|------|-------|---------|
| [OpenCut-app/OpenCut](https://github.com/OpenCut-app/OpenCut) | **~46k** | Open-source CapCut alternative. Next.js, React, Zustand. Timeline editing, multi-track, real-time preview. Primarily **video** editor; useful for timeline/state patterns if we add collage or video. |

**Note:** CapCut itself is proprietary (ByteDance). OpenCut replicates its UX without paywalls. CapCut's photo filters (Snack, Apricot, Vintage, Moody, etc.) are closed-source—we can use their filter *names/styles* as inspiration, not code.

---

## Not Fully Open Source (Reference Only)

- **Photopea** ([photopea/photopea](https://github.com/photopea/photopea)) — 8k stars, but repo is for issues/discussion only; app code is closed. Use [Photopea.com](https://www.photopea.com) as UX/feature reference.

---

## Recommended Reading Order

1. **fabric-photo** — Small, MIT, easy to follow canvas flow
2. **vue-fabric-editor** — Feature set and architecture (layers, history)
3. **Fabric.js docs** — If you adopt Fabric for advanced crop/selection
4. **excalidraw** — Undo/redo and state patterns at scale

---

## Quick Links

- [Fabric.js docs](https://fabricjs.com/docs/)
- [Konva docs](https://konvajs.org/docs/)
- [Canvas 2D filter reference (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter)

---

*Last updated: Feb 2026*
