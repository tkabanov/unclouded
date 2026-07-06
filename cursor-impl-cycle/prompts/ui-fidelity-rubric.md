# UI fidelity rubric (mandatory for provider migration)

Bubble IR and `source/app.bubble` contain the visual design of the provider portal. The implementer must **preserve layout, structure, and styling** — not redesign screens.

## Source hierarchy (read in this order)

1. **Module slice** — `ir/slices/reusable-<id>.json` or `ir/slices/ui-page-<id>.json` for the current module
2. **Styles catalog** — `ir/slices/styles.json` — Bubble style definitions (`display`, `presentation.*`)
3. **Element tree** — each `element` entity: `element_type`, `name`, `parent_element_id`, `presentation`
4. **Raw fallback** — `source/app.bubble` via `source_path` on any entity when IR `presentation` is missing or dynamic

## What to preserve

| Layer | IR / Bubble fields | Vue target |
|-------|-------------------|------------|
| Structure | `parent_element_id`, `element_type`, `name` | Same component hierarchy and regions |
| Layout | `width`, `height`, `left`, `top`, `fit_width`, `fit_height`, `horiz_alignment`, gaps | CSS flex/grid; respect Bubble `fit_*` semantics |
| Typography | `font_family`, `font_size`, `font_weight`, `font_color` | CSS variables or utility classes |
| Colors | `bgcolor`, `border_*`, `icon_color` | Map `var(--color_*)` tokens to design tokens in `provider-app` |
| Spacing | `padding_*`, `margin_*` | Same spacing scale |
| Styles | `presentation.style_ref` → style entity in `styles.json` | Reusable CSS classes / Vue components |
| Copy | `presentation.text` (static labels) | Same visible strings unless i18n is explicitly in scope |

## Design system module first

`MOD-PROVIDER-DESIGN-SYSTEM` should land before feature modules when possible:

- Extract shared Bubble styles (`styles.json`) into `provider-app` tokens (colors, fonts, radii, shadows)
- Map reusables (`RE-provider-*` dropdown, checkbox, loader, uploader) to shared Vue components
- Later modules **compose** these primitives — do not invent new visual language per screen

## Decompose expectations

Each UI item should include:

- `ui_refs[]` — element and/or style entity IDs that define the screen region
- `layout_notes` — non-obvious layout (responsive groups, repeating regions, popups, z-index stacking)
- Acceptance criteria with **visual markers**: `data-bubble-id="<element_id>"` on root nodes of migrated regions

## Implement expectations

- Mirror element tree: Group → container, Text → label, Button → button, RepeatingGroup → list component, etc.
- Resolve `style_ref` through `styles.json` before hard-coding colors
- When Bubble uses `width: 0` / `fit_width: true`, use fluid layout — do not treat as literal 0px
- Static text from IR must match Bubble copy
- Add `data-bubble-id` on migrated roots for parity checks

## Review blockers (UI)

Reject implement review if:

- Screen layout clearly diverges from IR element hierarchy (missing regions, wrong nesting)
- Shared styles ignored where `style_ref` exists and style is in scope
- Typography/colors are generic placeholders when IR has explicit values
- No `data-bubble-id` markers where AC requires them

## Optional visual parity

For pixel-level checks against live Bubble, use `cursor-mcp-designer` separately — not a substitute for IR-grounded implementation.
