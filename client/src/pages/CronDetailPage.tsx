import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { CronJobDetail, CronRunEntry, CronRunHistory } from '../types';
import { getCronJob, getCronRuns, updateCronJob, triggerCronRun, enableCronJob, disableCronJob, deleteCronJob } from '../api';
import Modal from '../components/Modal';

export default function CronDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<CronJobDetail | null>(null);
  const [runs, setRuns] = useState<CronRunHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [runsLoading, setRunsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedRun, setExpandedRun] = useState<number | null>(null);

  const loadJob = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await getCronJob(id);
      setJob(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load cron job');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadRuns = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getCronRuns(id);
      setRuns(data);
    } catch (e: any) {
      setRuns({ entries: [], total: 0, hasMore: false });
    } finally {
      setRunsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadJob();
    loadRuns();
  }, [loadJob, loadRuns]);

  const handleToggle = async () => {
    if (!job || !id) return;
    setActionLoading(true);
    try {
      if (job.enabled) {
        await disableCronJob(id);
      } else {
        await enableCronJob(id);
      }
      await loadJob();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunNow = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await triggerCronRun(id);
      setTimeout(() => {
        loadJob();
        loadRuns();
      }, 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm(`Delete cron job "${job?.name}"?`)) return;
    setActionLoading(true);
    try {
      await deleteCronJob(id);
      navigate('/tasks');
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const formatBerlinDate = (iso: string | null): string => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
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

  const formatTokens = (usage?: CronRunEntry['usage']): string => {
    if (!usage) return '—';
    return `${usage.input_tokens.toLocaleString()} in / ${usage.output_tokens.toLocaleString()} out / ${usage.total_tokens.toLocaleString()} total`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="py-12 text-center text-[14px] text-muted-foreground">Loading cron job...</div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/tasks')} className="text-[14px] text-primary hover:opacity-80 mb-4">
          ← Back to Recurring
        </button>
        <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-[13px] text-red-700 dark:text-red-300">
          {error || 'Job not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1200px]">
      {/* Top section */}
      <div className="mb-6">
        <button onClick={() => navigate('/tasks')} className="text-[14px] text-primary hover:opacity-80 mb-3 inline-block">
          ← Back to Recurring
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-bold text-foreground">{job.name}</h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold ${
              job.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {job.enabled ? '● Enabled' : '○ Disabled'}
            </span>
            {job.consecutiveErrors > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                ⚠ {job.consecutiveErrors} error{job.consecutiveErrors > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowEdit(true)}
              className="h-[36px] px-4 bg-card border border-border hover:bg-secondary text-foreground text-[13px] font-medium rounded-lg transition-colors"
            >
              ✏️ Edit
            </button>
            <button
              onClick={handleToggle}
              disabled={actionLoading}
              className={`h-[36px] px-4 border text-[13px] font-medium rounded-lg transition-colors ${
                job.enabled
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300'
              } ${actionLoading ? 'opacity-50' : ''}`}
            >
              {job.enabled ? '⏸ Pause' : '▶️ Resume'}
            </button>
            <button
              onClick={handleRunNow}
              disabled={actionLoading}
              className={`h-[36px] px-4 bg-primary hover:opacity-90 text-primary-foreground text-[13px] font-semibold rounded-lg transition-colors ${actionLoading ? 'opacity-50' : ''}`}
            >
              🚀 Run Now
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className={`h-[36px] px-4 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:border-red-800 dark:text-red-400 text-[13px] font-medium rounded-lg transition-colors ${actionLoading ? 'opacity-50' : ''}`}
            >
              🗑 Delete
            </button>
          </div>
        </div>
        {job.description && (
          <p className="text-[14px] text-muted-foreground mt-2">{job.description}</p>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Schedule card */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Schedule</h3>
          <div className="space-y-2">
            <div>
              <span className="text-[12px] text-muted-foreground">Cron Expression</span>
              <div className="text-[14px] font-mono text-foreground bg-secondary px-2 py-1 rounded mt-0.5">{job.schedule?.expr || '—'}</div>
            </div>
            <div>
              <span className="text-[12px] text-muted-foreground">Timezone</span>
              <div className="text-[14px] text-foreground">{job.schedule?.tz || '—'}</div>
            </div>
            <div>
              <span className="text-[12px] text-muted-foreground">Next Run</span>
              <div className="text-[14px] text-foreground">{formatBerlinDate(job.nextRunAt)}</div>
            </div>
            <div>
              <span className="text-[12px] text-muted-foreground">Created</span>
              <div className="text-[14px] text-foreground">{formatBerlinDate(job.createdAt)}</div>
            </div>
          </div>
        </div>

        {/* Last Run card */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Last Run</h3>
          <div className="space-y-2">
            <div>
              <span className="text-[12px] text-muted-foreground">Time</span>
              <div className="text-[14px] text-foreground">{formatBerlinDate(job.lastRunAt)}</div>
            </div>
            <div>
              <span className="text-[12px] text-muted-foreground">Status</span>
              <div className="mt-0.5">
                {job.lastStatus ? (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${
                    job.lastStatus === 'ok' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {job.lastStatus}
                  </span>
                ) : (
                  <span className="text-[14px] text-muted-foreground">—</span>
                )}
              </div>
            </div>
            <div>
              <span className="text-[12px] text-muted-foreground">Duration</span>
              <div className="text-[14px] text-foreground">{formatDuration(job.lastDurationMs)}</div>
            </div>
            <div>
              <span className="text-[12px] text-muted-foreground">Updated</span>
              <div className="text-[14px] text-foreground">{formatBerlinDate(job.updatedAt)}</div>
            </div>
          </div>
        </div>

        {/* Configuration card */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Configuration</h3>
          <div className="space-y-2">
            <div>
              <span className="text-[12px] text-muted-foreground">Session Target</span>
              <div className="text-[14px] text-foreground">{job.sessionTarget || '—'}</div>
            </div>
            <div>
              <span className="text-[12px] text-muted-foreground">Agent</span>
              <div className="text-[14px] text-foreground">{job.agentId || '—'}</div>
            </div>
            <div>
              <span className="text-[12px] text-muted-foreground">Model Override</span>
              <div className="text-[14px] text-foreground">{job.model || 'Default'}</div>
            </div>
            <div>
              <span className="text-[12px] text-muted-foreground">Wake Mode</span>
              <div className="text-[14px] text-foreground">{job.wakeMode || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Payload */}
      {job.payload && (
        <div className="bg-card border border-border rounded-xl p-4 mb-8">
          <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Message / Payload</h3>
          <div className="text-[13px] text-foreground bg-secondary p-3 rounded-lg whitespace-pre-wrap font-mono">
            {job.payload}
          </div>
        </div>
      )}

      {/* Run History */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-foreground">
            Run History
            {runs && <span className="text-[14px] font-normal text-muted-foreground ml-2">({runs.total} total)</span>}
          </h2>
          <button
            onClick={() => { setRunsLoading(true); loadRuns(); }}
            className="text-[13px] text-primary hover:opacity-80 font-medium"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {runsLoading ? (
        <div className="py-8 text-center text-[14px] text-muted-foreground">Loading run history...</div>
      ) : !runs || runs.entries.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-8 text-center text-[14px] text-muted-foreground">
          No run history available
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {runs.entries.map((run, idx) => {
            const isExpanded = expandedRun === idx;
            const hasDetails = run.summary || run.error;
            return (
              <div
                key={idx}
                className={`${idx < runs.entries.length - 1 ? 'border-b border-border/50' : ''}`}
              >
                <div
                  className={`px-4 py-3 hover:bg-secondary transition-colors ${hasDetails ? 'cursor-pointer' : ''}`}
                  onClick={() => hasDetails && setExpandedRun(isExpanded ? null : idx)}
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-[13px] text-foreground font-medium min-w-[160px]">
                      {run.runAtMs ? formatBerlinDate(new Date(run.runAtMs).toISOString()) : formatBerlinDate(new Date(run.ts).toISOString())}
                    </div>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                      run.status === 'ok' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {run.status}
                    </span>

                    <span className="text-[12px] text-muted-foreground">
                      {formatDuration(run.durationMs)}
                    </span>

                    {(run.model || run.provider) && (
                      <span className="text-[12px] text-muted-foreground">
                        {[run.model, run.provider].filter(Boolean).join(' · ')}
                      </span>
                    )}

                    {run.usage && (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {formatTokens(run.usage)}
                      </span>
                    )}

                    {run.deliveryStatus && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        run.deliveryStatus === 'delivered' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {run.deliveryStatus}
                      </span>
                    )}

                    {hasDetails && (
                      <span className="text-[12px] text-muted-foreground ml-auto">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    )}
                  </div>
                </div>

                {isExpanded && hasDetails && (
                  <div className="px-4 pb-3 ml-4">
                    {run.summary && (
                      <div className="bg-secondary p-3 rounded-lg text-[12px] text-foreground whitespace-pre-wrap mb-2">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase">Summary</span>
                        <div className="mt-1">{run.summary}</div>
                      </div>
                    )}
                    {run.error && (
                      <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg text-[12px] text-red-700 dark:text-red-300 whitespace-pre-wrap">
                        <span className="text-[11px] font-semibold text-red-500 uppercase">Error</span>
                        <div className="mt-1">{run.error}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && job && (
        <EditCronModal
          job={job}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            loadJob();
          }}
        />
      )}
    </div>
  );
}

function EditCronModal({ job, onClose, onSaved }: { job: CronJobDetail; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(job.name);
  const [cronExpr, setCronExpr] = useState(job.schedule?.expr || '');
  const [timezone, setTimezone] = useState(job.schedule?.tz || 'Europe/Berlin');
  const [message, setMessage] = useState(job.payload || '');
  const [description, setDescription] = useState(job.description || '');
  const [model, setModel] = useState(job.model || '');
  const [session, setSession] = useState(job.sessionTarget || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, any> = {};
      if (name !== job.name) data.name = name;
      if (cronExpr !== (job.schedule?.expr || '')) data.schedule = cronExpr;
      if (timezone !== (job.schedule?.tz || '')) data.timezone = timezone;
      if (message !== (job.payload || '')) data.message = message;
      if (description !== (job.description || '')) data.description = description;
      if (model !== (job.model || '')) data.model = model;
      if (session !== (job.sessionTarget || '')) data.session = session;

      if (Object.keys(data).length > 0) {
        await updateCronJob(job.id, data);
      }
      onSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full h-[36px] px-3 border border-border rounded-lg bg-card text-[13px] text-foreground outline-none focus:border-primary';
  const textareaClass = 'w-full px-3 py-2 border border-border rounded-lg bg-card text-[13px] text-foreground outline-none focus:border-primary resize-none';

  return (
    <Modal open={true} onClose={onClose} title="Edit Cron Job">
      <div className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-foreground mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-[13px] font-medium text-foreground mb-1">Cron Expression</label>
            <input value={cronExpr} onChange={(e) => setCronExpr(e.target.value)} className={`${inputClass} font-mono`} />
          </div>
          <div className="flex-1">
            <label className="block text-[13px] font-medium text-foreground mb-1">Timezone</label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputClass}>
              <option value="Europe/Berlin">Europe/Berlin</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-foreground mb-1">Message / Payload</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className={textareaClass} />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-foreground mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={textareaClass} />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-[13px] font-medium text-foreground mb-1">Model Override</label>
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Leave empty for default" className={inputClass} />
          </div>
          <div className="flex-1">
            <label className="block text-[13px] font-medium text-foreground mb-1">Session Target</label>
            <input value={session} onChange={(e) => setSession(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="px-4 py-2 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground text-[13px] font-semibold rounded-lg">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
