# Favicon

The site icon is the spicebush swallowtail from the school logo (`app/public/SpicebushLogo-03.png`) on a blossom-yellow badge. It is drawn twice: browser tabs show it at 16–48 px, where the logo's fine detail turns to noise, and phone home screens show it at 180 px, where that detail reads.

| File                              | Size                 | Drawing                                                                                                    | Made by                                                           |
| --------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `app/public/favicon.svg`          | any (tabs: 16–48 px) | Tab version: heavier body and antennae, three spots per side, gold rim so the edge holds on light tab bars | Hand-drawn; served as-is                                          |
| `app/public/favicon.ico`          | 16, 32, 48 px        | Same as `favicon.svg`                                                                                      | `npm run favicons`                                                |
| `app/public/apple-touch-icon.png` | 180 px               | Home-screen version: angled orange spots, wing shading, hindwing crescents; full-bleed yellow square       | `npm run favicons` from `docs/brand/favicon/apple-touch-icon.svg` |

The links live in one component, `app/src/components/FaviconLinks.astro`, used by every page `<head>` (`Layout.astro`, `NetlifyAuthLayout.astro`, `coming-soon.astro`). New layouts should render `<FaviconLinks />` instead of writing their own icon links.

## Changing the icon

1. Edit `app/public/favicon.svg` (tab version) and/or `docs/brand/favicon/apple-touch-icon.svg` (home-screen version). Keep the two drawings' butterfly geometry in step; only the level of detail should differ.
2. From `app/`, run `npm run favicons` to rebuild `favicon.ico` and `apple-touch-icon.png` (uses `sharp`).
3. Check the tab version at real 16 px on both a light and a dark tab bar before shipping.

## Constraints

- **Apple touch icon must be opaque.** iOS fills transparent pixels with black and applies its own rounded mask, so the 180 px icon is a full-bleed square, not the circular badge.
- **favicon.svg has no `<style>` or dark-mode switch.** The yellow badge reads on both light and dark tab bars, so one drawing serves both.
- **Coming-soon mode.** The icon paths are in the bypass list in `app/src/middleware.ts`; a new icon file needs adding there too.
