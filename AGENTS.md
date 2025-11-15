# Repository Guidelines

## Project Structure & Module Organization
Frontend code lives in `src/`, with `main.tsx` bootstrapping React and `App.tsx` defining the dashboard UI plus `App.css`/`index.css` for the glassmorphism theme. Shared images or fonts belong in `src/assets/`. Static files such as `favicon.svg` are served from `public/`. Root-level configs (`vite.config.ts`, `tsconfig*.json`, `eslint.config.js`) control the Vite build, TypeScript targeting, and lint rules—keep them in sync with any dependency upgrades.

## Build, Test, and Development Commands
- `npm run dev` starts the Vite dev server with HMR; use it while iterating on components.
- `npm run build` runs `tsc -b` plus `vite build` to catch type errors before producing `/dist`.
- `npm run preview` serves the latest build for validation in a production-like mode.
- `npm run lint` executes ESLint across the repo; fix or document any violation before pushing.

## Coding Style & Naming Conventions
Use TypeScript with modern React (functional components, hooks-only state). Stick to 2-space indentation and prefer descriptive PascalCase component names (e.g., `ServerPanel`), camelCase hooks/utilities (`useServerHealth`), and kebab-case CSS classes (`.server-panel`). Centralize UI constants (such as mock telemetry arrays) near their consumers until they warrant extraction. ESLint already enforces the baseline style—run it locally before requesting review.

## Testing Guidelines
Automated tests are not yet configured, so contributions must include targeted validation steps in the PR description. When adding runtime logic, supply component-level tests using Vitest + React Testing Library placed under `src/__tests__` or alongside the component (`Component.test.tsx`), and document the command used to run them (e.g., `npm test` once introduced). Guard critical data transformations and interactive flows with assertions covering edge cases and ARIA-visible output.

## Commit & Pull Request Guidelines
With no existing history, follow Conventional Commits (`feat:`, `fix:`, `chore:`) to make the log searchable. Keep commits focused and reference related issues in the footer when applicable. Pull requests should include: a concise summary, linked issue numbers, screenshots or screen recordings for UI changes, and a checklist showing `npm run lint` and `npm run build` results. Call out any deviations (temporary mocks, skipped tests) so reviewers understand remaining risks.

## Configuration Tips
Environment variables must use the `VITE_` prefix to reach the client (define them in `.env` or `.env.local`). Update `tsconfig.app.json` when adding new path aliases, and mirror those aliases inside `vite.config.ts` to keep imports resolvable in dev and build outputs.
