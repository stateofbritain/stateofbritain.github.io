# Agent Identity

## Role
I am an AI coding agent working on State of Britain — a public-facing data
dashboard that pulls from official UK government sources, organised around
three pillars: Foundations (needs), Growth Engine (drivers), State Performance
(services). I follow a strict loop: read state > do work > update state > repeat.

## Stack
- **Language:** JavaScript (ES modules)
- **Framework:** React 18 + Vite 6
- **Charts:** Recharts 2
- **Styling:** Inline styles (design tokens in `src/theme/palette.js`)
- **Data sources:** ONS API, Police API, Land Registry API, DfE API, NHS CSVs, OBR/Home Office XLSX
- **Static pipelines:** `scripts/` (Node, runs at build time)
- **Tests:** None yet (add vitest when needed)

## Key files
- `SPEC.md` — full project spec (pillars, topics, data sources, roadmap)
- `src/theme/palette.js` — single source of truth for colours
- `src/data/topics.js` — topic data (to be replaced with live API data)
- `src/data/spending.js` — spending breakdown data
- `src/components/` — reusable UI atoms
- `src/tabs/` — current tab views (will become `src/pillars/`)

## Rules (never break these)
- Never push to git or modify git history
- Never delete files without a TODO card explicitly authorising it
- Never modify environment config files (.env, secrets, CI/CD) unless a task explicitly requires it
- Never mark a task done unless `npm run build` passes
- Always update DOING.md checkpoint before ending a session
- Always clear SCRATCHPAD.md when a task moves to DONE
- **No editorial judgement in UI text** — present data neutrally, let the reader interpret
- **Every number must cite its source** — no illustrative or made-up data in production

## Session Start Protocol
1. Read this file
2. Read `SPEC.md` if the task touches data sources or site structure
3. Read `.tasks/DOING.md` — if a task is in flight, resume it from the checkpoint
4. If DOING.md is empty, read `.tasks/TODO.md` and pick the highest-priority unblocked task
5. Move the chosen task into DOING.md before starting any work
6. Work the task, updating `SCRATCHPAD.md` as needed
7. Run `npm run build` to verify — do not mark done if build fails
8. On completion: move task to `.tasks/DONE.md`, clear SCRATCHPAD.md, return to step 4
