# Issue Kanban

A tiny native macOS app that turns the issues from one or more GitHub
repositories into a local kanban board — with a bring-your-own-key AI
"done-check" that verifies an issue is actually finished against the real repo.

Built on [tinyjs](https://github.com/tarwin/tinyjsapp) — a ~6 MB native app
(a txiki.js backend + the system WebKit webview, no Electron/Node) — with a
React + [shadcn/ui](https://ui.shadcn.com) frontend.

## Features

- **Connect GitHub with a personal access token** — validated against the API
  and stored in the **macOS Keychain**, never on disk.
- **Track one or many repositories** — pull every issue (labels, assignees,
  milestone, state, comments) into a local SQLite database.
- **Kanban board** — drag issues across `Backlog → Todo → In Progress →
  In Review → Done`. Statuses live locally, so you can extend the workflow
  beyond GitHub's `open`/`closed`.
- **Create / update / delete issues** — writes through to GitHub.
  - *Create*: new issue with title, body, labels.
  - *Update*: edit title, body, labels.
  - *Delete*: closes the issue. GitHub's REST API has no "delete issue"
    endpoint (permanent deletion is an admin-only GraphQL mutation), so
    closing is the standard, reversible action.
- **Claim issues** — mark yourself as the owner in one click.
- **AI done-check (BYOK)** — for any issue, run an agent that inspects merged
  PRs, commits, and comments, then reports `done` / `partially done` /
  `not done` / `insufficient info` with evidence, confidence, and a suggested
  status. Works with any OpenAI-compatible provider.

## Requirements

- macOS 14+ (universal binary)
- [`tinyjs`](https://tinyjs.app) CLI — `curl -fsSL https://tinyjs.app/install | sh`
- Node.js 20+ (only for the frontend build tooling)

## Quick start

```sh
npm install
tinyjs dev        # opens a native window with hot reload
tinyjs build      # packages dist/issue-kanban + dist/"Issue Kanban.app"
```

Then, in the app:

1. **Settings → Account** — set your name and connect a GitHub token.
2. **Settings → Repositories** — add the repos you want to track.
3. **Settings → AI** — add an LLM key (optional, for the done-check).
4. Press **Sync**, then drag cards around the board.

## GitHub token scopes

Create a token at **GitHub → Settings → Developer settings → Personal access
tokens**.

- **Fine-grained token** (recommended): *Issues* (read + write), *Pull
  requests* (read), *Contents* (read) for the repos you track.
- **Classic token**: `repo` (private repos) or `public_repo` + `read:org`.

Write access on *Issues* is only needed for create/edit/close. Read access
suffices for the board and the AI done-check.

## AI providers

Every provider is driven through an OpenAI-compatible chat-completions
endpoint. Defaults:

| Provider   | Base URL                                                | Default model              |
| ---------- | ------------------------------------------------------- | -------------------------- |
| OpenAI     | `https://api.openai.com/v1`                             | `gpt-4o-mini`              |
| Anthropic  | `https://api.anthropic.com/v1`                          | `claude-sonnet-4-20250514` |
| DeepSeek   | `https://api.deepseek.com/v1`                           | `deepseek-chat`            |
| OpenRouter | `https://openrouter.ai/api/v1`                          | `anthropic/claude-sonnet-4`|
| Gemini     | `https://generativelanguage.googleapis.com/v1beta/openai`| `gemini-2.0-flash`         |
| Custom     | (anything OpenAI-compatible — Ollama, vLLM, Azure…)     | —                          |

Base URL and model are editable per provider, and you choose the default used
for done-checks.

## How it works

```
backend/          txiki.js backend (full system access, no ports)
  main.ts         api surface the page calls via tiny.api.call(...)
  db.ts           SQLite (tjs:sqlite) — repos, issues, analyses
  github.ts       GitHub REST client (pagination + create/update/close)
  ai.ts           minimal OpenAI-compatible client (no SDK)
  agent.ts        done-check agent (prompt + verdict parsing)
src/              React + shadcn/ui frontend (rendered by system WebKit)
```

- The page and backend talk over a private Unix socket — **no HTTP server, no
  ports**.
- The GitHub token and LLM keys live in the **Keychain**
  (`tiny.secrets` / `app.secrets`), not in the database.
- Board statuses and ownership are stored in **SQLite** in
  `~/Library/Application Support/com.issuekanban.app/`.
- The AI verdict never trusts a "closed" state on its own — it reads PRs,
  commits, and comments to decide whether the issue is actually done.

## License

MIT — see [LICENSE](./LICENSE).
