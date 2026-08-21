# Redundant / optimizable files in `znaki`

## Definitely redundant in the current build
These root-level files are orphan duplicates. The active app imports from `src/`, not from the repo root:

- `CardContextMenu.tsx`
- `ChainVisualizer.tsx`
- `GameBoard.tsx`
- `LifeCrystals.tsx`
- `PlayerField.tsx`
- `gameStore.ts`
- `types.ts`
- `znaki.html`

They can be removed from the repo or moved into an archive folder without affecting the current Vite app.

## Redundant utility/source files
These files exist under `src/` but are not currently imported anywhere:

- `src/data/defaultCards.ts`
- `src/utils/cn.ts`

If you do not plan to auto-load the default sheet or reuse the class helper, they can be removed.

## Non-runtime / cleanup candidates
These are not needed for the app itself:

- `znaki_fixes.patch`
- `GITHUB_PAGES_SETUP.md` (documentation only)

## Dependency cleanup candidates
These packages appear removable or worth checking:

- `lucide-react` — no imports found in `src/`
- `clsx` — only referenced inside unused `src/utils/cn.ts`
- `tailwind-merge` — only referenced inside unused `src/utils/cn.ts`
- `peerjs` — the runtime currently loads PeerJS from CDN in `src/networking/peer.ts`, so the npm package is likely redundant
- `@types/uuid` — usually unnecessary with modern `uuid`, which ships its own typings

## Biggest size source in a downloaded workspace
Not app code, but Git internals:

- `.git/objects`

Useful for Git, not for the app runtime.
