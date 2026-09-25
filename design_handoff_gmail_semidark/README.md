# Handoff: Gmail "Semi-Dark" Theme — Chrome Extension

> **Goal:** Build a browser extension that restyles Gmail into an Outlook-classic
> "semi-dark" look: **dark chrome on every edge** (top bar, left sidebar, rails,
> Tasks panel, list headers) with the **mail content staying light** for readability.

---

## 1. About the design files

The HTML/JSX files bundled alongside this README (`Gmail Semi-Dark Mockup.html`,
`gmail-app.jsx`, `gmail-parts.jsx`, `gmail-data.js`, `tweaks-panel.jsx`) are a
**high-fidelity design reference, not production code**. They are a pixel-level
mock-up of the user's real Gmail (split "multiple inboxes" view + Tasks side
panel) wearing the approved theme.

**Do not ship the HTML.** The deliverable is a **Manifest V3 browser extension**
that injects CSS into `https://mail.google.com/*` to recreate this look on real
Gmail. The mock-up is your visual source of truth — open it in a browser
side-by-side with Gmail while you work.

## 2. Fidelity

**High-fidelity.** All colors, weights, and treatments below are final and were
explicitly approved by the user. Match them exactly. Spacing/density of Gmail
itself should **not** be changed — this is a recolor/retheme, not a relayout.
("Keep current spacing" was an explicit decision.)

---

## 3. Locked design decisions (user-approved)

| Decision | Value |
|---|---|
| Edge shade scheme | **Slate** — 4 layered shades, see token table |
| Tasks panel | **Dark** (`#232e39`) |
| Column headers (Inbox / Today / Tomorrow / This week strips) | **Dark** (`#28333f`) |
| Compose button | **Solid yellow** `#ffc700`, dark text |
| Mail list rows | **Zebra striping**, contrast level 4/10 → overlay `rgba(31,41,51,0.044)` |
| Accent | `#ffc700` |
| Content background | `#f4f4f3` |
| Density | Unchanged from stock Gmail |
| Overall feel | Modern, easy to read, achievable with CSS-only extension |

## 4. Design tokens

```css
:root {
  /* ---- Edge shades (darkest → lightest) ---- */
  --gsd-rail:    #151c24;  /* far-left mini rail (Mail/Chat/Meet) + far-right add-on rail */
  --gsd-side:    #1f2933;  /* left sidebar (Compose, folders, labels) */
  --gsd-top:     #28333f;  /* top bar (search) + column header strips */
  --gsd-panel:   #232e39;  /* Tasks / side panel */

  /* ---- Accent ---- */
  --gsd-accent:        #ffc700;  /* compose, unread bar, stars, importance, badges, task due chips */
  --gsd-accent-soft:   rgba(255, 199, 0, 0.16); /* active nav item pill bg */
  --gsd-accent-text:   #ffd84d;  /* active nav item text/count on dark */
  --gsd-on-accent:     #20242a;  /* text/icon color on yellow surfaces */

  /* ---- Light content area ---- */
  --gsd-content:   #f4f4f3;   /* main mail-area background */
  --gsd-row:       #fdfdfc;   /* base mail row */
  --gsd-zebra:     rgba(31, 41, 51, 0.044); /* overlay on alternating rows (level 4/10) */
  --gsd-row-hover: rgba(31, 41, 51, 0.045); /* row hover overlay */
  --gsd-unread-bg: #ffffff;   /* unread rows: pure white + 3px accent left bar + bold */
  --gsd-sel-bg:    #fff7dc;   /* selected/focused row tint */
  --gsd-hairline:  rgba(31, 41, 51, 0.08);
  --gsd-col-divider: rgba(31, 41, 51, 0.12); /* between inbox columns */

  /* ---- Text on light ---- */
  --gsd-ink:    #1f2328;  /* primary text */
  --gsd-ink-2:  #5a6068;  /* secondary text: snippets, dates, counts */

  /* ---- Text on dark ---- */
  --gsd-edge-text:     #d6dae0;  /* primary text on dark chrome */
  --gsd-edge-text-dim: #9aa3ad;  /* secondary/icons on dark chrome */
  --gsd-edge-hover:    rgba(255, 255, 255, 0.08); /* hover pill on dark */

  /* ---- Misc ---- */
  --gsd-green:    #34c759;  /* "Active" status dot */
  --gsd-draft:    #d93025;  /* "Draft" red label (keep Gmail's) */
  --gsd-link-dark:#7eb8ff;  /* links on dark surfaces (Tasks panel) */
}
```

Typography: leave Gmail's font stack alone. The mock-up uses
`"Segoe UI", system-ui` purely as a stand-in; do **not** override Gmail fonts.

## 5. Area-by-area spec

Numbers reference the mock-up. Apply with `!important` (Gmail inlines styles).

### 5.1 Top bar (`--gsd-top`)
- Whole header bar `#28333f`; icons `--gsd-edge-text-dim`, hover → white 8% pill.
- Search field: pill, `rgba(255,255,255,0.09)` bg, `rgba(255,255,255,0.06)` 1px
  border, placeholder/icon in `--gsd-edge-text-dim`. Hover → 13% white.
- Gmail logo: in the mock-up it's a yellow rounded square — in the real
  extension just leave Google's logo as-is (don't recolor their asset), the dark
  bar behind it is enough.
- "Active" status chip: white 8% pill, green dot `#34c759`.
- Avatar: untouched (user photo).

### 5.2 Left mini rail — Mail / Chat / Meet (`--gsd-rail`)
- Darkest shade `#151c24`.
- Active item (Mail): icon + label in `--gsd-accent`; unread badge = yellow pill
  with `--gsd-on-accent` text.
- Inactive: `--gsd-edge-text-dim`, hover white 6% rounded square.

### 5.3 Left sidebar (`--gsd-side`)
- Background `#1f2933`.
- **Compose**: solid `#ffc700`, dark text `#20242a`, 14px radius,
  weight 600, subtle shadow `0 2px 8px rgba(0,0,0,0.3)`.
- Nav rows: `--gsd-edge-text-dim` text, 15px-radius hover pill (white 6%).
- **Active item (Inbox)**: bg `--gsd-accent-soft`, text + count `#ffd84d`,
  weight 600.
- Label dots/icons: parent labels (CAIRN, Projects) get the accent-colored
  tag icon; children stay dim. Section header "Labels" in `--gsd-edge-text`.
- Counts: dim; active count `#ffd84d` bold.

### 5.4 Mail list area (light — the whole point)
- Container/background `#f4f4f3`; toolbar row (select-all / refresh / more)
  stays light with `--gsd-ink-2` icons and a bottom hairline.
- **Column header strips** ("Inbox · 1–50 of 318", "Today", "Tomorrow",
  "This week"): **dark** `#28333f`, title `--gsd-edge-text` bold 13.5px,
  ranges/pager `--gsd-edge-text-dim`. These are sticky in the mock-up.
- **Rows**: base `#fdfdfc`; **even rows** get the zebra overlay
  `rgba(31,41,51,0.044)`. Hover: darken overlay `0.045` on top.
- **Unread rows**: pure white bg, **3px solid `#ffc700` left edge bar**,
  sender + subject + time bold (700).
- **Selected/focused row**: `#fff7dc` tint + same 3px yellow bar.
- Stars + importance markers: filled state = `#ffc700` (replaces Gmail's
  default yellow — close, but unify on the accent).
- Label chips (CAIRN/TODAY etc.): `rgba(31,41,51,0.08)` bg, `--gsd-ink-2`
  text, 4px radius — neutral, not colorful.
- Attachment chips: white bg, `rgba(31,41,51,0.15)` 1px border, 12px radius.
- Snippet text after the "—": `--gsd-ink-2`.
- Column divider between the two inbox lists: `--gsd-col-divider`.

### 5.5 Tasks / side panel (`--gsd-panel`) — DARK
- Background `#232e39`, text `--gsd-edge-text`.
- "TASKS" kicker: uppercase, 55% opacity. "My Tasks" 15px / 600.
- "Add a task": `--gsd-accent`, weight 600.
- Task dividers: `rgba(255,255,255,0.07)`.
- Task circles: 1.5px border currentColor at 45% opacity.
- Links inside tasks: `--gsd-link-dark` (#7eb8ff).
- Due chip ("Yesterday"): outlined pill in `--gsd-accent`.
- ⚠️ See §7.3 — this panel is an **iframe** and needs its own content script.

### 5.6 Far-right add-on rail (`--gsd-rail`)
- Darkest shade `#151c24`; add-on icons left as-is (they're images);
  counter badge white 12% pill.

### 5.7 Things to leave LIGHT / untouched
- Reading pane / opened conversation view: light (content = light is the rule).
- Compose popup window: light.
- Dropdown menus, tooltips, date pickers: leave stock unless trivially easy.
- Avatars, contact photos, inline images: never filter/invert.

## 6. Reference files in this bundle

| File | What it is |
|---|---|
| `Gmail Semi-Dark Mockup.html` | The approved mock-up — open in a browser. All final CSS values live in its `<style>` block. |
| `gmail-app.jsx` / `gmail-parts.jsx` / `gmail-data.js` | Mock-up components + sample data (reference only) |
| `theme.css` | **Starter stylesheet** for the extension with tokens + selector skeletons (see §7.2) |
| `manifest.json` | **Starter MV3 manifest** |
| `original-gmail.png` | Screenshot of the user's real, unthemed Gmail for selector reference |

---

## 7. Extension implementation plan

### 7.1 Architecture
- **Manifest V3**, CSS-only content scripts (no DOM rewriting, no JS theming
  needed for v1 — keep it resilient and reviewable).
- Inject at `document_start` so there's no white→dark flash on the chrome.
- All rules `!important` — Gmail uses inline styles and high-specificity
  generated classes.
- Add `:root { color-scheme: only light; }` for the mail surfaces so browser
  auto-darkening doesn't fight the theme (this bit us in the mock-up too).

```json
{
  "manifest_version": 3,
  "name": "Gmail Semi-Dark",
  "version": "0.1.0",
  "description": "Outlook-classic semi-dark theme for Gmail: dark edges, light mail.",
  "content_scripts": [
    {
      "matches": ["https://mail.google.com/*"],
      "css": ["theme.css"],
      "run_at": "document_start"
    },
    {
      "matches": ["https://tasks.google.com/*"],
      "css": ["tasks-panel.css"],
      "run_at": "document_start",
      "all_frames": true
    }
  ]
}
```

### 7.2 Gmail DOM targeting — strategy

Gmail's class names are obfuscated but **many have been stable for years**.
Strategy, in order of preference:

1. **ARIA/role attributes** (most stable):
   `div[role="navigation"]` (left nav), `div[role="main"]` (mail area),
   `form[role="search"]` / `input[aria-label*="Search"]`,
   `div[role="banner"]` / `#gb` (top bar), `tr[role="row"]`.
2. **Long-stable legacy classes** (verify each in DevTools before relying on it):
   - `tr.zA` — mail list row
   - `tr.zA.zE` — **unread** row · `tr.zA.yO` — read row
   - `td.yX` / `.yW` — sender cell · `.y6` — subject · `.xW` — date
   - `.bog` — subject text span · `.y2` — snippet
   - `.T-I.T-I-KE.L3` — Compose button
   - `.aeN` — left nav container · `.TK .TO` — nav item · `.TO.nZ.aiq` — active nav item
   - `.aio` — label name · `.bsU` — unread count
   - `.ar .at` — label chips on rows
   - `.brC-aT5-aOt-Jw` — right add-on rail container (churns more; verify)
   - `.aeH` / `.G-atb` — list toolbar
   - Multiple-inboxes section headers: inspect — look for the section title
     element wrapping "Today"/"Tomorrow" (historically `.Wg` / `.ae4` wrappers).
3. **`:has()` and attribute contains** as fallback glue — Chrome supports both.

**Verification step (do this first):** open the user's Gmail, DevTools-inspect
each region in §5, and record actual selectors into `theme.css`. The starter
`theme.css` in this bundle has every rule stubbed with the candidates above and
a `/* VERIFY */` comment. Don't trust this doc blindly — Gmail ships UI updates
constantly.

**Zebra striping caveat:** `tr.zA:nth-child(even)` works visually but Gmail
re-renders rows on the fly; striping may momentarily shuffle while scrolling.
That's acceptable for v1. (A MutationObserver adding explicit classes is the
v2 fix if it bothers the user.)

### 7.3 The Tasks panel is a cross-origin iframe
The right-hand Tasks panel is an `<iframe>` served from `tasks.google.com`.
CSS injected into `mail.google.com` **cannot** reach inside. Hence the second
content-script entry (with `"all_frames": true`) injecting `tasks-panel.css`
into `tasks.google.com`. Same token values, panel spec from §5.5.
Note: Calendar/Keep add-ons in the same companion rail are also iframes from
their own origins — out of scope for v1, leave them stock.

### 7.4 Precondition for the user's Gmail
- Gmail theme should be set to **Default (light)** in Gmail Settings → Theme.
  The extension layers on top of the light theme; combining with Gmail's own
  dark theme will produce double-darkening. State this in the extension README.
- Density: user keeps their current setting — CSS must not assume one.

### 7.5 Build order (suggested commits)
1. Scaffold MV3 extension, load unpacked, verify `theme.css` injects.
2. Top bar + search field (highest-visibility win, easy selectors via `#gb`).
3. Left sidebar + Compose + active-item accent treatment.
4. Mini rail (Mail/Chat/Meet) + far-right add-on rail.
5. Mail list: column headers dark, zebra, unread bar, selected tint, hover.
6. Stars/importance/label chips/attachment chips.
7. Tasks iframe stylesheet.
8. Polish pass: scrollbars (`::-webkit-scrollbar` — dark thumbs on dark
   surfaces, light on light), focus rings (accent), hairlines.
9. QA checklist (§8).

## 8. Acceptance checklist

- [ ] Top bar, sidebar, both rails, Tasks panel, column headers are dark, each with its **assigned shade** (4 distinct shades — don't flatten them to one)
- [ ] Mail list + reading pane remain **light** (`#f4f4f3` family) — at no point does email content go dark
- [ ] Compose = solid `#ffc700` with dark text
- [ ] Unread rows: white bg + 3px yellow left bar + bold
- [ ] Zebra striping visible but subtle (overlay ≈ 4.4% ink)
- [ ] Active nav item (Inbox) = yellow-tinted pill, `#ffd84d` text + count
- [ ] Stars / importance markers render in `#ffc700`
- [ ] Tasks panel dark with yellow "Add a task" + due chips, readable links
- [ ] No flash of unthemed UI on load (`document_start` working)
- [ ] Avatars, photos, attachment thumbnails NOT recolored/inverted
- [ ] Compose popup + dropdown menus still legible (left stock)
- [ ] Works in both the user's split "multiple inboxes" view AND plain inbox view
- [ ] Survives a Gmail refresh, label navigation, and opening/closing a thread
- [ ] Browser/system dark mode ON does not re-darken the light mail area

## 9. Out of scope (v1)
- Restyling compose window, settings pages, dropdowns, Chat/Meet views
- Calendar/Keep companion iframes
- Font changes, spacing/density changes
- Firefox port (CSS is portable; only manifest differs — easy v2)
