# Mission Control Dashboard – v0.1 Spec

## Overview
A self-hosted task management dashboard for managing OpenClaw agent tasks, cron jobs, recurring schedules, and templates.

## Tech Stack
- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + SQLite (via better-sqlite3)
- **Hosting:** Runs on Hetzner server, accessible via Tailscale only
- **Port:** 3111

## Design Reference
The UI should match a clean, modern SaaS dashboard style:
- Dark sidebar navigation on the left (dark gray/charcoal, ~200px wide)
- Clean white content area
- Modern, minimal design with good spacing
- App name: "Mission Control" with a 🎯 emoji in the sidebar header

## Navigation (Left Sidebar)
For v0.1, only these items:
- **Tasks** (active, the main view)

Other items like Dashboard, Agents, Activity, Skills, Usage, Settings are NOT built yet – they can appear in the sidebar as disabled/grayed out placeholders for future expansion.

## Tasks Page
The Tasks page has **4 sub-tabs** at the top:
1. **Tasks** – Active task list
2. **Templates** – Reusable task blueprints
3. **Recurring** – Recurring schedule overview
4. **Archived** – Archived/completed tasks

### Global Elements
- **Search bar** at the top center: "Search tasks, activity, jobs..."
- **Date/time display** top left (next to sidebar)

### 1. Tasks Tab
Shows all active tasks with count (e.g., "12 active · 47 total")

**Three view modes** (toggle icons top-right):
- 👤 **View by Agent** (default) – Kanban columns, one per agent. Each column shows agent avatar/name + task count. Tasks show: name, next scheduled date
- 📊 **Board View** – Kanban columns by status: Scheduled | Queue | In Progress | Done. Tasks show: name, agent badge, scheduled date
- 📋 **List View** – Simple table/list of all tasks

**+ New Task** button (top right, blue)

**Agent filter dropdown** in Board View: "All Agents" dropdown to filter

### 2. Templates Tab
Shows template cards in a grid layout.
Each template card shows:
- Template name (bold)
- Description (one line, e.g., "Use the content-development skill and carefully read...")
- Assigned agent (avatar + name)
- Task count (e.g., "# 17 tasks" generated from this template)
- **+ New Template** button (top right, blue)

**Search bar** for templates
**Agent filter** dropdown

### 3. Recurring Tab
Shows a list of recurring schedules.
Each row shows:
- Status indicator (green dot = active)
- Schedule name
- Recurrence pattern (e.g., "Every Monday at 11am", "Every day at 6am")
- Next run time (e.g., "Next: Thu 3/5 6am")
- Pause/Resume button
- Delete button
- **+ New Schedule** button or link to create

### 4. Archived Tab
Simple list of archived/completed tasks.

## Task Detail View
When clicking a task, navigate to `/tasks/:id` with:
- **← Back to Tasks** link
- Agent avatar (large, with robot/character illustration)
- **Task name** (large heading)
- **Scheduled date** below the name
- **Instructions** text area (the actual task description/prompt)
- **Status dropdown:** Scheduled | Queue | In Progress | Done
- **Assigned To** dropdown: Select agent
- **Scheduled For** date
- **Created** date
- **Archive task** link
- **Delete task** link
- **Activity Log** section: shows history of task execution (timestamp + description)

## Data Model

### Agents
Pre-seeded with our actual setup:
```json
[
  { "id": "main", "name": "Main Agent", "role": "Orchestrator (Main Agent)", "model": "claude-opus-4-6", "avatar": "🦝", "color": "#6366f1" },
  { "id": "codex", "name": "Codex", "role": "Coding Sub-Agent", "model": "chatgpt-5.4", "avatar": "🤖", "color": "#10b981" },
  { "id": "research", "name": "Research", "role": "Research Sub-Agent", "model": "sonnet", "avatar": "🔍", "color": "#f59e0b" }
]
```

### Tasks
```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  status TEXT DEFAULT 'scheduled', -- scheduled, queue, in_progress, done, archived
  agent_id TEXT NOT NULL,
  template_id INTEGER,
  scheduled_for TEXT, -- ISO datetime
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  archived_at TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (template_id) REFERENCES templates(id)
);
```

### Templates
```sql
CREATE TABLE templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  agent_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

### Recurring Schedules
```sql
CREATE TABLE recurring (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  cron_expr TEXT NOT NULL, -- cron expression
  timezone TEXT DEFAULT 'Europe/Berlin',
  template_id INTEGER,
  agent_id TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  next_run TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (template_id) REFERENCES templates(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

### Activity Log
```sql
CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER,
  agent_id TEXT,
  action TEXT NOT NULL, -- created, status_changed, executed, assigned, archived
  details TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

## Seed Data
Pre-populate with our actual cron jobs as recurring schedules:
- OpenClaw Auto-Update | 22 2 * * * Europe/Berlin | Main Agent
- System Crontab: Auto-Update Script | 0 4 * * * UTC | System
- System Crontab: Auto-Backup Git | 0 23 * * * UTC | System

## API Endpoints
REST API:
- `GET/POST /api/tasks` – List/Create tasks
- `GET/PUT/DELETE /api/tasks/:id` – Get/Update/Delete task
- `GET/POST /api/templates` – List/Create templates
- `GET/PUT/DELETE /api/templates/:id` – Get/Update/Delete template
- `GET/POST /api/recurring` – List/Create recurring schedules
- `GET/PUT/DELETE /api/recurring/:id` – Get/Update/Delete schedule
- `GET /api/agents` – List agents
- `GET /api/activity/:taskId` – Get activity log for task
- `GET /api/stats` – Dashboard stats (counts, etc.)

## Important Notes
- NO authentication needed (Tailscale handles access)
- SQLite database file at: `./data/mission-control.db`
- Use React Router for client-side routing
- Responsive design but desktop-first
- All dates displayed in Europe/Berlin timezone
- The app should be production-ready with a single `npm run build && npm start`
