# Design

Scotty's Circle is an **operate** surface: a campus meetup app.

## World

Light, print-like campus identity. Carnegie red on warm white with tinted black type. Palette only — no tartan plaid.

## Color

- Canvas `#F4F0EE`
- Card `#FFFBFA`
- Ink `#1C1214` (tinted, not pure black)
- Muted `#5A4348` (same hue family)
- Line `#E4D4D6`
- Action `#C41230` / `#9A0E26`

Red is for action, selection, and the mark. It is not wallpaper.

## Type

- Display: Newsreader (names, screen titles)
- UI: Source Sans 3
- No Inter, Arial, or system-ui as the designed voice

## Motion

Welcome mark + title is the one authored entrance. Everywhere else, 140–180ms press/state feedback (`cubic-bezier(0.16, 1, 0.3, 1)`). No bounce. `prefers-reduced-motion` drops spatial motion.

## Icons

Stroke SVGs in `apps/web/src/components/Icons.tsx`. Do not replace them with emoji.
