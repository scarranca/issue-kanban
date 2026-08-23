# Contributing

Thanks for your interest in Issue Kanban! Contributions are welcome.

## Getting started

```sh
git clone https://github.com/scarranca/issue-kanban.git
cd issue-kanban
npm install
tinyjs dev        # native window with hot reload
```

## What to work on

- Check the **Roadmap** section of the [README](README.md).
- Pick up any open issue, or open a new one to discuss your idea first.

## Pull requests

1. Keep changes focused and small.
2. Run the build before opening a PR:
   ```sh
   npm run build    # frontend type-check + Vite build
   tinyjs build     # full .app package
   ```
3. Describe what you changed and why.

## Style

- Backend code lives in `backend/` (txiki.js / TypeScript, bundled with esbuild).
- Frontend code lives in `src/` (React + TypeScript + Tailwind, shadcn/ui).
- Keep the frontend thin — anything privileged belongs in a backend `api` method.
