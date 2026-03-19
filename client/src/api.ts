import type { Agent, Task, Template, Recurring, ActivityLog, CronJob, CronJobDetail, CronRunHistory } from './types';

const BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Agents
export const getAgents = () => fetchJSON<Agent[]>('/agents');

// Stats
export const getStats = () => fetchJSON<any>('/stats');

// Tasks
export const getTasks = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchJSON<Task[]>(`/tasks${qs}`);
};
export const getTask = (id: number) => fetchJSON<Task>(`/tasks/${id}`);
export const createTask = (data: Partial<Task>) =>
  fetchJSON<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) });
export const updateTask = (id: number, data: Partial<Task>) =>
  fetchJSON<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTask = (id: number) =>
  fetchJSON<{ success: boolean }>(`/tasks/${id}`, { method: 'DELETE' });

// Templates
export const getTemplates = () => fetchJSON<Template[]>('/templates');
export const getTemplate = (id: number) => fetchJSON<Template>(`/templates/${id}`);
export const createTemplate = (data: Partial<Template>) =>
  fetchJSON<Template>('/templates', { method: 'POST', body: JSON.stringify(data) });
export const updateTemplate = (id: number, data: Partial<Template>) =>
  fetchJSON<Template>(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTemplate = (id: number) =>
  fetchJSON<{ success: boolean }>(`/templates/${id}`, { method: 'DELETE' });

// Recurring
export const getRecurring = () => fetchJSON<Recurring[]>('/recurring');
export const createRecurring = (data: Partial<Recurring>) =>
  fetchJSON<Recurring>('/recurring', { method: 'POST', body: JSON.stringify(data) });
export const updateRecurring = (id: number, data: Partial<Recurring>) =>
  fetchJSON<Recurring>(`/recurring/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRecurring = (id: number) =>
  fetchJSON<{ success: boolean }>(`/recurring/${id}`, { method: 'DELETE' });

// Cron (OpenClaw)
export const getCronJobs = () => fetchJSON<CronJob[]>('/cron');
export const enableCronJob = (id: string) => fetchJSON<{success: boolean}>(`/cron/${id}/enable`, { method: 'POST' });
export const disableCronJob = (id: string) => fetchJSON<{success: boolean}>(`/cron/${id}/disable`, { method: 'POST' });
export const deleteCronJob = (id: string) => fetchJSON<{success: boolean}>(`/cron/${id}`, { method: 'DELETE' });
export const getCronJob = (id: string) => fetchJSON<CronJobDetail>(`/cron/${id}`);
export const getCronRuns = (id: string, limit = 20) => fetchJSON<CronRunHistory>(`/cron/${id}/runs?limit=${limit}`);
export const updateCronJob = (id: string, data: Record<string, any>) => fetchJSON<{success: boolean}>(`/cron/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const triggerCronRun = (id: string) => fetchJSON<{success: boolean}>(`/cron/${id}/run`, { method: 'POST' });

// Activity
export const getActivity = (taskId: number) => fetchJSON<ActivityLog[]>(`/activity/${taskId}`);

// Docs
export const getDocTree = () => fetchJSON<any[]>('/docs/tree');
export const getDocFile = (filePath: string) =>
  fetchJSON<{ path: string; content: string; modified: string; size: number }>(
    `/docs/file?path=${encodeURIComponent(filePath)}`
  );
export const saveDocFile = (filePath: string, content: string) =>
  fetchJSON<{ saved: boolean; modified: string; size: number }>('/docs/file', {
    method: 'PUT',
    body: JSON.stringify({ path: filePath, content }),
  });

// Webinar
export const getWebinarStats = (fresh = false) => {
  const qs = fresh ? '?fresh=1' : '';
  return fetchJSON<any>(`/webinar/stats${qs}`);
};

// Avatar upload
export const uploadAgentAvatar = async (agentId: string, file: File): Promise<Agent> => {
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await fetch(`${BASE}/agents/${agentId}/avatar`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
};
