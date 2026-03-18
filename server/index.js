import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3111;

app.use(cors());
app.use(express.json());

// Serve static client build
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

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

// ─── Activity Log ───
app.get('/api/activity/:taskId', (req, res) => {
  const logs = db.prepare('SELECT * FROM activity_log WHERE task_id = ? ORDER BY created_at DESC').all(req.params.taskId);
  res.json(logs);
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 Mission Control running on http://0.0.0.0:${PORT}`);
});
