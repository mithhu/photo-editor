# PhotosAI — Coding Style Guide

> For AI agents and developers. Follow these conventions in future work.

---

## Project Overview

- **Stack:** React 19, Vite 7, Tailwind CSS v4
- **Purpose:** Web-based photo editor (Prequel/Photopea-style)
- **State:** No Redux/Zustand yet; useState + custom hooks

---

## 1. File & Folder Structure

```
src/
├── App.jsx              # Orchestrator only (~100 lines max)
├── main.jsx
├── index.css
├── constants.js         # INITIAL_EDIT_STATE, FILTER_PRESETS, etc.
├── components/          # One component per file
│   ├── index.js         # Barrel exports
│   ├── ImageUpload.jsx
│   ├── Slider.jsx
│   ├── EditorHeader.jsx
│   ├── EditorCanvas.jsx
│   └── EditorSidebar.jsx
├── hooks/               # useEditHistory, future: useCanvasDraw
└── utils/               # Pure functions (crop math, etc.) — add as needed
```

### Rules
- **One component per file.** Split when a file exceeds ~150 lines.
- **Barrel exports** via `components/index.js` — import from `./components`, not individual files.
- **No circular imports.**

---

## 2. React Conventions

### Components
- **Functional components only.** No class components.
- **Named exports** for components: `export function EditorSidebar() { ... }`
- **Default export** only for `App.jsx`.

### Hooks
- Extract reusable state/logic into custom hooks (`useEditHistory`, etc.).
- Use `useCallback` for handlers passed to child components.
- Use `useRef` for DOM refs (canvas, input); avoid in deps unless ESLint requires.
- Use `useEffect` for side effects; keep deps accurate.

### Props
- Destructure props at the top of the component.
- Prop types: add JSDoc or TypeScript later; for now, keep names descriptive.

### Example
```jsx
export function EditorSidebar({ editState, applyChange, applySliderChange }) {
  const { brightness, contrast, saturation } = editState
  // ...
}
```

---

## 3. Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Component files | PascalCase | `EditorCanvas.jsx` |
| Hook files | camelCase + `use` | `useEditHistory.js` |
| Constants | UPPER_SNAKE | `INITIAL_EDIT_STATE`, `FILTER_PRESETS` |
| Event handlers | `handle` + Noun | `handleImageLoad`, `handleDownload` |
| Boolean state | `is` / `can` / `has` | `canUndo`, `canRedo` |
| Callbacks from parent | `on` + Verb | `onImageLoad`, `onUndo` |

---

## 4. Styling (Tailwind)

- **Tailwind only.** No CSS modules, styled-components, or inline styles (except dynamic values).
- **Color palette:** `zinc` for UI, `indigo` for accent/primary actions.
- **Semantic classes:**
  - `text-zinc-300`, `text-zinc-400` — body/secondary text
  - `bg-zinc-900`, `bg-zinc-800` — panels, cards
  - `border-zinc-700`, `border-zinc-800` — borders
  - `accent-indigo-500` — sliders, checkboxes
  - `bg-indigo-500` — primary buttons (Download)
- **Responsive:** Use `lg:` for layout shifts (e.g. sidebar: `lg:w-80`).

---

## 5. State Management

### Current
- `useState` for local state.
- `useEditHistory` for edit state + undo/redo.
- No global store yet.

### Future (if needed)
- Prefer **Zustand** over Redux for simplicity.
- Keep editor state serializable for potential save/load.

---

## 6. Canvas & Image Logic

- Canvas drawing lives in `EditorCanvas.jsx` or a dedicated `useCanvasDraw` hook.
- Use `ctx.filter` with CSS filter syntax for adjustments.
- Crop math: center-crop formulas in one place; consider `utils/crop.js` when it grows.
- DPR: account for `devicePixelRatio` for sharp canvas on retina.

---

## 7. Adding New Features

1. **Constants** — Add to `constants.js` if shared (e.g. new filter presets).
2. **Components** — Create in `components/`, add to `index.js`.
3. **Hooks** — Create in `hooks/` for reusable logic.
4. **Docs** — After commit, update `docs/PROGRESS.md` and `docs/ROADMAP.md`.

---

## 8. Code Quality

- Run `npm run lint` before committing.
- Keep components focused; extract subcomponents when they exceed ~80 lines.
- Prefer early returns over nested conditionals.
- Comment non-obvious logic (crop math, rotation transforms).

---

## 9. docs/ (Committed)

- `docs/` contains team-facing docs: `ROADMAP.md`, `PROGRESS.md`, `OPEN_SOURCE_REFS.md`, `CODE_STYLE.md`.
- These are committed so all contributors have them when they clone.
- Update `docs/PROGRESS.md` and `docs/ROADMAP.md` when completing features.

---

*Last updated: Feb 2026*
