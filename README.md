# 🎯 VIP Mission Control v0.2.4

A beautiful agent dashboard for [OpenClaw](https://github.com/openclaw/openclaw).

## Features

- **📝 Docs** – Built-in markdown editor for your workspace files (SOUL.md, AGENTS.md, etc.)
- **🔑 Env Vars** – Manage your OpenClaw environment variables securely
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

The dashboard auto-detects your OpenClaw workspace in this order:
1. `OPENCLAW_WORKSPACE` environment variable
2. `openclaw config get workspace`
3. `~/.openclaw/openclaw.json` → `workspace` field
4. Common paths: `~/clawd`, `~/openclaw`, `/root/clawd`

**Docs Editor:** Serves files from the detected workspace root.
**Env Vars:** Reads/writes `env.vars` from `~/.openclaw/openclaw.json` via `openclaw config set/unset`.

## Hinweise für den installierenden Assistenten

Wenn du dieses Dashboard installierst, beachte bitte:

1. **Workspace-Pfad:** Das Dashboard erkennt den Workspace automatisch. Falls dein Workspace nicht unter `/root/clawd` liegt (z.B. `/home/admin/clawd`), setze die Env-Variable: `OPENCLAW_WORKSPACE=/pfad/zum/workspace` in der systemd Service-Datei.
2. **Service einrichten:** Erstelle eine systemd Service-Datei damit das Dashboard nach einem Neustart automatisch startet. Setze `WorkingDirectory` auf den Ordner wo du das Repo geklont hast.
3. **Port 3111:** Das Dashboard lauscht auf Port 3111 (nur localhost). Stelle sicher, dass Tailscale installiert und verbunden ist, damit dein User darauf zugreifen kann.
4. **Build:** Immer `cd client && npx vite build` ausführen nach dem Klonen oder Updaten.
5. **Nach der Installation:** Prüfe selbst ob das Dashboard erreichbar ist, bevor du deinem User den Link gibst. Öffne den Link nicht einfach blind.

## License

© Neumeister Consulting GmbH. Nutzung ausschließlich für unsere Kunden. Weitergabe, Verkauf und kommerzielle Weiterverwendung nicht gestattet.
