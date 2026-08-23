<div align="center">

# 🗂️ Issue Kanban

**A tiny, native macOS kanban for your GitHub issues.**

Built on [tinyjs](https://github.com/tarwin/tinyjsapp) — a ~6 MB native app (no Electron, no Node) —
with a React + [shadcn/ui](https://ui.shadcn.com) interface and a bring-your-own-key AI "done-check".

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![tinyjs](https://img.shields.io/badge/powered%20by-tinyjs-6366f1)](https://tinyjs.app)
[![React 19](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-4.x-000000)](https://ui.shadcn.com)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## ✨ Features

- 🔗 **Connect GitHub** with a personal access token — validated and stored in the **macOS Keychain**, never on disk.
- 📋 **Multi-repo kanban** — drag issues across `Backlog → Todo → In Progress → In Review → Done`. Statuses live locally, so your workflow isn't limited to GitHub's `open`/`closed`.
- 🪄 **Create / update / close issues** — writes straight through to GitHub.
- 🤖 **AI done-check (BYOK)** — an agent inspects merged PRs, commits, and comments, then reports `done` / `partially done` / `not done` / `insufficient info` — with evidence, confidence, and a suggested status. Works with any OpenAI-compatible provider.
- 📊 **Dashboard & Analytics** — live stats, a status donut, and per-repository / per-assignee breakdowns.
- 📬 **Mailbox** — issues assigned to you (or that you've claimed) in one place.
- 📝 **Report** — a one-click markdown summary you can copy out.
- 🎨 **Gorgeous, keyboard-friendly UI** — shadcn/ui with light/dark themes and drag-and-drop.

## 🖥️ Why tinyjs?

- **~6 MB shipped** — no Electron, no bundled Chromium.
- **No HTTP server, no ports** — the UI and backend talk over a private Unix socket.
- **Native macOS** — Keychain secrets, real `.app` bundles, notifications.
- **Local-first** — your issues live in SQLite on your machine; your tokens live in the Keychain.

## 🚀 Quick start

```sh
# 1. install tinyjs
curl -fsSL https://tinyjs.app/install | sh

# 2. clone & run
git clone https://github.com/scarranca/issue-kanban.git
cd issue-kanban
npm install
tinyjs dev        # native window with hot reload
tinyjs build      # package dist/"Issue Kanban.app"
```

Then in the app:

**Settings → Account** (name + GitHub token) → **Repositories** (add repos) → **AI** (optional LLM key) → **Sync**.

## 🔑 GitHub token scopes

Create a token at **GitHub → Settings → Developer settings → Personal access tokens**.

| Type                     | Scopes                                                        |
| ------------------------ | ------------------------------------------------------------- |
| Fine-grained (recommended) | Issues *(read + write)*, Pull requests *(read)*, Contents *(read)* |
| Classic                  | `repo` (private) or `public_repo` + `read:org`                |

Write access on *Issues* is only required for create / edit / close.

## 🤖 AI providers

Any OpenAI-compatible endpoint works. Defaults:

| Provider   | Base URL                                                 | Default model              |
| ---------- | -------------------------------------------------------- | -------------------------- |
| OpenAI     | `https://api.openai.com/v1`                              | `gpt-4o-mini`              |
| Anthropic  | `https://api.anthropic.com/v1`                           | `claude-sonnet-4-20250514` |
| DeepSeek   | `https://api.deepseek.com/v1`                            | `deepseek-chat`            |
| OpenRouter | `https://openrouter.ai/api/v1`                           | `anthropic/claude-sonnet-4`|
| Gemini     | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.0-flash`         |
| Custom     | any OpenAI-compatible (Ollama, vLLM, Azure…)             | —                          |

Base URL and model are editable per provider, and you choose the default used for done-checks.

## 🏗️ How it works

```
backend/          txiki.js backend — full system access, no ports
  main.ts         API surface (tiny.api.call)
  db.ts           SQLite (tjs:sqlite) — repos, issues, analyses
  github.ts       GitHub REST client (pagination + create/update/close)
  ai.ts           minimal OpenAI-compatible client (no SDK)
  agent.ts        done-check agent (prompt + verdict parsing)
src/              React 19 + shadcn/ui + Tailwind v4
  components/     sidebar, topbar, board, dashboard, analytics, mailbox, …
```

- The page and backend talk over a **private Unix socket** — no HTTP server, no ports.
- GitHub token + LLM keys live in the **Keychain**; board state in **SQLite**.
- The AI verdict never trusts a "closed" state on its own — it reads PRs, commits, and comments to decide if the issue is *actually* done.

## 🧭 Roadmap

- [ ] Click-through from the Analytics donut to a filtered board
- [ ] Export the report to a `.md` file
- [ ] Label-based status sync back to GitHub
- [ ] Markdown preview toggle while editing

## 📜 License

[MIT](LICENSE) © 2026 Issue Kanban contributors
