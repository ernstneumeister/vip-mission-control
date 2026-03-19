import type { Agent } from './types';

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Europe/Berlin',
  });
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Europe/Berlin' });
  const month = d.toLocaleDateString('en-US', { month: 'numeric', timeZone: 'Europe/Berlin' });
  const day = d.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Europe/Berlin' });
  const hour = d.toLocaleString('en-US', { hour: 'numeric', hour12: true, timeZone: 'Europe/Berlin' }).toLowerCase();
  return `${weekday} ${month}/${day} ${hour}`;
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const hours = Math.round(diff / (1000 * 60 * 60));
  if (hours < 0 && hours > -24) return `${Math.abs(hours)}h ago`;
  if (hours >= 0 && hours < 24) return `in ${hours}h`;
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)}d ago`;
  return `in ${days}d`;
}

export function cronToHuman(cron: string, tz: string): string {
  const parts = cron.split(' ');
  if (parts.length < 5) return cron;
  const [min, hour, , , dow] = parts;
  const h = parseInt(hour);
  const m = parseInt(min);
  const timeStr = `${h > 12 ? h - 12 : h || 12}:${m.toString().padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`;

  const dowMap: Record<string, string> = { '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday' };

  if (dow === '*') return `Every day at ${timeStr} ${tz === 'UTC' ? 'UTC' : 'CET'}`;
  if (dowMap[dow]) return `Every ${dowMap[dow]} at ${timeStr} ${tz === 'UTC' ? 'UTC' : 'CET'}`;
  return `${cron} (${tz})`;
}

export const STATUS_COLORS: Record<string, string> = {
  scheduled: '#6B7280',
  queue: '#3B82F6',
  in_progress: '#F59E0B',
  done: '#10B981',
  archived: '#9CA3AF',
};

export const STATUS_BG: Record<string, string> = {
  scheduled: 'bg-gray-100 text-gray-700',
  queue: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  done: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-gray-100 text-gray-500',
};

export const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  queue: 'Queue',
  in_progress: 'In Progress',
  done: 'Done',
  archived: 'Archived',
};

export function getAgentById(agents: Agent[], id: string): Agent | undefined {
  return agents.find(a => a.id === id);
}
