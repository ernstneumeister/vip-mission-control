import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Agent, Task, Template, Recurring, CronJob } from '../types';
import { getTasks, getTemplates, getRecurring, createTask, createTemplate, createRecurring, updateRecurring, deleteRecurring, deleteTemplate, updateTemplate, createTask as createTaskFromTemplate, getCronJobs, enableCronJob, disableCronJob, deleteCronJob } from '../api';
import TaskCard from '../components/TaskCard';
import StatusBadge from '../components/StatusBadge';
import AgentBadge from '../components/AgentBadge';
import Modal from '../components/Modal';
import { STATUS_LABELS, STATUS_COLORS, cronToHuman, formatShortDate, formatDateTime, getAgentById } from '../utils';

interface Props {
  agents: Agent[];
  searchQuery: string;
}

type SubTab = 'tasks' | 'templates' | 'recurring' | 'archived';
type ViewMode = 'agent' | 'status' | 'list';

export default function TasksPage({ agents, searchQuery }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('tasks');
  const [viewMode, setViewMode] = useState<ViewMode>('agent');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [agentFilter, setAgentFilter] = useState('all');
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [showNewRecurring, setShowNewRecurring] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<Recurring | null>(null);

  const loadData = useCallback(() => {
    const params: Record<string, string> = {};
    if (searchQuery) params.search = searchQuery;
    getTasks(params).then(setTasks);
    getTasks({ archived: '1', ...(searchQuery ? { search: searchQuery } : {}) }).then(setArchivedTasks);
    getTemplates().then(setTemplates);
    getRecurring().then(setRecurring);
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTasks = agentFilter === 'all' ? tasks : tasks.filter((t) => t.agent_id === agentFilter);
  const activeTasks = filteredTasks.filter((t) => t.status !== 'archived');
  const totalCount = tasks.length;
  const activeCount = tasks.filter((t) => t.status !== 'archived').length;

  const subTabs: { key: SubTab; label: string }[] = [
    { key: 'tasks', label: 'Tasks' },
    { key: 'templates', label: 'Templates' },
    { key: 'recurring', label: 'Recurring' },
    { key: 'archived', label: 'Archived' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center border-b border-[#E5E7EB] mb-6">
        {subTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`px-4 py-2.5 text-[14px] font-medium border-b-2 transition-colors -mb-[1px] ${
              subTab === tab.key
                ? 'text-[#2563EB] border-[#2563EB]'
                : 'text-[#6B7280] border-transparent hover:text-[#374151]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'tasks' && (
        <TasksTab
          tasks={activeTasks}
          agents={agents}
          viewMode={viewMode}
          setViewMode={setViewMode}
          agentFilter={agentFilter}
          setAgentFilter={setAgentFilter}
          activeCount={activeCount}
          totalCount={totalCount}
          onNewTask={() => setShowNewTask(true)}
        />
      )}
      {subTab === 'templates' && (
        <TemplatesTab
          templates={templates}
          agents={agents}
          globalSearchQuery={searchQuery}
          onNewTemplate={() => setShowNewTemplate(true)}
          onEditTemplate={setEditingTemplate}
          onRefresh={loadData}
        />
      )}
      {subTab === 'recurring' && (
        <RecurringTab
          recurring={recurring}
          agents={agents}
          globalSearchQuery={searchQuery}
          onNewRecurring={() => setShowNewRecurring(true)}
          onEditRecurring={setEditingRecurring}
          onRefresh={loadData}
        />
      )}
      {subTab === 'archived' && <ArchivedTab tasks={archivedTasks} agents={agents} />}

      <NewTaskModal
        open={showNewTask}
        onClose={() => setShowNewTask(false)}
        agents={agents}
        onCreated={loadData}
      />
      <NewTemplateModal
        open={showNewTemplate}
        onClose={() => setShowNewTemplate(false)}
        agents={agents}
        onCreated={loadData}
      />
      <EditTemplateModal
        open={!!editingTemplate}
        template={editingTemplate}
        onClose={() => setEditingTemplate(null)}
        agents={agents}
        onSaved={() => {
          setEditingTemplate(null);
          loadData();
        }}
      />
      <NewRecurringModal
        open={showNewRecurring}
        onClose={() => setShowNewRecurring(false)}
        agents={agents}
        onCreated={loadData}
      />
      <EditRecurringModal
        open={!!editingRecurring}
        recurring={editingRecurring}
        onClose={() => setEditingRecurring(null)}
        agents={agents}
        onSaved={() => {
          setEditingRecurring(null);
          loadData();
        }}
      />
    </div>
  );
}

function TasksTab({ tasks, agents, viewMode, setViewMode, agentFilter, setAgentFilter, activeCount, totalCount, onNewTask }: {
  tasks: Task[];
  agents: Agent[];
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  agentFilter: string;
  setAgentFilter: (v: string) => void;
  activeCount: number;
  totalCount: number;
  onNewTask: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#111827]">Tasks</h1>
          <p className="text-[14px] text-[#6B7280]">{activeCount} active · {totalCount} total</p>
        </div>
        <div className="flex items-center gap-3">
          {viewMode === 'status' && (
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="h-[36px] px-3 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-[#374151] outline-none"
            >
              <option value="all">All Agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.avatar} {a.name}</option>
              ))}
            </select>
          )}
          <div className="flex border border-[#E5E7EB] rounded-lg overflow-hidden">
            {[
              { mode: 'agent' as ViewMode, icon: '👤', title: 'By Agent' },
              { mode: 'status' as ViewMode, icon: '📊', title: 'By Status' },
              { mode: 'list' as ViewMode, icon: '📋', title: 'List' },
            ].map((v) => (
              <button
                key={v.mode}
                onClick={() => setViewMode(v.mode)}
                title={v.title}
                className={`w-[36px] h-[32px] flex items-center justify-center text-[14px] border-r last:border-r-0 border-[#E5E7EB] transition-colors ${
                  viewMode === v.mode ? 'bg-[#F3F4F6]' : 'bg-white hover:bg-[#F9FAFB]'
                }`}
              >
                {v.icon}
              </button>
            ))}
          </div>
          <button
            onClick={onNewTask}
            className="h-[36px] px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-lg transition-colors"
          >
            + New Task
          </button>
        </div>
      </div>

      {viewMode === 'agent' && <AgentKanban tasks={tasks} agents={agents} />}
      {viewMode === 'status' && <StatusKanban tasks={tasks} agents={agents} />}
      {viewMode === 'list' && <ListView tasks={tasks} agents={agents} />}
    </>
  );
}

function AgentKanban({ tasks, agents }: { tasks: Task[]; agents: Agent[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {agents.map((agent) => {
        const agentTasks = tasks.filter((t) => t.agent_id === agent.id);
        return (
          <div key={agent.id} className="min-w-[260px] w-[260px] bg-white border border-[#E8E8E8] rounded-xl flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F3F4F6]">
              <AgentBadge agent={agent} size="md" />
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-[#111827] truncate">{agent.name}</div>
                <div className="text-[12px] text-[#9CA3AF] truncate">{agent.role}</div>
              </div>
              <span className="text-[14px] text-[#9CA3AF] font-medium">{agentTasks.length}</span>
            </div>
            <div className="p-2 flex-1 overflow-y-auto max-h-[calc(100vh-300px)]">
              {agentTasks.length === 0 && <div className="text-[12px] text-[#9CA3AF] text-center py-6">No tasks</div>}
              {agentTasks.map((task) => <TaskCard key={task.id} task={task} agents={agents} showStatus />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusKanban({ tasks, agents }: { tasks: Task[]; agents: Agent[] }) {
  const statuses: Task['status'][] = ['scheduled', 'queue', 'in_progress', 'done'];
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statuses.map((status) => {
        const statusTasks = tasks.filter((t) => t.status === status);
        return (
          <div key={status} className="min-w-[260px] w-[260px] bg-white border border-[#E8E8E8] rounded-xl flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F3F4F6]">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
              <span className="text-[15px] font-bold text-[#111827] flex-1">{STATUS_LABELS[status]}</span>
              <span className="text-[14px] text-[#9CA3AF] font-medium">{statusTasks.length}</span>
            </div>
            <div className="p-2 flex-1 overflow-y-auto max-h-[calc(100vh-300px)]">
              {statusTasks.length === 0 && <div className="text-[12px] text-[#9CA3AF] text-center py-6">No tasks</div>}
              {statusTasks.map((task) => <TaskCard key={task.id} task={task} agents={agents} showAgent />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ tasks, agents }: { tasks: Task[]; agents: Agent[] }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
            <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">Task</th>
            <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">Agent</th>
            <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">Scheduled</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const agent = getAgentById(agents, task.agent_id);
            return (
              <tr
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="text-[13px] font-semibold text-[#111827]">{task.title}</div>
                  {task.description && <div className="text-[12px] text-[#9CA3AF] mt-0.5 line-clamp-1">{task.description}</div>}
                </td>
                <td className="px-4 py-3">
                  {agent && (
                    <div className="flex items-center gap-1.5">
                      <AgentBadge agent={agent} size="sm" />
                      <span className="text-[13px] text-[#374151]">{agent.name}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                <td className="px-4 py-3 text-[13px] text-[#6B7280]">{formatDateTime(task.scheduled_for)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TemplatesTab({ templates, agents, globalSearchQuery, onNewTemplate, onEditTemplate, onRefresh }: {
  templates: Template[];
  agents: Agent[];
  globalSearchQuery: string;
  onNewTemplate: () => void;
  onEditTemplate: (template: Template) => void;
  onRefresh: () => void;
}) {
  const [templateSearch, setTemplateSearch] = useState(globalSearchQuery);
  const [agentFilter, setAgentFilter] = useState('all');

  useEffect(() => setTemplateSearch(globalSearchQuery), [globalSearchQuery]);

  const filteredTemplates = useMemo(() => {
    const needle = templateSearch.trim().toLowerCase();
    return templates.filter((tpl) => {
      const matchesSearch = !needle || [tpl.title, tpl.description, tpl.instructions].some((value) => (value || '').toLowerCase().includes(needle));
      const matchesAgent = agentFilter === 'all' || tpl.agent_id === agentFilter;
      return matchesSearch && matchesAgent;
    });
  }, [templates, templateSearch, agentFilter]);

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#111827]">Templates</h1>
          <p className="text-[14px] text-[#6B7280]">Reusable blueprints for recurring agent work</p>
        </div>
        <button
          onClick={onNewTemplate}
          className="h-[36px] px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-lg transition-colors"
        >
          + New Template
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          value={templateSearch}
          onChange={(e) => setTemplateSearch(e.target.value)}
          placeholder="Search templates"
          className="h-[36px] w-[280px] px-3 border border-[#E5E7EB] rounded-lg bg-white text-[13px] outline-none focus:border-[#2563EB]"
        />
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="h-[36px] px-3 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-[#374151] outline-none"
        >
          <option value="all">All Agents</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.avatar} {a.name}</option>)}
        </select>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl py-12 text-center text-[14px] text-[#9CA3AF]">No templates found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => {
            const agent = getAgentById(agents, tpl.agent_id);
            return (
              <div key={tpl.id} className="bg-white border border-[#E5E7EB] rounded-[10px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all">
                <div className="text-[15px] font-bold text-[#111827] mb-1">{tpl.title}</div>
                {tpl.description && <div className="text-[13px] text-[#6B7280] line-clamp-2 mb-3">{tpl.description}</div>}
                {tpl.instructions && <div className="text-[12px] text-[#9CA3AF] line-clamp-3 mb-3">{tpl.instructions}</div>}
                <div className="flex items-center justify-between">
                  {agent && (
                    <div className="flex items-center gap-1.5">
                      <AgentBadge agent={agent} size="sm" />
                      <span className="text-[12px] text-[#6B7280] font-medium">{agent.name}</span>
                    </div>
                  )}
                  <span className="text-[12px] text-[#9CA3AF]"># {tpl.task_count || 0} tasks</span>
                </div>
                <div className="flex gap-3 mt-3 pt-3 border-t border-[#F3F4F6]">
                  <button onClick={() => onEditTemplate(tpl)} className="text-[12px] text-[#2563EB] hover:text-[#1D4ED8] font-medium">Edit</button>
                  <button
                    onClick={async () => {
                      await createTaskFromTemplate({
                        title: tpl.title,
                        description: tpl.description || '',
                        instructions: tpl.instructions || '',
                        agent_id: tpl.agent_id,
                        template_id: tpl.id,
                      });
                      onRefresh();
                    }}
                    className="text-[12px] text-[#374151] hover:text-[#111827] font-medium"
                  >
                    Use Template
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('Delete this template?')) {
                        await deleteTemplate(tpl.id);
                        onRefresh();
                      }
                    }}
                    className="text-[12px] text-[#EF4444] hover:text-[#DC2626] font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function RecurringTab({ recurring, agents, globalSearchQuery, onNewRecurring, onEditRecurring, onRefresh }: {
  recurring: Recurring[];
  agents: Agent[];
  globalSearchQuery: string;
  onNewRecurring: () => void;
  onEditRecurring: (item: Recurring) => void;
  onRefresh: () => void;
}) {
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(globalSearchQuery);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => setSearch(globalSearchQuery), [globalSearchQuery]);

  const loadCronJobs = useCallback(async () => {
    try {
      setError(null);
      const jobs = await getCronJobs();
      setCronJobs(jobs);
    } catch (e: any) {
      setError(e.message || 'Failed to load cron jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCronJobs(); }, [loadCronJobs]);

  const filteredJobs = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return cronJobs.filter((job) => !needle || [job.name, job.payload, job.schedule?.expr, job.schedule?.tz].some((v) => (v || '').toLowerCase().includes(needle)));
  }, [cronJobs, search]);

  const handleToggle = async (job: CronJob) => {
    setActionLoading(job.id);
    try {
      if (job.enabled) {
        await disableCronJob(job.id);
      } else {
        await enableCronJob(job.id);
      }
      await loadCronJobs();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (job: CronJob) => {
    if (!confirm(`Delete cron job "${job.name}"?`)) return;
    setActionLoading(job.id);
    try {
      await deleteCronJob(job.id);
      await loadCronJobs();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const formatCronSchedule = (schedule: CronJob['schedule']): string => {
    if (!schedule) return '—';
    const { expr, tz } = schedule;
    const parts = expr.split(' ');
    if (parts.length >= 5) {
      const [min, hour, dom, mon, dow] = parts;
      const h = parseInt(hour);
      const m = parseInt(min);
      if (!isNaN(h) && !isNaN(m) && dom === '*' && mon === '*' && dow === '*') {
        // Daily cron - show in target timezone
        if (tz === 'UTC') {
          // Convert UTC to Europe/Berlin (approx +1/+2)
          const utcDate = new Date();
          utcDate.setUTCHours(h, m, 0, 0);
          const berlinTime = utcDate.toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
          return `Täglich um ${berlinTime} (Europe/Berlin)`;
        }
        return `Täglich um ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }
    return `Cron: ${expr} (${tz})`;
  };

  const formatBerlinDate = (iso: string | null): string => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Berlin',
    });
  };

  const formatDuration = (ms: number | null): string => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#111827]">Recurring Schedules</h1>
          <p className="text-[14px] text-[#6B7280]">Live cron jobs from OpenClaw · {cronJobs.length} total</p>
        </div>
        <button
          onClick={loadCronJobs}
          className="h-[36px] px-4 bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#374151] text-[14px] font-medium rounded-lg transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cron jobs"
          className="h-[36px] w-[280px] px-3 border border-[#E5E7EB] rounded-lg bg-white text-[13px] outline-none focus:border-[#2563EB]"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center text-[14px] text-[#9CA3AF]">Loading cron jobs...</div>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          {filteredJobs.map((job, idx) => (
            <div
              key={job.id}
              className={`px-4 py-4 hover:bg-[#F9FAFB] transition-colors ${
                idx < filteredJobs.length - 1 ? 'border-b border-[#F3F4F6]' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${job.enabled ? 'bg-[#10B981]' : 'bg-[#D1D5DB]'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-[#111827]">{job.name}</div>
                  <div className="text-[13px] text-[#6B7280]">{formatCronSchedule(job.schedule)}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Toggle button */}
                  <button
                    onClick={() => handleToggle(job)}
                    disabled={actionLoading === job.id}
                    title={job.enabled ? 'Pause' : 'Resume'}
                    className={`w-[32px] h-[32px] flex items-center justify-center rounded-lg transition-colors ${
                      job.enabled
                        ? 'text-[#F59E0B] hover:bg-amber-50'
                        : 'text-[#10B981] hover:bg-green-50'
                    } ${actionLoading === job.id ? 'opacity-50' : ''}`}
                  >
                    {job.enabled ? '⏸' : '▶️'}
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(job)}
                    disabled={actionLoading === job.id}
                    title="Delete"
                    className={`w-[32px] h-[32px] flex items-center justify-center rounded-lg text-[#EF4444] hover:bg-red-50 transition-colors ${actionLoading === job.id ? 'opacity-50' : ''}`}
                  >
                    🗑
                  </button>
                </div>
              </div>
              {/* Details row */}
              <div className="flex items-center gap-4 mt-2 ml-[26px] flex-wrap">
                <div className="text-[12px] text-[#9CA3AF]">
                  Next: <span className="text-[#374151]">{formatBerlinDate(job.nextRunAt)}</span>
                </div>
                <div className="text-[12px] text-[#9CA3AF]">
                  Last: <span className="text-[#374151]">{formatBerlinDate(job.lastRunAt)}</span>
                  {job.lastStatus && (
                    <span className={`ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${
                      job.lastStatus === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {job.lastStatus}
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-[#9CA3AF]">
                  Duration: <span className="text-[#374151]">{formatDuration(job.lastDurationMs)}</span>
                </div>
                {job.consecutiveErrors > 0 && (
                  <div className="text-[12px] text-red-500 font-medium">
                    ⚠ {job.consecutiveErrors} consecutive error{job.consecutiveErrors > 1 ? 's' : ''}
                  </div>
                )}
              </div>
              {job.payload && (
                <div className="mt-1.5 ml-[26px] text-[12px] text-[#9CA3AF] line-clamp-1" title={job.payload}>
                  💬 {job.payload}
                </div>
              )}
            </div>
          ))}
          {filteredJobs.length === 0 && !loading && (
            <div className="py-12 text-center text-[14px] text-[#9CA3AF]">No cron jobs found</div>
          )}
        </div>
      )}
    </>
  );
}

function ArchivedTab({ tasks, agents }: { tasks: Task[]; agents: Agent[] }) {
  const navigate = useNavigate();
  return (
    <>
      <h1 className="text-[28px] font-bold text-[#111827] mb-4">Archived Tasks</h1>
      {tasks.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl py-12 text-center text-[14px] text-[#9CA3AF]">No archived tasks</div>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          {tasks.map((task, idx) => {
            const agent = getAgentById(agents, task.agent_id);
            return (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-[#F9FAFB] cursor-pointer transition-colors ${idx < tasks.length - 1 ? 'border-b border-[#F3F4F6]' : ''}`}
              >
                <div className="flex-1">
                  <div className="text-[14px] font-semibold text-[#374151]">{task.title}</div>
                  {task.description && <div className="text-[12px] text-[#9CA3AF] mt-0.5">{task.description}</div>}
                </div>
                {agent && (
                  <div className="flex items-center gap-1">
                    <AgentBadge agent={agent} size="sm" />
                    <span className="text-[12px] text-[#6B7280]">{agent.name}</span>
                  </div>
                )}
                <span className="text-[12px] text-[#9CA3AF]">{formatDateTime(task.archived_at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function NewTaskModal({ open, onClose, agents, onCreated }: { open: boolean; onClose: () => void; agents: Agent[]; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [agentId, setAgentId] = useState('henry');
  const [scheduledFor, setScheduledFor] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setInstructions('');
    setAgentId('henry');
    setScheduledFor('');
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    await createTask({ title, description, instructions, agent_id: agentId, scheduled_for: scheduledFor || undefined } as Partial<Task>);
    setLoading(false);
    reset();
    onClose();
    onCreated();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Task">
      <div className="space-y-4">
        <Field label="Title *"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} /></Field>
        <Field label="Description"><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} /></Field>
        <Field label="Instructions"><textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={4} className={textareaClass} /></Field>
        <div className="flex gap-4">
          <Field label="Agent" className="flex-1">
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className={inputClass}>{agents.map((a) => <option key={a.id} value={a.id}>{a.avatar} {a.name}</option>)}</select>
          </Field>
          <Field label="Scheduled For" className="flex-1">
            <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <ModalActions onClose={onClose} onSubmit={handleSubmit} loading={loading} submitLabel="Create Task" disabled={!title.trim()} />
      </div>
    </Modal>
  );
}

function NewTemplateModal({ open, onClose, agents, onCreated }: { open: boolean; onClose: () => void; agents: Agent[]; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [agentId, setAgentId] = useState('henry');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    await createTemplate({ title, description, instructions, agent_id: agentId });
    setLoading(false);
    setTitle('');
    setDescription('');
    setInstructions('');
    setAgentId('henry');
    onClose();
    onCreated();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Template">
      <div className="space-y-4">
        <Field label="Title *"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} /></Field>
        <Field label="Description"><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} /></Field>
        <Field label="Instructions"><textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={4} className={textareaClass} /></Field>
        <Field label="Agent"><select value={agentId} onChange={(e) => setAgentId(e.target.value)} className={inputClass}>{agents.map((a) => <option key={a.id} value={a.id}>{a.avatar} {a.name}</option>)}</select></Field>
        <ModalActions onClose={onClose} onSubmit={handleSubmit} loading={loading} submitLabel="Create Template" disabled={!title.trim()} />
      </div>
    </Modal>
  );
}

function EditTemplateModal({ open, template, onClose, agents, onSaved }: {
  open: boolean;
  template: Template | null;
  onClose: () => void;
  agents: Agent[];
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [agentId, setAgentId] = useState('henry');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!template) return;
    setTitle(template.title);
    setDescription(template.description || '');
    setInstructions(template.instructions || '');
    setAgentId(template.agent_id);
  }, [template]);

  const handleSubmit = async () => {
    if (!template || !title.trim()) return;
    setLoading(true);
    await updateTemplate(template.id, { title, description, instructions, agent_id: agentId });
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Template">
      <div className="space-y-4">
        <Field label="Title *"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} /></Field>
        <Field label="Description"><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} /></Field>
        <Field label="Instructions"><textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={4} className={textareaClass} /></Field>
        <Field label="Agent"><select value={agentId} onChange={(e) => setAgentId(e.target.value)} className={inputClass}>{agents.map((a) => <option key={a.id} value={a.id}>{a.avatar} {a.name}</option>)}</select></Field>
        <ModalActions onClose={onClose} onSubmit={handleSubmit} loading={loading} submitLabel="Save Changes" disabled={!title.trim()} />
      </div>
    </Modal>
  );
}

function NewRecurringModal({ open, onClose, agents, onCreated }: { open: boolean; onClose: () => void; agents: Agent[]; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [cronExpr, setCronExpr] = useState('0 * * * *');
  const [timezone, setTimezone] = useState('Europe/Berlin');
  const [agentId, setAgentId] = useState('henry');
  const [nextRun, setNextRun] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    await createRecurring({ title, cron_expr: cronExpr, timezone, agent_id: agentId, next_run: nextRun || null });
    setLoading(false);
    setTitle('');
    setCronExpr('0 * * * *');
    setTimezone('Europe/Berlin');
    setAgentId('henry');
    setNextRun('');
    onClose();
    onCreated();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Recurring Schedule">
      <div className="space-y-4">
        <Field label="Title *"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} /></Field>
        <div className="flex gap-4">
          <Field label="Cron Expression *" className="flex-1"><input value={cronExpr} onChange={(e) => setCronExpr(e.target.value)} className={`${inputClass} font-mono`} placeholder="0 6 * * *" /></Field>
          <Field label="Timezone" className="flex-1">
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputClass}>
              <option value="Europe/Berlin">Europe/Berlin</option>
              <option value="UTC">UTC</option>
            </select>
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Agent" className="flex-1"><select value={agentId} onChange={(e) => setAgentId(e.target.value)} className={inputClass}>{agents.map((a) => <option key={a.id} value={a.id}>{a.avatar} {a.name}</option>)}</select></Field>
          <Field label="Next Run" className="flex-1"><input type="datetime-local" value={nextRun} onChange={(e) => setNextRun(e.target.value)} className={inputClass} /></Field>
        </div>
        <ModalActions onClose={onClose} onSubmit={handleSubmit} loading={loading} submitLabel="Create Schedule" disabled={!title.trim()} />
      </div>
    </Modal>
  );
}

function EditRecurringModal({ open, recurring, onClose, agents, onSaved }: {
  open: boolean;
  recurring: Recurring | null;
  onClose: () => void;
  agents: Agent[];
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [cronExpr, setCronExpr] = useState('0 * * * *');
  const [timezone, setTimezone] = useState('Europe/Berlin');
  const [agentId, setAgentId] = useState('henry');
  const [nextRun, setNextRun] = useState('');
  const [active, setActive] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!recurring) return;
    setTitle(recurring.title);
    setCronExpr(recurring.cron_expr);
    setTimezone(recurring.timezone);
    setAgentId(recurring.agent_id);
    setNextRun(toDateTimeLocal(recurring.next_run));
    setActive(recurring.active);
  }, [recurring]);

  const handleSubmit = async () => {
    if (!recurring || !title.trim()) return;
    setLoading(true);
    await updateRecurring(recurring.id, { title, cron_expr: cronExpr, timezone, agent_id: agentId, next_run: nextRun || null, active });
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Recurring Schedule">
      <div className="space-y-4">
        <Field label="Title *"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} /></Field>
        <div className="flex gap-4">
          <Field label="Cron Expression *" className="flex-1"><input value={cronExpr} onChange={(e) => setCronExpr(e.target.value)} className={`${inputClass} font-mono`} /></Field>
          <Field label="Timezone" className="flex-1">
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputClass}>
              <option value="Europe/Berlin">Europe/Berlin</option>
              <option value="UTC">UTC</option>
            </select>
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Agent" className="flex-1"><select value={agentId} onChange={(e) => setAgentId(e.target.value)} className={inputClass}>{agents.map((a) => <option key={a.id} value={a.id}>{a.avatar} {a.name}</option>)}</select></Field>
          <Field label="Next Run" className="flex-1"><input type="datetime-local" value={nextRun} onChange={(e) => setNextRun(e.target.value)} className={inputClass} /></Field>
        </div>
        <Field label="Status">
          <select value={String(active)} onChange={(e) => setActive(Number(e.target.value))} className={inputClass}>
            <option value="1">Active</option>
            <option value="0">Paused</option>
          </select>
        </Field>
        <ModalActions onClose={onClose} onSubmit={handleSubmit} loading={loading} submitLabel="Save Changes" disabled={!title.trim()} />
      </div>
    </Modal>
  );
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[13px] font-medium text-[#374151] mb-1">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ onClose, onSubmit, loading, submitLabel, disabled }: {
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[#6B7280] hover:text-[#374151]">Cancel</button>
      <button onClick={onSubmit} disabled={loading || disabled} className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg">
        {loading ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}

function toDateTimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

const inputClass = 'w-full h-[36px] px-3 border border-[#E5E7EB] rounded-lg text-[13px] outline-none focus:border-[#2563EB]';
const textareaClass = 'w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-[13px] outline-none focus:border-[#2563EB] resize-none';
