import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'mission-control.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    model TEXT,
    avatar TEXT,
    color TEXT
  );

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    agent_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    status TEXT DEFAULT 'scheduled',
    agent_id TEXT NOT NULL,
    template_id INTEGER,
    scheduled_for TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    archived_at TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (template_id) REFERENCES templates(id)
  );

  CREATE TABLE IF NOT EXISTS recurring (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    cron_expr TEXT NOT NULL,
    timezone TEXT DEFAULT 'Europe/Berlin',
    template_id INTEGER,
    agent_id TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    next_run TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (template_id) REFERENCES templates(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    agent_id TEXT,
    action TEXT NOT NULL,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  );
`);

// Seed agents
const agentCount = db.prepare('SELECT COUNT(*) as c FROM agents').get().c;
if (agentCount === 0) {
  const insertAgent = db.prepare('INSERT INTO agents (id, name, role, model, avatar, color) VALUES (?, ?, ?, ?, ?, ?)');
  insertAgent.run('main', 'Main Agent', 'Orchestrator (Main Agent)', 'claude-opus-4-6', '🦝', '#6366f1');
  insertAgent.run('codex', 'Codex', 'Coding Sub-Agent', 'chatgpt-5.4', '🤖', '#10b981');
  insertAgent.run('research', 'Research', 'Research Sub-Agent', 'sonnet', '🔍', '#f59e0b');
}

// Seed recurring schedules
const recurringCount = db.prepare('SELECT COUNT(*) as c FROM recurring').get().c;
if (recurringCount === 0) {
  const insertRecurring = db.prepare('INSERT INTO recurring (title, cron_expr, timezone, agent_id, active, next_run) VALUES (?, ?, ?, ?, ?, ?)');
  insertRecurring.run('OpenClaw Auto-Update', '22 2 * * *', 'Europe/Berlin', 'main', 1, '2026-03-19T01:22:00Z');
  insertRecurring.run('System Auto-Update Script', '0 4 * * *', 'UTC', 'main', 1, '2026-03-19T04:00:00Z');
  insertRecurring.run('System Auto-Backup Git', '0 23 * * *', 'UTC', 'main', 1, '2026-03-18T23:00:00Z');
}

// Seed templates
const templateCount = db.prepare('SELECT COUNT(*) as c FROM templates').get().c;
if (templateCount === 0) {
  const insertTemplate = db.prepare('INSERT INTO templates (title, description, instructions, agent_id) VALUES (?, ?, ?, ?)');
  insertTemplate.run('Content Development', 'Use the content-development skill and carefully read the brief', 'Read the content brief from the project folder, develop the content following the brand voice guidelines, and deliver as a Notion page.', 'main');
  insertTemplate.run('Code Review', 'Review PR and provide detailed feedback', 'Clone the repository, check out the PR branch, review all changes for bugs, style issues, and potential improvements. Post review comments.', 'codex');
  insertTemplate.run('Competitor Analysis', 'Research competitor activities and summarize findings', 'Scrape competitor social media profiles, analyze their recent content strategy, pricing changes, and new features. Compile into a report.', 'research');
  insertTemplate.run('YouTube Pipeline', 'Process raw video through the full YouTube pipeline', 'Run VAD silence removal, transcription, AI metadata generation, and Auphonic audio enhancement. Deliver final package ready for upload.', 'main');
  insertTemplate.run('Newsletter Draft', 'Create weekly newsletter draft in Kit', 'Review recent content, extract key insights, write newsletter copy following brand style guide, create draft in Kit.', 'main');
}

// No task/activity seeds - tasks are created manually or via the UI

// Migration: Add avatar_url column if not exists
try { db.exec("ALTER TABLE agents ADD COLUMN avatar_url TEXT"); } catch(e) {}

// Set default avatar_url values
db.prepare("UPDATE agents SET avatar_url = ? WHERE id = ? AND avatar_url IS NULL").run('/avatars/main.jpg', 'main');
db.prepare("UPDATE agents SET avatar_url = ? WHERE id = ? AND avatar_url IS NULL").run('/avatars/codex.svg', 'codex');
db.prepare("UPDATE agents SET avatar_url = ? WHERE id = ? AND avatar_url IS NULL").run('/avatars/research.svg', 'research');

export default db;
