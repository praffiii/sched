# Design System — Sched

## Design Language

Sched uses a **sketchy / handwritten wireframe aesthetic** — intentionally lo-fi, warm, and approachable. The visual style references paper notebooks, hand-drawn calendars, and pencil sketches. Nothing is perfectly aligned or sterile.

---

## Color Palette

> All colors sourced directly from the original wireframe (`AI Calendar Wireframes.html` and companion `.jsx` files).

### Base

| Token | Value | Usage |
|---|---|---|
| `--paper` | `#FFFCF2` | Card and panel backgrounds |
| `--paper-warm` | `#F5EFD9` | Sidebar, secondary backgrounds |
| `--canvas` | `#EDE7D3` | App background (body) |
| `--ink` | `#1a1a1a` | All borders, text, icons |

### Accent

| Token | Value | Usage |
|---|---|---|
| `--yellow` | `#FFD93D` | Primary buttons, active states, highlights, existing GCal events |
| `--red` | `#FF6B6B` | Conflict indicator, destructive actions |
| `--green-teal` | `#B8E0D2` | AI event base color (used in hatch pattern) |

### Text

| Token | Value | Usage |
|---|---|---|
| `--text-primary` | `#1a1a1a` | Body text |
| `--text-secondary` | `#555555` | Subtitles, timestamps |
| `--text-muted` | `#888888` | Placeholders, hints |
| `--text-disabled` | `#cccccc` | Disabled states |

---

## Typography

All fonts loaded from Google Fonts.

| Token | Font stack | Usage |
|---|---|---|
| `--hand` | `'Kalam', 'Patrick Hand', system-ui, sans-serif` | Body text, labels, inputs, buttons |
| `--display` | `'Caveat', cursive` | Logo ("Sched"), large headings |
| `--scribble` | `'Caveat', 'Shadows Into Light', cursive` | Annotations, AI spark icon (✦), notes |

### Scale

| Usage | Font | Size | Weight |
|---|---|---|---|
| App logo | `--display` | 22–56px | 800 |
| Page heading | `--hand` | 36px | 700 |
| Section heading | `--hand` | 22px | 700 |
| Body | `--hand` | 14–16px | 400 |
| Label / caption | `--hand` | 11–13px | 400 |
| Event chip | `--hand` | 9–12px | 700 |
| Annotation | `--scribble` | 14–16px | 400 |

---

## Borders & Shadows

All borders use `--ink` (`#1a1a1a`). Borders are bold and deliberate — no soft or subtle borders.

| Usage | Style |
|---|---|
| Default box border | `2px solid #1a1a1a` |
| Dashed / secondary | `2px dashed #1a1a1a` |
| Light separator | `1px dashed #cccccc` |
| Border radius (cards) | `8px` |
| Border radius (buttons) | `999px` (pill) |
| Border radius (chips) | `4–6px` |

### Shadows — Offset style, no blur

| Usage | Shadow |
|---|---|
| Primary button | `3px 3px 0 #1a1a1a` |
| Card / panel | `6px 6px 0 #1a1a1a` |
| Phone frame | `5px 5px 0 #1a1a1a` |
| Floating bar / drawer | `4px 4px 0 #1a1a1a` |

---

## Component Patterns

### SketchBox
General-purpose container. Solid 2px border, 8px radius.

```css
border: 2px solid #1a1a1a;
border-radius: 8px;
background: #FFFCF2; /* or #fff */
```

### SketchBtn — Primary
Used for main actions: Generate, Accept, Allow & continue.

```css
background: #FFD93D;
border: 2px solid #1a1a1a;
border-radius: 999px;
box-shadow: 3px 3px 0 #1a1a1a;
font-family: var(--hand);
font-weight: 600;
```

### SketchBtn — Default
Secondary actions: Cancel, Discard, Edit.

```css
background: #ffffff;
border: 2px solid #1a1a1a;
border-radius: 999px;
box-shadow: 2px 2px 0 #1a1a1a;
font-family: var(--hand);
font-weight: 600;
```

### SketchInput
Text input area.

```css
border: 2px solid #1a1a1a;
border-radius: 8px;
background: #ffffff;
font-family: var(--hand);
color: #888888; /* placeholder state */
```

### Avatar
Circular user icon.

```css
border-radius: 50%;
border: 2px solid #1a1a1a;
background: #FFD93D;
font-family: var(--hand);
font-weight: 700;
```

---

## Calendar Event Visual Language

| Event type | Visual |
|---|---|
| Existing GCal event | Solid `#FFD93D` background |
| AI pending event | Hatched diagonal stripes (see pattern below) |
| AI accepted event | Solid `#B8E0D2` background — committed to GCal |
| Conflicting event | ⚠ icon overlay on chip |
| Selected / focused event | Bold border highlight |

### AI Pending Event — Hatch Pattern

```css
background: repeating-linear-gradient(
  45deg,
  #B8E0D2 0px 4px,
  #ffffff 4px 7px
);
border-style: dashed; /* signals "not yet committed" */
```

### Event Chip

```css
border: 1.5px solid #1a1a1a;
border-radius: 4px;
font-family: var(--hand);
font-size: 9px;
font-weight: 700;
```

---

## Annotation Style

Handwritten marginalia used for AI reasoning labels and design notes.

```css
font-family: var(--scribble);
color: #E63946;
font-size: 16px;
line-height: 1.2;
transform: rotate(-2deg);
```

---

## Paper Texture

Applied as `body::before` — subtle dot pattern simulating paper grain.

```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(0,0,0,0.02) 1px, transparent 2px),
    radial-gradient(circle at 60% 70%, rgba(0,0,0,0.02) 1px, transparent 2px);
  background-size: 8px 8px, 12px 12px;
  z-index: 0;
}
```

---

## CSS Variables — Full Reference

```css
:root {
  /* Typography */
  --hand: 'Kalam', 'Patrick Hand', system-ui, sans-serif;
  --display: 'Caveat', cursive;
  --scribble: 'Caveat', 'Shadows Into Light', cursive;

  /* Base */
  --paper: #FFFCF2;
  --paper-warm: #F5EFD9;
  --canvas: #EDE7D3;
  --ink: #1a1a1a;

  /* Accent */
  --yellow: #FFD93D;
  --red: #FF6B6B;
  --green-teal: #B8E0D2;

  /* Text */
  --text-primary: #1a1a1a;
  --text-secondary: #555555;
  --text-muted: #888888;
  --text-disabled: #cccccc;
}
```
