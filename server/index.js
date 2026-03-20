import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import multer from 'multer';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Security: sanitize shell inputs to prevent command injection
function sanitizeShellArg(str) {
  if (typeof str !== 'string') return '';
  // Remove any shell-dangerous characters
  return str.replace(/[;&|`$(){}!<>\\\"'\n\r]/g, '');
}

function isValidId(id) {
  // IDs should only contain alphanumeric, hyphens, underscores
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

function isValidEnvKey(key) {
  // Env keys: uppercase letters, numbers, underscores
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
}

const app = express();
const PORT = process.env.PORT || 3111;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow localhost and Tailscale IPs (100.x.x.x) and private networks
    if (/^https?:\/\/(localhost|127\.0\.0\.1|100\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|0\.0\.0\.0)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS not allowed'));
  }
}));
app.use(express.json());

// Serve static client build
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist, { maxAge: 0, etag: false }));

// Ensure avatars dir in dist and copy from public
const avatarsDistDir = path.join(clientDist, 'avatars');
if (!fs.existsSync(avatarsDistDir)) fs.mkdirSync(avatarsDistDir, { recursive: true });
const avatarsSrcDir = path.join(__dirname, '..', 'client', 'public', 'avatars');
if (fs.existsSync(avatarsSrcDir)) {
  for (const f of fs.readdirSync(avatarsSrcDir)) {
    fs.copyFileSync(path.join(avatarsSrcDir, f), path.join(avatarsDistDir, f));
  }
}

// Multer for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsSrcDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${req.params.id}${ext}`);
  },
});
const avatarUpload = multer({ storage: avatarStorage });

// ─── Agents ───
app.get('/api/agents', (req, res) => {
  const agents = db.prepare('SELECT * FROM agents').all();
  res.json(agents);
});

// ─── Avatar Upload ───
app.post('/api/agents/:id/avatar', avatarUpload.single('avatar'), (req, res) => {
  const agentId = req.params.id;
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (!allowedMimes.includes(req.file.mimetype)) {
    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch(e) {}
    return res.status(400).json({ error: 'Only image files allowed' });
  }

  const ext = path.extname(req.file.originalname) || '.jpg';
  const avatarUrl = `/avatars/${agentId}${ext}`;

  // Copy to dist/avatars too
  const distPath = path.join(avatarsDistDir, `${agentId}${ext}`);
  fs.copyFileSync(req.file.path, distPath);

  // Update DB
  db.prepare('UPDATE agents SET avatar_url = ? WHERE id = ?').run(avatarUrl, agentId);
  const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  res.json(updated);
});

// ─── Stats ───
app.get('/api/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM tasks').get().c;
  const active = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status != 'archived'").get().c;
  const byStatus = db.prepare("SELECT status, COUNT(*) as count FROM tasks GROUP BY status").all();
  const byAgent = db.prepare("SELECT agent_id, COUNT(*) as count FROM tasks WHERE status != 'archived' GROUP BY agent_id").all();
  res.json({ total, active, byStatus, byAgent });
});

// ─── Tasks ───
app.get('/api/tasks', (req, res) => {
  const { status, agent_id, search, archived } = req.query;
  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  if (archived === '1') {
    sql += " AND status = 'archived'";
  } else {
    sql += " AND status != 'archived'";
  }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (agent_id) { sql += ' AND agent_id = ?'; params.push(agent_id); }
  if (search) {
    sql += ` AND (
      title LIKE ?
      OR description LIKE ?
      OR instructions LIKE ?
      OR id IN (
        SELECT task_id FROM activity_log
        WHERE details LIKE ? OR action LIKE ?
      )
    )`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY created_at DESC';

  const tasks = db.prepare(sql).all(...params);
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title, description, instructions, status, agent_id, template_id, scheduled_for } = req.body;
  if (!title || !agent_id) return res.status(400).json({ error: 'title and agent_id required' });
  const result = db.prepare(
    'INSERT INTO tasks (title, description, instructions, status, agent_id, template_id, scheduled_for) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(title, description || null, instructions || null, status || 'scheduled', agent_id, template_id || null, scheduled_for || null);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);

  // Log activity
  db.prepare('INSERT INTO activity_log (task_id, agent_id, action, details) VALUES (?, ?, ?, ?)').run(
    task.id, agent_id, 'created', `Task created: ${title}`
  );

  res.status(201).json(task);
});

app.get('/api/tasks/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Not found' });
  res.json(task);
});

app.put('/api/tasks/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { title, description, instructions, status, agent_id, scheduled_for } = req.body;
  const newTitle = title ?? existing.title;
  const newDesc = description ?? existing.description;
  const newInstr = instructions ?? existing.instructions;
  const newStatus = status ?? existing.status;
  const newAgent = agent_id ?? existing.agent_id;
  const newScheduled = scheduled_for ?? existing.scheduled_for;
  const archivedAt = newStatus === 'archived' && existing.status !== 'archived' ? new Date().toISOString() : existing.archived_at;

  db.prepare(
    'UPDATE tasks SET title=?, description=?, instructions=?, status=?, agent_id=?, scheduled_for=?, archived_at=?, updated_at=datetime(\'now\') WHERE id=?'
  ).run(newTitle, newDesc, newInstr, newStatus, newAgent, newScheduled, archivedAt, req.params.id);

  // Log status change
  if (status && status !== existing.status) {
    db.prepare('INSERT INTO activity_log (task_id, agent_id, action, details) VALUES (?, ?, ?, ?)').run(
      req.params.id, newAgent, 'status_changed', `Status changed from ${existing.status} to ${status}`
    );
  }
  if (agent_id && agent_id !== existing.agent_id) {
    db.prepare('INSERT INTO activity_log (task_id, agent_id, action, details) VALUES (?, ?, ?, ?)').run(
      req.params.id, agent_id, 'assigned', `Reassigned to ${agent_id}`
    );
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM activity_log WHERE task_id = ?').run(req.params.id);
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// ─── Templates ───
app.get('/api/templates', (req, res) => {
  const templates = db.prepare(`
    SELECT t.*, COUNT(tk.id) as task_count
    FROM templates t
    LEFT JOIN tasks tk ON tk.template_id = t.id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `).all();
  res.json(templates);
});

app.post('/api/templates', (req, res) => {
  const { title, description, instructions, agent_id } = req.body;
  if (!title || !agent_id) return res.status(400).json({ error: 'title and agent_id required' });
  const result = db.prepare(
    'INSERT INTO templates (title, description, instructions, agent_id) VALUES (?, ?, ?, ?)'
  ).run(title, description || null, instructions || null, agent_id);
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(template);
});

app.get('/api/templates/:id', (req, res) => {
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Not found' });
  res.json(template);
});

app.put('/api/templates/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { title, description, instructions, agent_id } = req.body;
  db.prepare('UPDATE templates SET title=?, description=?, instructions=?, agent_id=? WHERE id=?').run(
    title ?? existing.title, description ?? existing.description, instructions ?? existing.instructions, agent_id ?? existing.agent_id, req.params.id
  );
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  res.json(template);
});

app.delete('/api/templates/:id', (req, res) => {
  const result = db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// ─── Recurring ───
app.get('/api/recurring', (req, res) => {
  const items = db.prepare('SELECT * FROM recurring ORDER BY created_at DESC').all();
  res.json(items);
});

app.post('/api/recurring', (req, res) => {
  const { title, cron_expr, timezone, template_id, agent_id, active, next_run } = req.body;
  if (!title || !cron_expr || !agent_id) return res.status(400).json({ error: 'title, cron_expr, agent_id required' });
  const result = db.prepare(
    'INSERT INTO recurring (title, cron_expr, timezone, template_id, agent_id, active, next_run) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(title, cron_expr, timezone || 'Europe/Berlin', template_id || null, agent_id, active ?? 1, next_run || null);
  const item = db.prepare('SELECT * FROM recurring WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(item);
});

app.get('/api/recurring/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM recurring WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

app.put('/api/recurring/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM recurring WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { title, cron_expr, timezone, template_id, agent_id, active, next_run } = req.body;
  db.prepare(
    'UPDATE recurring SET title=?, cron_expr=?, timezone=?, template_id=?, agent_id=?, active=?, next_run=? WHERE id=?'
  ).run(
    title ?? existing.title, cron_expr ?? existing.cron_expr, timezone ?? existing.timezone,
    template_id ?? existing.template_id, agent_id ?? existing.agent_id, active ?? existing.active,
    next_run ?? existing.next_run, req.params.id
  );
  const item = db.prepare('SELECT * FROM recurring WHERE id = ?').get(req.params.id);
  res.json(item);
});

app.delete('/api/recurring/:id', (req, res) => {
  const result = db.prepare('DELETE FROM recurring WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// ─── Cron Cache ───
let cronCache = { data: null, expiresAt: 0 };

function getCronListCached(fresh = false) {
  const now = Date.now();
  if (!fresh && cronCache.data && now < cronCache.expiresAt) {
    return cronCache.data;
  }
  const output = execSync('openclaw cron list --json', { encoding: 'utf-8', timeout: 15000 });
  const data = JSON.parse(output);
  cronCache = { data, expiresAt: now + 30000 }; // 30s cache
  return data;
}

function invalidateCronCache() {
  cronCache = { data: null, expiresAt: 0 };
}

// Pre-warm cache on startup
try { getCronListCached(); console.log('📋 Cron cache pre-warmed'); } catch(e) { console.warn('Cron pre-warm failed:', e.message); }

// ─── Cron (OpenClaw) ───
app.get('/api/cron', (req, res) => {
  try {
    const fresh = req.query.fresh === '1';
    const data = getCronListCached(fresh);
    const jobs = (data.jobs || []).map(job => ({
      id: job.id,
      name: job.name,
      enabled: job.enabled,
      schedule: job.schedule,
      sessionTarget: job.sessionTarget,
      lastStatus: job.state?.lastStatus || null,
      lastRunAt: job.state?.lastRunAtMs ? new Date(job.state.lastRunAtMs).toISOString() : null,
      nextRunAt: job.state?.nextRunAtMs ? new Date(job.state.nextRunAtMs).toISOString() : null,
      lastDurationMs: job.state?.lastDurationMs || null,
      consecutiveErrors: job.state?.consecutiveErrors || 0,
      createdAt: job.createdAtMs ? new Date(job.createdAtMs).toISOString() : null,
      payload: job.payload?.text || job.payload?.message || '',
    }));
    res.json(jobs);
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch cron jobs: ' + e.message });
  }
});

app.get('/api/cron/:id', (req, res) => {
  try {
    const fresh = req.query.fresh === '1';
    const data = getCronListCached(fresh);
    const job = (data.jobs || []).find(j => j.id === req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({
      id: job.id,
      name: job.name,
      description: job.description || '',
      enabled: job.enabled,
      schedule: job.schedule,
      sessionTarget: job.sessionTarget,
      agentId: job.agentId,
      model: job.model || null,
      wakeMode: job.wakeMode || 'now',
      lastStatus: job.state?.lastStatus || null,
      lastRunAt: job.state?.lastRunAtMs ? new Date(job.state.lastRunAtMs).toISOString() : null,
      nextRunAt: job.state?.nextRunAtMs ? new Date(job.state.nextRunAtMs).toISOString() : null,
      lastDurationMs: job.state?.lastDurationMs || null,
      consecutiveErrors: job.state?.consecutiveErrors || 0,
      createdAt: job.createdAtMs ? new Date(job.createdAtMs).toISOString() : null,
      updatedAt: job.updatedAtMs ? new Date(job.updatedAtMs).toISOString() : null,
      payload: job.payload?.text || job.payload?.message || '',
      payloadRaw: job.payload || {},
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Runs cache per job (60s TTL)
const runsCache = {};
app.get('/api/cron/:id/runs', (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid job ID' });
    const limit = parseInt(req.query.limit) || 20;
    const cacheKey = `${req.params.id}:${limit}`;
    const now = Date.now();
    const cached = runsCache[cacheKey];
    if (cached && now < cached.expiresAt && !req.query.fresh) {
      return res.json(cached.data);
    }
    const output = execSync(`openclaw cron runs --id ${req.params.id} --limit ${limit}`, { encoding: 'utf-8', timeout: 30000 });
    const data = JSON.parse(output);
    runsCache[cacheKey] = { data, expiresAt: now + 60000 }; // 60s cache
    res.json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/cron/:id', (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid job ID' });
    const { name, schedule, timezone, message, description, model, session } = req.body;
    const args = [];
    if (name) args.push(`--name "${sanitizeShellArg(name)}"`);
    if (schedule) args.push(`--cron "${sanitizeShellArg(schedule)}"`);
    if (timezone) args.push(`--tz "${sanitizeShellArg(timezone)}"`);
    if (message) args.push(`--message "${sanitizeShellArg(message)}"`);
    if (description) args.push(`--description "${sanitizeShellArg(description)}"`);
    if (model) args.push(`--model "${sanitizeShellArg(model)}"`);
    if (session) args.push(`--session "${sanitizeShellArg(session)}"`);

    if (args.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const cmd = `openclaw cron edit ${req.params.id} ${args.join(' ')}`;
    execSync(cmd, { encoding: 'utf-8', timeout: 15000 });
    invalidateCronCache();
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/cron/:id/run', (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid job ID' });
    execSync(`openclaw cron run ${req.params.id}`, { encoding: 'utf-8', timeout: 15000 });
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/cron/:id/enable', (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid job ID' });
    execSync(`openclaw cron enable ${req.params.id}`, { encoding: 'utf-8', timeout: 10000 });
    invalidateCronCache();
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/cron/:id/disable', (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid job ID' });
    execSync(`openclaw cron disable ${req.params.id}`, { encoding: 'utf-8', timeout: 10000 });
    invalidateCronCache();
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/cron/:id', (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid job ID' });
    execSync(`openclaw cron rm ${req.params.id}`, { encoding: 'utf-8', timeout: 10000 });
    invalidateCronCache();
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Activity Log ───
app.get('/api/activity/:taskId', (req, res) => {
  const logs = db.prepare('SELECT * FROM activity_log WHERE task_id = ? ORDER BY created_at DESC').all(req.params.taskId);
  res.json(logs);
});

// ─── Environment Variables ───
app.get('/api/env', (req, res) => {
  try {
    const configPath = path.join(process.env.HOME || '/root', '.openclaw', 'openclaw.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const vars = config?.env?.vars || {};
    // Return keys with masked values
    const masked = {};
    for (const [key, value] of Object.entries(vars)) {
      const v = String(value);
      masked[key] = v.length > 8 ? v.slice(0, 4) + '•'.repeat(Math.min(v.length - 8, 20)) + v.slice(-4) : '••••••••';
    }
    res.json({ vars: masked, count: Object.keys(vars).length });
  } catch(e) {
    res.status(500).json({ error: 'Failed to read config: ' + e.message });
  }
});

app.get('/api/env/:key', (req, res) => {
  try {
    if (!isValidEnvKey(req.params.key)) return res.status(400).json({ error: 'Invalid key name' });
    const configPath = path.join(process.env.HOME || '/root', '.openclaw', 'openclaw.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const value = config?.env?.vars?.[req.params.key];
    if (value === undefined) return res.status(404).json({ error: 'Key not found' });
    res.json({ key: req.params.key, value: String(value) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/env/:key', (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined || value === null) return res.status(400).json({ error: 'value required' });
    const key = req.params.key;
    if (!isValidEnvKey(key)) return res.status(400).json({ error: 'Invalid key name' });
    const safeValue = String(value).replace(/[;&|`$(){}!<>\\]/g, '');
    // Use openclaw config set for safe writing
    execSync(`openclaw config set "env.vars.${key}" "${safeValue.replace(/"/g, '\\"')}"`, { encoding: 'utf-8', timeout: 10000 });
    res.json({ success: true, key });
  } catch(e) {
    res.status(500).json({ error: 'Failed to save: ' + e.message });
  }
});

app.delete('/api/env/:key', (req, res) => {
  try {
    if (!isValidEnvKey(req.params.key)) return res.status(400).json({ error: 'Invalid key name' });
    execSync(`openclaw config unset "env.vars.${req.params.key}"`, { encoding: 'utf-8', timeout: 10000 });
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Failed to delete: ' + e.message });
  }
});

// ─── Docs / Editor ───
const DOCS_ROOT = '/root/clawd';

function getFileTree(dir, basePath = '') {
  const items = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const excluded = ['node_modules', '.git', 'dist', '__pycache__', '.openclaw', '.cache', '.npm', '.config', '.local'];
    for (const entry of entries) {
      if (excluded.includes(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.gitignore') continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(basePath, entry.name);
      if (entry.isDirectory()) {
        const children = getFileTree(fullPath, relPath);
        if (children.length > 0) {
          items.push({ name: entry.name, path: relPath, type: 'dir', children });
        }
      } else if (/\.(md|txt|json|yml|yaml|sh|js|ts|css)$/i.test(entry.name)) {
        try {
          const stat = fs.statSync(fullPath);
          items.push({ name: entry.name, path: relPath, type: 'file', size: stat.size, modified: stat.mtime });
        } catch(e) {}
      }
    }
  } catch(e) {}
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return items;
}

app.get('/api/docs/tree', (req, res) => {
  res.json(getFileTree(DOCS_ROOT));
});

app.get('/api/docs/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath || filePath.includes('..') || path.isAbsolute(filePath)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  const fullPath = path.join(DOCS_ROOT, filePath);
  // Resolve symlinks and verify path is within DOCS_ROOT
  try {
    const resolved = fs.realpathSync(fullPath);
    if (!resolved.startsWith(DOCS_ROOT)) {
      return res.status(403).json({ error: 'Access denied' });
    }
  } catch(e) {
    return res.status(404).json({ error: 'File not found' });
  }
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const stat = fs.statSync(fullPath);
    res.json({ path: filePath, content, modified: stat.mtime, size: stat.size });
  } catch(e) {
    res.status(404).json({ error: 'File not found' });
  }
});

app.put('/api/docs/file', (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath || filePath.includes('..') || path.isAbsolute(filePath)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  const fullPath = path.join(DOCS_ROOT, filePath);
  // Ensure parent dir is within DOCS_ROOT
  const parentDir = path.dirname(fullPath);
  try {
    const resolvedParent = fs.realpathSync(parentDir);
    if (!resolvedParent.startsWith(DOCS_ROOT)) {
      return res.status(403).json({ error: 'Access denied' });
    }
  } catch(e) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  try {
    fs.writeFileSync(fullPath, content, 'utf-8');
    const stat = fs.statSync(fullPath);
    res.json({ path: filePath, modified: stat.mtime, size: stat.size, saved: true });
  } catch(e) {
    res.status(500).json({ error: 'Failed to save: ' + e.message });
  }
});

// ─── Webinar KPIs ───
const KIT_API_KEY = process.env.KIT_API_KEY;
const WEBINAR_TAG_ID = '17399376'; // Webinar #3 (02.04.2026)
const WEBINAR_DATE = new Date('2026-04-02T08:00:00Z'); // 10:00 CEST
const WEBINAR_GOAL = 200;

let webinarCache = { data: null, expiresAt: 0 };

async function fetchKitSubscribers() {
  const now = Date.now();
  if (webinarCache.data && now < webinarCache.expiresAt) {
    return webinarCache.data;
  }

  if (!KIT_API_KEY) {
    return { error: 'KIT_API_KEY not set', subscribers: [], total: 0 };
  }

  const allSubscribers = [];
  let cursor = null;
  let hasMore = true;

  while (hasMore) {
    const url = cursor
      ? `https://api.kit.com/v4/tags/${WEBINAR_TAG_ID}/subscribers?per_page=500&after=${cursor}`
      : `https://api.kit.com/v4/tags/${WEBINAR_TAG_ID}/subscribers?per_page=500`;

    const resp = await fetch(url, {
      headers: { 'X-Kit-Api-Key': KIT_API_KEY, 'Accept': 'application/json' },
    });
    if (!resp.ok) {
      return { error: `Kit API error: ${resp.status}`, subscribers: [], total: 0 };
    }
    const data = await resp.json();
    allSubscribers.push(...(data.subscribers || []));
    hasMore = data.pagination?.has_next_page || false;
    cursor = data.pagination?.end_cursor || null;
  }

  const result = { subscribers: allSubscribers, total: allSubscribers.length };
  webinarCache = { data: result, expiresAt: now + 120000 }; // 2min cache
  return result;
}

app.get('/api/webinar/stats', async (req, res) => {
  try {
    if (req.query.fresh === '1') {
      webinarCache = { data: null, expiresAt: 0 };
    }
    const data = await fetchKitSubscribers();
    if (data.error) {
      return res.status(500).json({ error: data.error });
    }

    const now = new Date();
    const msLeft = WEBINAR_DATE.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    const remaining = Math.max(0, WEBINAR_GOAL - data.total);
    const dailyPaceNeeded = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining;
    const progressPct = Math.min(100, Math.round((data.total / WEBINAR_GOAL) * 100));

    // Group registrations by day
    const byDay = {};
    for (const sub of data.subscribers) {
      const day = (sub.tagged_at || sub.created_at || '').slice(0, 10);
      if (day) {
        byDay[day] = (byDay[day] || 0) + 1;
      }
    }
    // Sort days
    const dailyData = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Calculate trend (avg per day over last 7 days with registrations)
    const recentDays = dailyData.slice(-7);
    const avgPerDay = recentDays.length > 0
      ? recentDays.reduce((s, d) => s + d.count, 0) / recentDays.length
      : 0;
    const projectedTotal = daysLeft > 0
      ? Math.round(data.total + avgPerDay * daysLeft)
      : data.total;

    // Milestones
    const milestones = [
      { label: '50 Anmeldungen', target: 50, reached: data.total >= 50 },
      { label: '100 Anmeldungen', target: 100, reached: data.total >= 100 },
      { label: '150 Anmeldungen', target: 150, reached: data.total >= 150 },
      { label: '200 Anmeldungen', target: 200, reached: data.total >= 200 },
    ];

    // Past webinars comparison
    const pastWebinars = [
      { label: 'Webinar #1 (8. Feb)', total: 46 },
      { label: 'Webinar #2 (5. Mär)', total: 103 },
    ];
    const webinar1 = { total: 46, label: 'Webinar #1 (8. Feb)' }; // backward compat

    res.json({
      total: data.total,
      goal: WEBINAR_GOAL,
      daysLeft,
      dailyPaceNeeded,
      progressPct,
      projectedTotal,
      avgPerDay: Math.round(avgPerDay * 10) / 10,
      dailyData,
      milestones,
      webinar1,
      pastWebinars,
      webinarDate: '2026-04-02T10:00:00+02:00',
      lastUpdated: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Version ───
app.get('/api/version', (req, res) => {
  try {
    const versionFile = path.join(__dirname, '..', 'VERSION');
    const version = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf-8').trim() : 'unknown';

    // Get latest remote version from GitHub
    let latestVersion = null;
    try {
      const remote = execSync('git ls-remote --tags https://github.com/ernstneumeister/vip-mission-control.git 2>/dev/null | tail -1', { encoding: 'utf-8', timeout: 5000 }).trim();
      // Fallback: read remote VERSION file
      if (!remote) {
        const remoteVersion = execSync('curl -sf https://raw.githubusercontent.com/ernstneumeister/vip-mission-control/main/VERSION 2>/dev/null', { encoding: 'utf-8', timeout: 5000 }).trim();
        if (remoteVersion) latestVersion = remoteVersion;
      }
    } catch(e) {}

    // Get local git info
    let lastCommit = null;
    let lastCommitDate = null;
    try {
      lastCommit = execSync('git log -1 --format="%h %s" 2>/dev/null', { encoding: 'utf-8', timeout: 3000, cwd: path.join(__dirname, '..') }).trim();
      lastCommitDate = execSync('git log -1 --format="%ci" 2>/dev/null', { encoding: 'utf-8', timeout: 3000, cwd: path.join(__dirname, '..') }).trim();
    } catch(e) {}

    res.json({
      version,
      latestVersion,
      updateAvailable: latestVersion && latestVersion !== version ? true : false,
      lastCommit,
      lastCommitDate,
      repoUrl: 'https://github.com/ernstneumeister/vip-mission-control',
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 Mission Control running on http://0.0.0.0:${PORT}`);
});
