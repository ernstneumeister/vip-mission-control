import { useNavigate } from 'react-router-dom';
import type { Task, Agent } from '../types';
import { formatDateTime, getAgentById } from '../utils';
import StatusBadge from './StatusBadge';
import AgentBadge from './AgentBadge';

interface Props {
  task: Task;
  agents: Agent[];
  showAgent?: boolean;
  showStatus?: boolean;
}

export default function TaskCard({ task, agents, showAgent = false, showStatus = false }: Props) {
  const navigate = useNavigate();
  const agent = getAgentById(agents, task.agent_id);

  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="bg-white border border-[#E5E7EB] rounded-[10px] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] mb-2 cursor-pointer hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-[#D1D5DB] transition-all group"
    >
      <div className="text-[13px] font-semibold text-[#111827] group-hover:text-[#2563EB] transition-colors leading-snug">
        {task.title}
      </div>
      {task.description && (
        <div className="text-[12px] text-[#6B7280] mt-1 line-clamp-1">{task.description}</div>
      )}
      <div className="flex items-center gap-2 mt-2">
        {showAgent && agent && (
          <div className="flex items-center gap-1">
            <AgentBadge agent={agent} size="sm" />
            <span className="text-[11px] text-[#6B7280] font-medium">{agent.name}</span>
          </div>
        )}
        {showStatus && <StatusBadge status={task.status} />}
        {task.scheduled_for && (
          <span className="text-[11px] text-[#9CA3AF] ml-auto">{formatDateTime(task.scheduled_for)}</span>
        )}
      </div>
    </div>
  );
}
