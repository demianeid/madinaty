---
name: Civic Horizon
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#ffffff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3e4946'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6e7a76'
  outline-variant: '#bdc9c4'
  surface-tint: '#006b5b'
  primary: '#005c4f'
  on-primary: '#ffffff'
  primary-container: '#007766'
  on-primary-container: '#9ffbe5'
  inverse-primary: '#7cd7c2'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#005683'
  on-tertiary: '#ffffff'
  tertiary-container: '#006fa8'
  on-tertiary-container: '#dbecff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#98f3de'
  primary-fixed-dim: '#7cd7c2'
  on-primary-fixed: '#00201a'
  on-primary-fixed-variant: '#005144'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  primary-hover: '#005f52'
  primary-subtle: '#ecfdf5'
  primary-subtle-alt: '#e2f8ef'
  slate-800: '#1e293b'
  slate-600: '#475569'
  slate-500: '#64748b'
  canvas-bg: '#f8fafc'
  canvas-surface: '#f5faf8'
  border-default: '#e2e8f0'
  border-muted: '#dce8e4'
  status-danger: '#dc2626'
  status-danger-container: '#fef2f2'
  status-warning: '#d97706'
  status-warning-container: '#fffbeb'
  status-info: '#0284c7'
  status-info-container: '#f0f9ff'
  status-success: '#16a34a'
  status-success-container: '#f0fdf4'
typography:
  display-hero:
    fontFamily: IBM Plex Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: IBM Plex Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 34px
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: IBM Plex Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes a high-trust, authoritative, and radically accessible civic interface tailored for public infrastructure management, municipal tracking, and municipal citizen workflows. By centering on a balanced Civic Emerald (#007766) anchored by Deep Slate Navy (#0f172a), the aesthetic combines institutional gravity with contemporary digital clarity.

Key characteristics:
- **Directional Foundation:** RTL-first architecture where structural hierarchies, status sequences, and form steps mirror cleanly across Arabic and Latin scripts without loss of spatial balance.
- **Design Movement:** Clean Civic Modernism—prioritizing precise grid alignments, tinted soft containers, low-contrast protective borders, and purposeful chromatic status signals that minimize cognitive fatigue in dense dashboards.
- **Emotional Response:** Public trust, administrative transparency, calm authority, and immediate actionable clarity. Every state transition, badge, and card boundary communicates verifiable stability and accountability.

## Colors

The color system delivers high-contrast accessibility and legible visual hierarchy across public dashboards and intake forms.

### Strategic Color Roles
- **Primary (`#007766` - Civic Emerald):** The foundational anchor for primary action points, selected navigation items, key progress milestones, and prominent system triggers. Hovers resolve deeper at `#005f52`.
- **Primary Subtle (`#ecfdf5` / `#e2f8ef`):** Used for soft container backgrounds, active navigation item fills, and highlighted interactive zones, ensuring contrast with dark emerald typography.
- **Secondary (`#0f172a` - Deep Slate Navy):** The structural core used for persistent chrome, authoritative table headers, primary text, and formal data labeling. Variations (`#1e293b`, `#475569`, `#64748b`) provide refined typographic contrast.
- **Canvas & Surface (`#f8fafc` / `#f5faf8`):** Clean, faintly cool tinted neutrals that eliminate screen glare under outdoor and high-illumination field scenarios. Internal cards use pure white (`#ffffff`) framed with `#e2e8f0` or `#dce8e4`.
- **Functional Status System:** 
  - *Emergency / Danger:* `#dc2626` over `#fef2f2` container.
  - *Warning / Pending / Triage:* `#d97706` over `#fffbeb` container.
  - *Info / In-Progress:* `#0284c7` over `#f0f9ff` container.
  - *Success / Resolved:* `#16a34a` over `#f0fdf4` container.

## Typography

The typography is built around IBM Plex Sans (with full native support for IBM Plex Sans Arabic) to guarantee harmonized optical weight, legible diacritics, and uniform vertical alignment across bilingual interfaces.

- **Vertical Proportion:** Generous line heights ensure zero clipping of Arabic ascenders, descenders, and accent marks across data tables and compact forms.
- **Tabular Figures:** Tabular lining numerals are enforced for tracking numbers, case IDs, budget amounts, coordinates, and timestamps.
- **Visual Mapping:** High-level section headers use Deep Slate Navy (`#0f172a`), interactive metadata links leverage Civic Emerald (`#007766`), and secondary annotations adopt Slate 600 (`#475569`) to guarantee standard WCAG AAA legibility.

## Layout & Spacing

A strict 8pt grid with 4pt baseline subdivisions governs spatial composition, alignment, and information rhythm.

- **Desktop (≥ 1280px):** 12-column layout constrained to a 1440px viewport cap. Outer margins are `margin` (`2rem`) with `gutter` (`1.5rem`) between columns.
- **Tablet (768px – 1279px):** 8-column layout with `gutter-sm` (`1rem`) and `margin-mobile` (`1rem`). Navigational sidebars fold into high-efficiency drawer panels.
- **Mobile (< 768px):** 4-column flow with `margin-mobile` (`1rem`) and `gutter-sm` (`1rem`). Primary actions transition into anchored bottom floating panels.
- **Bidirectional Support:** All margins, paddings, and directional insets employ CSS logical properties (`margin-inline-start`, `padding-inline-end`) ensuring seamless inversion between RTL Arabic and LTR Latin views.

## Elevation & Depth

Visual hierarchy uses layered surfaces, tinted containment, and refined low-spread shadows to maintain institutional crispness without visual clutter:

- **Level 0 (Base Canvas):** Tinted neutral canvas (`#f8fafc` / `#f5faf8`). Clean background layer that hosts data modules.
- **Level 1 (Cards, Tables & Sections):** Pure white container (`#ffffff`) defined by a `1px solid #e2e8f0` (or `#dce8e4`) border, paired with an ambient drop: `0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)`.
- **Level 2 (Popovers, Select Menus & Sticky Nav):** Elevated `#ffffff` panels with `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)` and a subtle border ring.
- **Level 3 (Modals & Emergency Drawers):** High-priority overlays featuring `0 25px 50px -12px rgba(15, 23, 42, 0.25)` complemented by a frosted backdrop (`backdrop-filter: blur(6px); background: rgba(15, 23, 42, 0.45)`).

## Shapes

The design system incorporates balanced, medium roundedness to soften civic utility interfaces while sustaining crisp municipal professionalism:

- **Controls & Form Elements:** `0.5rem` (8px) for buttons, text inputs, search fields, and dropdown targets.
- **Cards & Data Modules:** `0.75rem` to `1rem` (12px–16px, `rounded-lg` / `rounded-xl`) for main containers, metric widgets, and preview cards.
- **Overlays & Dialogs:** `1rem` (16px, `rounded-xl`) to establish distinct containment against backdrops.
- **Status Indicators & Chips:** Pill shape (`9999px`) for triage badges, filter pills, and live state tags, distinguishing metadata from rectangular interactive targets.

## Components

### Buttons
- **Primary:** Background `#007766`, text `#ffffff`, border-radius `0.5rem` (8px), height `42px` (desktop), padding `10px 20px`. Hover: `#005f52`. Focus ring: `2px solid #007766` with `2px` offset.
- **Secondary:** Background `#0f172a`, text `#ffffff`, border-radius `0.5rem`. Hover: `#1e293b`.
- **Subtle / Tonal:** Background `#ecfdf5`, text `#007766`, border `1px solid #dce8e4`. Hover: `#e2f8ef`.
- **Tertiary (Ghost):** Background transparent, text `#475569`, border-radius `0.5rem`. Hover: `#f8fafc`, text `#0f172a`.

### Status Badges & Chips
- Pill-shaped (`9999px`) with `4px 12px` padding and `label-sm` weight.
- Includes a leading 6px circular indicator dot (mirrored for RTL):
  - *Critical / Emergency / Danger:* Background `#fef2f2`, text `#dc2626`, border `1px solid rgba(220, 38, 38, 0.2)`.
  - *Warning / Pending / Triage:* Background `#fffbeb`, text `#d97706`, border `1px solid rgba(217, 119, 6, 0.2)`.
  - *Info / In-Progress:* Background `#f0f9ff`, text `#0284c7`, border `1px solid rgba(2, 132, 199, 0.2)`.
  - *Success / Resolved:* Background `#f0fdf4`, text `#16a34a`, border `1px solid rgba(22, 163, 74, 0.2)`.

### Form Fields & Inputs
- Base height `44px`, background `#ffffff`, border `1px solid #e2e8f0`, border-radius `0.5rem`, padding `0 14px`, text `#0f172a`. Placeholder: `#64748b`.
- Focus state: Border transitions to `#007766` accompanied by an emerald shadow ring `0 0 0 3px rgba(0, 119, 102, 0.15)`.
- Error state: Border `#dc2626`, shadow ring `0 0 0 3px rgba(220, 38, 38, 0.12)`.

### Checkboxes & Radio Buttons
- Selected state fill: `#007766` with `#ffffff` glyph/dot.
- Unselected border: `1.5px solid #64748b`, background `#ffffff`, radius `4px` (checkbox) or `9999px` (radio).
- Focus ring: `0 0 0 3px rgba(0, 119, 102, 0.2)`.

### Cards & Module Panels
- Surface: `#ffffff`, border `1px solid #e2e8f0`, border-radius `0.75rem`–`1rem` (12px–16px), padding `space-md` to `space-lg`.
- Highlighted municipal alerts incorporate a `4px` inline-start border in Civic Emerald (`#007766`) or Status Danger (`#dc2626`) based on urgency.

### Data Tables & Lists
- Header row: Tinted neutral background `#f8fafc`, text `#475569`, border-bottom `1px solid #e2e8f0`, uppercase tracking for compact Latin keys.
- Row items: Background `#ffffff`, text `#0f172a`, border-bottom `1px solid #e2e8f0`, hover row fill `#f5faf8`.
- Action cells consistently align to the logical terminal edge (right in LTR, left in RTL).