import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { CronJobDetail, CronRunEntry, CronRunHistory } from '../types';
import { getCronJob, getCronRuns, updateCronJob, triggerCronRun, enableCronJob, disableCronJob, deleteCronJob } from '../api';
import { Edit, Pause, Play, Rocket, Trash, RefreshCw, ArrowLeft } from '../components/Icons';

// --- Helpers ---

function formatBerlinDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Berlin',
  }) + ' Uhr';
}

function formatScheduleText(time: string, dom: string, mon: string, dow: string): string {
  if (dom === '*' && mon === '*' && dow === '*') {
    return `Täglich um ${time} Uhr`;
  }
  if (dom === '*' && mon === '*' && dow !== '*') {
    const days: Record<string, string> = {
      '0': 'Sonntags', '1': 'Montags', '2': 'Dienstags', '3': 'Mittwochs',
      '4': 'Donnerstags', '5': 'Freitags', '6': 'Samstags', '7': 'Sonntags',
    };
    const dowParts = dow.split(',');
    if (dowParts.length > 1) {
      const dayNames = dowParts.map(d => days[d.trim()] || d.trim()).join(', ');
      return `${dayNames} um ${time} Uhr`;
    }
    return `${days[dow] || dow} um ${time} Uhr`;
  }
  return `${time} Uhr (${dom}.${mon} ${dow})`;
}

function cronToReadable(expr: string, tz: string): string {
  const parts = expr.split(' ');
  if (parts.length < 5) return `Cron: ${expr}`;
  const [min, hour, dom, mon, dow] = parts;
  const h = parseInt(hour);
  const m = parseInt(min);

  if (isNaN(h) || isNaN(m)) return `Cron: ${expr}`;

  if (tz === 'UTC') {
    const now = new Date();
    const utcDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    const berlinStr = utcDate.toLocaleString('de-DE', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
    });
    return formatScheduleText(berlinStr, dom, mon, dow);
  }

  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return formatScheduleText(timeStr, dom, mon, dow);
}

function formatDuration(ms: number | null): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
}

function formatTokens(usage?: CronRunEntry['usage']): string {
  if (!usage) return '—';
  return `${usage.input_tokens.toLocaleString()} in / ${usage.output_tokens.toLocaleString()} out / ${usage.total_tokens.toLocaleString()} total`;
}

// --- Component ---

export default function CronDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<CronJobDetail | null>(null);
  const [runs, setRuns] = useState<CronRunHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [runsLoading, setRunsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedRun, setExpandedRun] = useState<number | null>(null);

  // Inline edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCron, setEditCron] = useState('');
  const [editTz, setEditTz] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editSession, setEditSession] = useState('');
  const [saving, setSaving] = useState(false);

  // Advanced toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const startEditing = () => {
    if (!job) return;
    setEditName(job.name);
    setEditCron(job.schedule?.expr || '');
    setEditTz(job.schedule?.tz || 'Europe/Berlin');
    setEditMessage(job.payload || '');
    setEditModel(job.model || '');
    setEditSession(job.sessionTarget || '');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    if (!job || !id) return;
    setSaving(true);
    try {
      const data: Record<string, any> = {};
      if (editName !== job.name) data.name = editName;
      if (editCron !== (job.schedule?.expr || '')) data.schedule = editCron;
      if (editTz !== (job.schedule?.tz || '')) data.timezone = editTz;
      if (editMessage !== (job.payload || '')) data.message = editMessage;
      if (editModel !== (job.model || '')) data.model = editModel;
      if (editSession !== (job.sessionTarget || '')) data.session = editSession;

      if (Object.keys(data).length > 0) {
        await updateCronJob(job.id, data);
      }
      setEditing(false);
      await loadJob();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

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
      navigate('/tasks?tab=recurring');
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const inputClass = 'w-full h-[36px] px-3 border border-border rounded-lg bg-card text-[14px] text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30';
  const textareaClass = 'w-full px-3 py-2 border border-border rounded-lg bg-card text-[13px] text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none font-mono';

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
        <button onClick={() => navigate('/tasks?tab=recurring')} className="text-[14px] text-primary hover:opacity-80 mb-4 flex items-center gap-1.5">
          <ArrowLeft size={14} /> Zurück zu Recurring
        </button>
        <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-[13px] text-red-700 dark:text-red-300">
          {error || 'Job not found'}
        </div>
      </div>
    );
  }

  const scheduleReadable = job.schedule?.expr
    ? cronToReadable(job.schedule.expr, job.schedule.tz || 'UTC')
    : '—';

  return (
    <div className="p-6 max-w-[900px]">
      {/* Header with back + action buttons */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/tasks?tab=recurring')} className="text-[14px] text-primary hover:opacity-80 inline-flex items-center gap-1.5">
            <ArrowLeft size={14} /> Zurück zu Recurring
          </button>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving || !editName.trim()}
                  className={`h-[36px] px-5 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground text-[13px] font-semibold rounded-lg transition-colors ${saving ? 'opacity-50' : ''}`}
                >
                  {saving ? 'Speichern...' : 'Speichern'}
                </button>
                <button
                  onClick={cancelEditing}
                  className="h-[36px] px-4 bg-card border border-border hover:bg-secondary text-foreground text-[13px] font-medium rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={startEditing}
                  className="h-[36px] px-4 bg-card border border-border hover:bg-secondary text-foreground text-[13px] font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Edit size={14} /> Edit
                </button>
                <button
                  onClick={handleToggle}
                  disabled={actionLoading}
                  className={`h-[36px] px-4 border text-[13px] font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                    job.enabled
                      ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300'
                  } ${actionLoading ? 'opacity-50' : ''}`}
                >
                  {job.enabled ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}
                </button>
                <button
                  onClick={handleRunNow}
                  disabled={actionLoading}
                  className={`h-[36px] px-4 bg-primary hover:opacity-90 text-primary-foreground text-[13px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${actionLoading ? 'opacity-50' : ''}`}
                >
                  <Rocket size={14} /> Run Now
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className={`h-[36px] px-4 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:border-red-800 dark:text-red-400 text-[13px] font-medium rounded-lg transition-colors flex items-center gap-1.5 ${actionLoading ? 'opacity-50' : ''}`}
                >
                  <Trash size={14} /> Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Job name + status */}
        {editing ? (
          <div className="space-y-4">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={`${inputClass} text-[24px] font-bold h-[48px]`}
              placeholder="Job Name"
              autoFocus
            />
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-[12px] font-medium text-muted-foreground mb-1">Schedule (Cron)</label>
                <input
                  value={editCron}
                  onChange={(e) => setEditCron(e.target.value)}
                  className={`${inputClass} font-mono`}
                  placeholder="0 20 * * *"
                />
              </div>
              <div className="w-[200px]">
                <label className="block text-[12px] font-medium text-muted-foreground mb-1">Timezone</label>
                <select
                  value={editTz}
                  onChange={(e) => setEditTz(e.target.value)}
                  className={inputClass}
                >
                  <option value="Europe/Berlin">Europe/Berlin</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-[28px] font-bold text-foreground">{job.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold ${
                job.enabled
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {job.enabled ? '● Enabled' : '○ Disabled'}
              </span>
              {job.consecutiveErrors > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                  ⚠ {job.consecutiveErrors} error{job.consecutiveErrors > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-[16px] text-muted-foreground">{scheduleReadable}</p>
          </div>
        )}
      </div>

      {/* Info section */}
      {!editing && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground w-[120px]">Next Run</span>
              <span className="text-[14px] text-foreground font-medium">{formatBerlinDate(job.nextRunAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground w-[120px]">Last Run</span>
              <span className="text-[14px] text-foreground font-medium flex items-center gap-2">
                {formatBerlinDate(job.lastRunAt)}
                {job.lastStatus && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                    job.lastStatus === 'ok'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {job.lastStatus === 'ok' ? '✅' : '❌'} {job.lastStatus}
                  </span>
                )}
                {job.lastDurationMs ? (
                  <span className="text-[12px] text-muted-foreground">{formatDuration(job.lastDurationMs)}</span>
                ) : null}
              </span>
            </div>
            {job.model && (
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground w-[120px]">Modell</span>
                <span className="text-[14px] text-foreground font-medium font-mono">{job.model}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payload / Instruction */}
      <div className="mb-6">
        <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Anweisung</h3>
        {editing ? (
          <textarea
            value={editMessage}
            onChange={(e) => setEditMessage(e.target.value)}
            rows={6}
            className={textareaClass}
            placeholder="Nachricht / Payload..."
          />
        ) : (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[13px] text-foreground whitespace-pre-wrap leading-relaxed">
              {job.payload || <span className="text-muted-foreground italic">Keine Anweisung</span>}
            </div>
          </div>
        )}
      </div>

      {/* Model (edit mode only) */}
      {editing && (
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-[12px] font-medium text-muted-foreground mb-1">Modell (optional)</label>
            <input
              value={editModel}
              onChange={(e) => setEditModel(e.target.value)}
              className={inputClass}
              placeholder="Default"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[12px] font-medium text-muted-foreground mb-1">Session Target</label>
            <input
              value={editSession}
              onChange={(e) => setEditSession(e.target.value)}
              className={inputClass}
              placeholder="isolated"
            />
          </div>
        </div>
      )}

      {/* Advanced (view mode) */}
      {!editing && (
        <div className="mb-8">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <span className="text-[11px]">{showAdvanced ? '▼' : '▶'}</span> Erweitert
          </button>
          {showAdvanced && (
            <div className="mt-3 pl-4 border-l-2 border-border space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-muted-foreground w-[140px]">Cron Expression</span>
                <span className="text-[13px] font-mono text-foreground bg-muted px-2 py-0.5 rounded">{job.schedule?.expr || '—'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-muted-foreground w-[140px]">Timezone</span>
                <span className="text-[13px] text-foreground">{job.schedule?.tz || '—'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-muted-foreground w-[140px]">Session Target</span>
                <span className="text-[13px] text-foreground">{job.sessionTarget || '—'}</span>
              </div>
              {job.agentId && (
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-muted-foreground w-[140px]">Agent</span>
                  <span className="text-[13px] text-foreground">{job.agentId}</span>
                </div>
              )}
            </div>
          )}
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
            className="text-[13px] text-primary hover:opacity-80 font-medium flex items-center gap-1.5"
          >
            <RefreshCw size={13} /> Refresh
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
                  className={`px-4 py-3 hover:bg-muted/50 transition-colors ${hasDetails ? 'cursor-pointer' : ''}`}
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
                      <div className="bg-muted p-3 rounded-lg text-[12px] text-foreground whitespace-pre-wrap mb-2">
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
    </div>
  );
}
