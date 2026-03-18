export interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  avatar: string;
  avatar_url?: string;
  color: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  instructions: string | null;
  status: 'scheduled' | 'queue' | 'in_progress' | 'done' | 'archived';
  agent_id: string;
  template_id: number | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface Template {
  id: number;
  title: string;
  description: string | null;
  instructions: string | null;
  agent_id: string;
  created_at: string;
  task_count?: number;
}

export interface Recurring {
  id: number;
  title: string;
  cron_expr: string;
  timezone: string;
  template_id: number | null;
  agent_id: string;
  active: number;
  next_run: string | null;
  created_at: string;
}

export interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: { kind: string; expr: string; tz: string };
  sessionTarget: string;
  lastStatus: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastDurationMs: number | null;
  consecutiveErrors: number;
  createdAt: string | null;
  payload: string;
}

export interface ActivityLog {
  id: number;
  task_id: number;
  agent_id: string | null;
  action: string;
  details: string | null;
  created_at: string;
}
