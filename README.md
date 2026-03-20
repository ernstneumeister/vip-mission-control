# 🎯 VIP Mission Control

A beautiful agent dashboard for [OpenClaw](https://github.com/openclaw/openclaw).

## Features

- **📋 Tasks** – Kanban board with agent assignment, status tracking, and templates
- **📝 Docs** – Built-in markdown editor for your workspace files (SOUL.md, AGENTS.md, etc.)
- **🔑 Env Vars** – Manage your OpenClaw environment variables securely
- **⚡ Cron** – View, enable/disable, and manage OpenClaw cron jobs
- **🌗 Dark/Light Mode** – Automatic theme detection

## Quick Start

```bash
# Clone
git clone https://github.com/ernstneumeister/vip-mission-control.git
cd vip-mission-control

# Install dependencies
cd client && npm install && cd ..
cd server && npm install && cd ..

# Build frontend
cd client && npx vite build && cd ..

# Start
node server/index.js
```

Open http://localhost:3111

## Requirements

- Node.js 18+
- [OpenClaw](https://github.com/openclaw/openclaw) installed and configured
- The dashboard reads/writes from your OpenClaw workspace and config

## Configuration

The dashboard auto-detects your OpenClaw workspace at `~/.openclaw/workspace` (or the workspace configured for your agent).

**Docs Editor:** Serves files from the workspace root.
**Env Vars:** Reads/writes `env.vars` from `~/.openclaw/openclaw.json` via `openclaw config set/unset`.
**Cron:** Uses `openclaw cron` CLI commands.

## License

© Neumeister Consulting GmbH. Nutzung ausschließlich für unsere Kunden. Weitergabe, Verkauf und kommerzielle Weiterverwendung nicht gestattet.
