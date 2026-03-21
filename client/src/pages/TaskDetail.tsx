import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Agent, Task, ActivityLog } from '../types';
import { getTask, updateTask, deleteTask, getActivity, getAgents, uploadAgentAvatar } from '../api';
import AgentBadge from '../components/AgentBadge';
import { Zap } from '../components/Icons';
import { formatDate, formatDateTime, getAgentById, STATUS_LABELS } from '../utils';

interface Props {
  agents: Agent[];
}

export default function TaskDetail({ agents }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    instructions: '',
    agent_id: 'henry',
    status: 'scheduled',
    scheduled_for: '',
  });

  useEffect(() => {
    if (!id) return;
    getTask(Number(id)).then((t) => {
      setTask(t);
      setForm({
        title: t.title,
        description: t.description || '',
        instructions: t.instructions || '',
        agent_id: t.agent_id,
        status: t.status,
        scheduled_for: toDateTimeLocal(t.scheduled_for),
      });
    });
    getActivity(Number(id)).then(setActivity);
  }, [id]);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [currentAgents, setCurrentAgents] = useState<Agent[]>(agents);

  useEffect(() => { setCurrentAgents(agents); }, [agents]);

  const refreshActivity = async (taskId: number) => setActivity(await getActivity(taskId));

  if (!task) {
    return <div className="p-6 text-[14px] text-muted-foreground">Loading...</div>;
  }

  const agent = getAgentById(agents, task.agent_id);

  const currentAgent = getAgentById(currentAgents, task.agent_id) || agent;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentAgent) return;
    try {
      await uploadAgentAvatar(currentAgent.id, file);
      const refreshed = await getAgents();
      setCurrentAgents(refreshed);
    } catch (err) {
      console.error('Avatar upload failed:', err);
    }
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleStatusChange = async (newStatus: string) => {
    const updated = await updateTask(task.id, { status: newStatus } as Partial<Task>);
    setTask(updated);
    setForm((current) => ({ ...current, status: updated.status }));
    await refreshActivity(task.id);
  };

  const handleAgentChange = async (newAgentId: string) => {
    const updated = await updateTask(task.id, { agent_id: newAgentId });
    setTask(updated);
    setForm((current) => ({ ...current, agent_id: updated.agent_id }));
    await refreshActivity(task.id);
  };

  const handleArchive = async () => {
    if (!confirm('Archive this task?')) return;
    await updateTask(task.id, { status: 'archived' } as Partial<Task>);
    navigate('/tasks');
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task permanently?')) return;
    await deleteTask(task.id);
    navigate('/tasks');
  };

  const handleSave = async () => {
    const updated = await updateTask(task.id, {
      title: form.title,
      description: form.description,
      instructions: form.instructions,
      status: form.status as Task['status'],
      agent_id: form.agent_id,
      scheduled_for: form.scheduled_for || null,
    });
    setTask(updated);
    setForm({
      title: updated.title,
      description: updated.description || '',
      instructions: updated.instructions || '',
      agent_id: updated.agent_id,
      status: updated.status,
      scheduled_for: toDateTimeLocal(updated.scheduled_for),
    });
    setEditing(false);
    await refreshActivity(task.id);
  };

  return (
    <div className="p-3 md:p-6 max-w-[1080px]">
      <Link to="/tasks" className="inline-flex items-center gap-1 text-[14px] text-muted-foreground hover:text-foreground no-underline mb-6 transition-colors">
        ← Back to Tasks
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 md:gap-8 items-start">
        <div className="bg-card border border-border rounded-xl p-6">
          {currentAgent && (
            <div className="text-center">
              <div
                className="inline-block cursor-pointer relative group"
                onClick={() => avatarInputRef.current?.click()}
                title="Click to change avatar"
              >
                <AgentBadge agent={currentAgent} size="lg" />
                <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-[13px] font-medium">Change</span>
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <div className="text-[22px] font-bold text-foreground mt-4">{currentAgent.name}</div>
              <div className="text-[14px] text-muted-foreground mt-1">{currentAgent.role}</div>
              <div className="text-[13px] text-muted-foreground mt-1">{currentAgent.model}</div>
            </div>
          )}
        </div>

        <div className="min-w-0">
          {editing ? (
            <input
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              className="w-full text-[28px] font-bold text-foreground border border-border rounded-lg px-3 py-2 bg-card outline-none focus:border-primary mb-3"
            />
          ) : (
            <h1 className="text-[28px] font-bold text-foreground mb-1">{task.title}</h1>
          )}

          {editing ? (
            <textarea
              value={form.description}
              onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg text-[14px] text-foreground bg-card outline-none focus:border-primary resize-none mb-4"
              placeholder="Short description"
            />
          ) : (
            task.description && <p className="text-[14px] text-muted-foreground mb-4">{task.description}</p>
          )}

          {task.scheduled_for && !editing && (
            <p className="text-[13px] text-muted-foreground mb-4">Scheduled for {formatDateTime(task.scheduled_for)}</p>
          )}

          <div className="mb-6">
            <label className="block text-[13px] font-semibold text-foreground mb-2">Instructions</label>
            {editing ? (
              <textarea
                value={form.instructions}
                onChange={(e) => setForm((current) => ({ ...current, instructions: e.target.value }))}
                rows={8}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] bg-card text-foreground outline-none focus:border-primary resize-y"
              />
            ) : (
              <div className="bg-card border border-border rounded-lg p-4 text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                {task.instructions || 'No instructions'}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status</label>
                {editing ? (
                  <select
                    value={form.status}
                    onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}
                    className={inputClass}
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                ) : (
                  <select value={task.status} onChange={(e) => handleStatusChange(e.target.value)} className={inputClass}>
                    {Object.entries(STATUS_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Assigned To</label>
                {editing ? (
                  <select
                    value={form.agent_id}
                    onChange={(e) => setForm((current) => ({ ...current, agent_id: e.target.value }))}
                    className={inputClass}
                  >
                    {agents.map((a) => <option key={a.id} value={a.id}>{a.avatar} {a.name}</option>)}
                  </select>
                ) : (
                  <select value={task.agent_id} onChange={(e) => handleAgentChange(e.target.value)} className={inputClass}>
                    {agents.map((a) => <option key={a.id} value={a.id}>{a.avatar} {a.name}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Scheduled For</label>
                {editing ? (
                  <input
                    type="datetime-local"
                    value={form.scheduled_for}
                    onChange={(e) => setForm((current) => ({ ...current, scheduled_for: e.target.value }))}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-[13px] text-foreground h-[36px] flex items-center">{formatDateTime(task.scheduled_for)}</div>
                )}
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Created</label>
                <div className="text-[13px] text-foreground h-[36px] flex items-center">{formatDate(task.created_at)}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-8 pt-2 border-t border-border/50">
            {editing ? (
              <>
                <button onClick={handleSave} className="text-[13px] font-semibold text-primary hover:opacity-80">Save Changes</button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setForm({
                      title: task.title,
                      description: task.description || '',
                      instructions: task.instructions || '',
                      agent_id: task.agent_id,
                      status: task.status,
                      scheduled_for: toDateTimeLocal(task.scheduled_for),
                    });
                  }}
                  className="text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="text-[13px] font-semibold text-primary hover:opacity-80">Edit task</button>
            )}
            <button onClick={handleArchive} className="text-[13px] text-muted-foreground hover:text-amber-500">Archive task</button>
            <button onClick={handleDelete} className="text-[13px] text-destructive hover:opacity-80">Delete task</button>
          </div>

          <div>
            <h2 className="text-[16px] font-bold text-foreground mb-3">Activity Log</h2>
            {activity.length === 0 ? (
              <div className="text-[13px] text-muted-foreground">No activity recorded</div>
            ) : (
              <div className="bg-card border border-border rounded-xl px-4">
                {activity.map((log, idx) => {
                  const logAgent = log.agent_id ? getAgentById(agents, log.agent_id) : null;
                  return (
                    <div key={log.id} className={`flex gap-3 py-3 ${idx < activity.length - 1 ? 'border-b border-border/50' : ''}`}>
                      <div className="flex-shrink-0 mt-0.5">
                        {logAgent ? (
                          <AgentBadge agent={logAgent} size="sm" />
                        ) : (
                          <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-muted-foreground"><Zap size={12} /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-foreground">{log.details || log.action}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{formatDateTime(log.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function toDateTimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

const inputClass = 'w-full h-[36px] px-3 border border-border rounded-lg bg-card text-[13px] text-foreground outline-none focus:border-primary';
