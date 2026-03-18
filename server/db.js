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
  insertAgent.run('henry', 'Henry', 'Orchestrator (Main Agent)', 'claude-opus-4-6', '🦝', '#6366f1');
  insertAgent.run('codex', 'Codex', 'Coding Sub-Agent', 'chatgpt-5.4', '🤖', '#10b981');
  insertAgent.run('research', 'Research', 'Research Sub-Agent', 'sonnet', '🔍', '#f59e0b');
}

// Seed recurring schedules
const recurringCount = db.prepare('SELECT COUNT(*) as c FROM recurring').get().c;
if (recurringCount === 0) {
  const insertRecurring = db.prepare('INSERT INTO recurring (title, cron_expr, timezone, agent_id, active, next_run) VALUES (?, ?, ?, ?, ?, ?)');
  insertRecurring.run('Sebi Story Scraper', '0 20 * * *', 'UTC', 'henry', 1, '2026-03-18T20:00:00Z');
  insertRecurring.run('OpenClaw Auto-Update', '22 2 * * *', 'Europe/Berlin', 'henry', 1, '2026-03-19T01:22:00Z');
  insertRecurring.run('Nachtschicht', '0 3 * * *', 'Europe/Berlin', 'henry', 1, '2026-03-19T02:00:00Z');
  insertRecurring.run('Morgenbericht', '0 6 * * *', 'Europe/Berlin', 'henry', 1, '2026-03-19T05:00:00Z');
  insertRecurring.run('System Auto-Update Script', '0 4 * * *', 'UTC', 'henry', 1, '2026-03-19T04:00:00Z');
  insertRecurring.run('System Auto-Backup Git', '0 23 * * *', 'UTC', 'henry', 1, '2026-03-18T23:00:00Z');
}

// Seed templates
const templateCount = db.prepare('SELECT COUNT(*) as c FROM templates').get().c;
if (templateCount === 0) {
  const insertTemplate = db.prepare('INSERT INTO templates (title, description, instructions, agent_id) VALUES (?, ?, ?, ?)');
  insertTemplate.run('Content Development', 'Use the content-development skill and carefully read the brief', 'Read the content brief from the project folder, develop the content following the brand voice guidelines, and deliver as a Notion page.', 'henry');
  insertTemplate.run('Code Review', 'Review PR and provide detailed feedback', 'Clone the repository, check out the PR branch, review all changes for bugs, style issues, and potential improvements. Post review comments.', 'codex');
  insertTemplate.run('Competitor Analysis', 'Research competitor activities and summarize findings', 'Scrape competitor social media profiles, analyze their recent content strategy, pricing changes, and new features. Compile into a report.', 'research');
  insertTemplate.run('YouTube Pipeline', 'Process raw video through the full YouTube pipeline', 'Run VAD silence removal, transcription, AI metadata generation, and Auphonic audio enhancement. Deliver final package ready for upload.', 'henry');
  insertTemplate.run('Newsletter Draft', 'Create weekly newsletter draft in Kit', 'Review recent content, extract key insights, write newsletter copy following Ernst style guide, create draft in Kit.', 'henry');
}

// Seed some tasks
const taskCount = db.prepare('SELECT COUNT(*) as c FROM tasks').get().c;
if (taskCount === 0) {
  const insertTask = db.prepare('INSERT INTO tasks (title, description, instructions, status, agent_id, template_id, scheduled_for) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertActivity = db.prepare('INSERT INTO activity_log (task_id, agent_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)');

  insertTask.run('Write Instagram carousel for webinar promo', 'Create a 5-slide carousel promoting the upcoming KI-System webinar', 'Use the instagram-reels skill. Theme: AI automation for coaches. Include CTA "Kommentiere SYSTEM". Follow Ernst brand voice.', 'scheduled', 'henry', 1, '2026-03-19T09:00:00Z');
  insertTask.run('Review mission-control PR #42', 'Check the latest PR for the Mission Control dashboard', 'Review all changed files, run tests, check for TypeScript errors, verify the build passes.', 'in_progress', 'codex', 2, '2026-03-18T10:00:00Z');
  insertTask.run('Analyze Sebiforce latest content', 'Weekly competitor content analysis', 'Scrape @stiefundgluecklich Instagram, analyze post frequency, engagement rates, content themes. Compare to our metrics.', 'queue', 'research', 3, '2026-03-18T14:00:00Z');
  insertTask.run('Process YouTube video: KI für Experten', 'Full pipeline for latest recording', 'Run the youtube-full-pipeline skill on the Dropbox raw file. Generate titles, description, chapters, tags.', 'scheduled', 'henry', 4, '2026-03-20T06:00:00Z');
  insertTask.run('Newsletter KW12', 'Weekly newsletter for calendar week 12', 'Theme: AI agents in daily business. Include latest YouTube video, upcoming webinar link, and Skool community highlights.', 'scheduled', 'henry', 5, '2026-03-19T08:00:00Z');
  insertTask.run('Fix Dropbox sync race condition', 'Debug the bisync conflict detection', 'Investigate the race condition in clawd-dropbox-sync.sh where simultaneous edits cause conflicts. Propose and implement fix.', 'in_progress', 'codex', null, '2026-03-18T08:00:00Z');
  insertTask.run('Research trending AI topics for Reels', 'Find 5 trending AI topics for this week', 'Search Twitter, Reddit, YouTube trending. Focus on AI agents, automation, and no-code tools. Deliver list with hook ideas.', 'done', 'research', null, '2026-03-17T10:00:00Z');
  insertTask.run('Update Skool welcome sequence', 'Refresh the onboarding DMs', 'Review current welcome DM sequence, update for new MarketingOS features, add links to latest tutorials.', 'scheduled', 'henry', null, '2026-03-21T09:00:00Z');
  insertTask.run('Webinar landing page A/B test', 'Create variant B of the webinar page', 'Duplicate current lp.ernstneumeister.de/ki-system page, change headline and hero image, deploy as /ki-system-b.', 'queue', 'codex', null, '2026-03-19T11:00:00Z');
  insertTask.run('Audit Kit email deliverability', 'Check bounce rates and spam scores', 'Pull Kit analytics for last 30 days, check deliverability metrics, identify any issues with DNS/DKIM/SPF setup.', 'scheduled', 'research', null, '2026-03-20T14:00:00Z');
  insertTask.run('Monthly revenue report', 'Generate March revenue analysis', 'Pull data from Google Sheets revenue tracker, calculate MRR, churn, growth rate. Format as Notion page.', 'done', 'henry', null, '2026-03-15T07:00:00Z');
  insertTask.run('Instagram Reel: Behind the scenes', 'Create a BTS reel of the workspace', 'Use B-roll footage from the office cam, add text overlays about the AI setup, use Sally-style editing.', 'scheduled', 'henry', 1, '2026-03-22T10:00:00Z');

  // Add activity logs
  insertActivity.run(1, 'henry', 'created', 'Task created from template "Content Development"', '2026-03-17T15:00:00Z');
  insertActivity.run(2, 'codex', 'created', 'Task created from template "Code Review"', '2026-03-17T09:00:00Z');
  insertActivity.run(2, 'codex', 'status_changed', 'Status changed from scheduled to in_progress', '2026-03-18T10:05:00Z');
  insertActivity.run(3, 'research', 'created', 'Task created', '2026-03-17T12:00:00Z');
  insertActivity.run(3, 'research', 'status_changed', 'Status changed from scheduled to queue', '2026-03-18T08:00:00Z');
  insertActivity.run(6, 'codex', 'created', 'Task created manually', '2026-03-17T14:00:00Z');
  insertActivity.run(6, 'codex', 'status_changed', 'Status changed from scheduled to in_progress', '2026-03-18T08:30:00Z');
  insertActivity.run(7, 'research', 'created', 'Task created', '2026-03-16T09:00:00Z');
  insertActivity.run(7, 'research', 'status_changed', 'Status changed to done', '2026-03-17T11:30:00Z');
  insertActivity.run(7, 'research', 'executed', 'Found 5 trending topics: AI Agents, MCP Protocol, Vibe Coding, AI Voice Cloning, No-Code Automation', '2026-03-17T11:30:00Z');
  insertActivity.run(11, 'henry', 'created', 'Task created', '2026-03-14T08:00:00Z');
  insertActivity.run(11, 'henry', 'status_changed', 'Status changed to done', '2026-03-15T07:30:00Z');
  insertActivity.run(11, 'henry', 'executed', 'Report generated and posted to Notion', '2026-03-15T07:30:00Z');
}

// Migration: Add avatar_url column if not exists
try { db.exec("ALTER TABLE agents ADD COLUMN avatar_url TEXT"); } catch(e) {}

// Set default avatar_url values
db.prepare("UPDATE agents SET avatar_url = ? WHERE id = ? AND avatar_url IS NULL").run('/avatars/henry.jpg', 'henry');
db.prepare("UPDATE agents SET avatar_url = ? WHERE id = ? AND avatar_url IS NULL").run('/avatars/codex.svg', 'codex');
db.prepare("UPDATE agents SET avatar_url = ? WHERE id = ? AND avatar_url IS NULL").run('/avatars/research.svg', 'research');

export default db;
