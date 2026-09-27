# BreakPoint #12050: Website Build Brief (handoff to the implementing Claude)

> Read this file first, then `docs/design-plan.md`.
> **DECIDED (2026-09-27): build Option H** (the revised version below). G is kept only as a reference because H borrows its scenes 2 and 6.
> Design canvas (all directions, live prototypes): https://claude.ai/artifact/QzENPxgwjDe1mm4wCmcK9E
> Prototype sources (single source of truth for exact values):
> - `docs/prototypes/G-final.dc.html`
> - `docs/prototypes/H.dc.html`
> - `docs/prototypes/H-mobil.dc.html`
> - `docs/prototypes/D-mobil.dc.html`
>
> The `.dc.html` files are a design-tool format. Copy the numbers from them (sizes, paddings, polygons, timings, easing), not the architecture.

## User rules (non-negotiable, from the user's global CLAUDE.md)

- **pnpm**, TypeScript **strict**, **no `any`**, Next.js **App Router**, Tailwind (no inline styles in React), try/catch on every async call, no `console.log` left in code.
- Site language is **Turkish** (add a TR/EN toggle in H; EN content can come later).
- Everything in `[BRACKETS]` is a placeholder the team must fill. **Never invent numbers, names, awards or sponsor benefits.** This includes FRC facts (build weeks, weight limit, team count): leave them as placeholders unless the user gives values.

## Brand

| Token | Value | Use |
|---|---|---|
| `--bp-black` | `#12100C` ("Kömür", chosen) | page bg |
| `--bp-surface` | `#1D1A15` | cards, alternating scenes |
| `--bp-line` | `#332E25` | rules, borders |
| `--bp-muted` | `#ABA597` | secondary text (7.7:1 on black) |
| `--bp-yellow` | `#FED233` | accent, CTA, crack (13:1 on black) |
| `--bp-white` | `#FFFFFF` | text |

**Only black text on yellow, never white.**

Fonts:
- **Norwester**: display, CAPS only. Self-host via `next/font/local`. The user must supply the file. Test Turkish İ Ş Ğ Ü Ö Ç, and fall back to Oswald via `unicode-range` if glyphs are missing.
- **Oswald** 400–700: labels, numbers, nav.
- **Roboto Condensed** 400/500/700: body.
- **JetBrains Mono** 400/500/700: code bits.
- Set `font-synthesis: none`.

Logo: none yet. Use the "BP" square with the notched corner:
`clip-path: polygon(0 0,100% 0,100% 64%,76% 58%,62% 100%,0 100%)`.

## Stack

- Next.js (latest, App Router) + TS strict + Tailwind v4 + pnpm.
- `gsap` + `@gsap/react` (`useGSAP`, ScrollTrigger; GSAP is fully free incl. plugins) + `lenis` (`lenis/react`, synced to ScrollTrigger).
- Follow `~/.claude/skills/awwwards/SKILL.md` for setup patterns (Lenis ↔ ScrollTrigger sync, `useGSAP` scope, cleanup).

Content lives in typed data files (`content/*.ts`) so the team can fill placeholders without touching components:
- `sponsorTiers`
- `robotParts`
- `team`
- `facts`
- `contact`
- `budget`

## Motion rules (learned while prototyping; do not relearn)

1. **All scene motion is scroll-scrubbed** (`ScrollTrigger` `pin: true, scrub: true`). Nothing plays on its own except:
   - the sponsor orbit's continuous rotation (the user explicitly wants it to rotate on its own, NOT with scroll);
   - the pulse on the active robot part;
   - the console caret.
2. **Never drive a continuous animation and scroll-driven React re-renders on the same element.** In the prototype the CSS orbit animation froze while scrolling down because re-renders restarted it. Run the orbit on `gsap.ticker` (or a rAF) writing transforms to refs, with no React state in the loop. Don't put scroll progress into React state at all: let GSAP own it.
3. Animate only `transform` / `opacity`. `clip-path` polygons stay static; move the clipped layers instead.
4. `prefers-reduced-motion`:
   - no pins;
   - every scene shows its settled end state in normal flow;
   - the orbit is static;
   - the crack line is visible but doesn't open.
5. Mobile:
   - pin only the key scenes (G: 1, 2, 4 · H: 1, 3, 6), pin lengths about 60%;
   - the hero crack runs horizontally and splits BREAK / POINT (see the mobile prototypes);
   - 5 logos in the orbit.
6. Hero pieces: both halves contain the same content, each clipped to one side of the fault polygon. The left piece holds the real `<h1>`; the right piece's duplicate is `aria-hidden`. Accessible CTAs must be in a piece that isn't aria-hidden.
7. Lighthouse 95+, CLS 0, and 60fps on a mid-range Android. Lazy-load the robot video/photo. The hero robot should be a short muted looping video with a poster.

## Shared hero fault polygon (both G and H)

Left piece:
`polygon(0 0,60% 0,57% 14%,62% 24%,52% 38%,47% 46%,49% 55%,45% 64%,47% 76%,41% 88%,43% 100%,0 100%)`

The right piece is the complement.

Scroll mapping (p = 0…1 over ~1300px):
- The crack line is visible at 55%, rising to 100% by p = 0.1.
- The halves open with `easeInOutCubic` over p 0.1 → 0.85:
  - left piece: `translate(-780px,-140px) rotate(-9deg)`;
  - right piece: `translate(780px,160px) rotate(8deg)`.
- The robot media scales 1.35 → 1 and fades 0.3 → 1.

## Option G: "Fay Hattı Sinematik" (6 scenes, the user said "tam istediğim gibi")

| # | Scene | Pin | Motion |
|---|---|---|---|
| 1 | Hero: code-editor lines with a giant BREAKPOINT in the yellow line | 1300 | Fault breaks, robot revealed |
| 2 | Robot parts ×4 | 2100 | Camera zoom `scale(1.8)` to each part's origin, giant outlined number, progress bars |
| 3 | Manifesto | 1100 | Words light up in sequence; "kırılma noktası" is yellow |
| 4 | Sponsor orbit "Robotumuzun yörüngesine girin" | 1300 | Ring scales in on scroll; logos **auto-rotate** (48 s/turn) and stay upright; pause on hover |
| 5 | Packages as JSON cards, `sponsor = siz;` | none | Cards stagger up |
| 6 | CTA | 700 | Crack draws across yellow (`pathLength=1` dash), halves split 28px: "Bir sonraki kırılma noktası / sizinle." |

The footer is a terminal console `iletisim()`. The header has a yellow progress bar and a `● 0N / 06` scene indicator.

## Option H (CHOSEN): 8 scenes, built from critique by the LLM council and a second Claude, then revised by the user

What H changes from G:
- **Plain Turkish first; code is a second layer.** Package cards show plain text, with a `</> kaynak` toggle to see the JSON.
- **Fault-line spine**: the left rail doubles as progress navigation. The jagged line fills yellow with progress, and there are 8 clickable breakpoint dots (≥44px hit area).
- **Watch panel** (bottom-left, `JetBrains Mono`): debugger-style variables that change per scene. On mobile it collapses into the bottom bar next to the sticky **Sponsor Ol** and WhatsApp buttons.

| # | Scene | Pin | Motion / content |
|---|---|---|---|
| 1 | Hero | 1300 | Same as G. Plain subtitle "[OKUL] öğrencileriyiz…" plus CTAs sit in the right piece. **User fix:** the yellow crack line must NOT stay on screen after the break. Its opacity is `(0.55 + 0.45·clamp(p/0.1)) × (1 − clamp((p−0.14)/0.12))`, so it is gone by p ≈ 0.26 while the halves are still opening. |
| 2 | FRC nedir? (3 facts, placeholders) | none | Rise-in |
| 3 | Robot parts ×4 (**exactly G's scene 2**; the user removed the stress test) | 2500 | At p < 0.08 the view is the overview. Then part k = floor((p−0.08)/0.23). The camera does `scale(1.8)` with `transform-origin` at the part's x/y, and the transition is 1s `cubic-bezier(.65,0,.35,1)`. Active dot is filled and pulsing. Right column: giant outlined number `0k`, part name, one-line description, 4 progress bars. Parts: Şasi (32%,74%), Mekanizma (60%,28%), Elektronik (46%,52%), Yazılım (72%,60%). |
| 4 | Team portraits | none | Stagger. Labels like `kaptan: "[AD]"` |
| 5 | Manifesto (short) | 700 | Word light-up |
| 6 | Orbit → robot | 1700 | Logos orbit on their own. At p 0.4–0.75 they **land** on a robot silhouette (bumper / side panel / arm). The "+ SİZ" slot lands mid-bumper, and an input writes the visitor's company name onto it live. Tier legend: tampon → [PAKET 2] and so on. |
| 7 | Budget + packages + contact | none | Budget bar is labelled **ÖRNEK** until real numbers arrive. Plain cards with the JSON toggle. Named contact person, WhatsApp, PDF. |
| 8 | **Glass shatter → contact** (user spec; this is also the site's footer) | 1100 | The pinned screen never moves; only the pieces move. **Front layer:** yellow "glass" (a subtle diagonal sheen gradient) printed with "Bir sonraki / kırılma noktası" and "SİZİNLE.". (1) p 0.06 → 0.3: cracks spread from an impact point at (740,430): 11 jittered radial spokes plus 4 jittered rings, drawn with `pathLength=1` dashes, spokes first. (2) p 0.34 → 0.40: the pieces "pop" 5px outward and the crack lines fade. (3) p 0.40 → ~1: the glass is **shattered** into 55 shards (a triangle plus 4 quads per spoke). Each shard is a full-screen copy of the glass layer clipped to its polygon. They fall with gravity (`ty = t²·(1150…1550px)`) plus sideways drift and spin up to ±45°, staggered by ring (inner first) and a random offset. **Back layer (revealed like the hero's robot):** scale 1.06 → 1 and fade in from p 0.42 → 0.72. It holds the contact console `iletisim()`, the named sponsorship contact, SPONSOR OLUN / WhatsApp / Takıma katıl, and the footer nav. Then the giant **BREAKPOINT** wordmark rises in (p 0.68 → 0.92) with the © line. Afterwards comes only a thin 120px legal bar (© + KVKK). The watch panel fades out during the reveal. Accessibility: the glass copies are `aria-hidden`, a visually-hidden h2 carries the headline, and the back layer only receives pointer events once revealed. Geometry generator: `this.glass` in `H.dc.html`. For performance on the real site, render the shards to a canvas or use a small number of layered SVG `<clipPath>`s instead of 55 DOM copies if profiling shows jank. |

In the orbit landing, logo targets inside a 720-px box centred on the orbit:
- bumper: (200,560), (520,560), with + SİZ at (360,560) and scale 1.2;
- side panel: (240,445), (480,445);
- arm: (465,235);
- top: (465,118).

Position = mix(orbitPos(angle), target, land).

## Content the team still owes (ask the user; don't fabricate)

- Norwester font file
- Robot video/photos (side view, cut-out, for the part zoom)
- School / city
- Slogan
- Robot name and year
- Team portraits and roles
- Sponsor tiers: names, amounts, benefits
- Budget split
- Sponsorship contact person, phone, WhatsApp
- Email and socials
- Sponsor PDF
- FRC facts they want shown
- One-line description per robot part (scene 3)

## Definition of done

`pnpm lint && pnpm typecheck && pnpm build` all pass.

Check each of the following in a real browser, and record the evidence:
- every scene works on desktop and a 390px viewport;
- reduced-motion shows the settled layouts;
- keyboard can reach every link and button, including the spine dots and the H company input;
- no horizontal scroll at 390px;
- the orbit keeps rotating while scrolling in both directions.
