import type { Agent } from '../types';

export default function AgentBadge({ agent, size = 'sm' }: { agent: Agent | undefined; size?: 'sm' | 'md' | 'lg' }) {
  if (!agent) return null;

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-28 h-28',
  };

  const imgRounding = {
    sm: 'rounded-full',
    md: 'rounded-full',
    lg: 'rounded-xl',
  };

  const emojiSizes = {
    sm: 'text-[12px]',
    md: 'text-[18px]',
    lg: 'text-[60px]',
  };

  if (agent.avatar_url) {
    return (
      <img
        src={agent.avatar_url}
        alt={agent.name}
        className={`${sizeClasses[size]} ${imgRounding[size]} object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} ${emojiSizes[size]} rounded-lg flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: agent.color + '18' }}
      title={agent.name}
    >
      {agent.avatar}
    </div>
  );
}
