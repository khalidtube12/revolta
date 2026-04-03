import type { Task, User } from '../../types';
import { STATUS_MAP } from '../../types';
import { getStatus } from '../../utils/status';

interface TaskMiniProps {
  task: Task;
  members: User[];
}

export function TaskMini({ task, members }: TaskMiniProps) {
  const m = members.find(u => u.id === task.memberId);
  const st = getStatus(task);
  const si = STATUS_MAP[st] || STATUS_MAP.pending;
  const isResolved = st !== 'pending';

  return (
    <div className={`task-mini ${isResolved ? 'task-done' : ''}`}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: si.color, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 13, fontWeight: 700,
          textDecoration: (st === 'published' || st === 'cancelled') ? 'line-through' : undefined,
          opacity: (st === 'published' || st === 'cancelled') ? 0.6 : undefined,
        }}>
          {task.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m?.name || 'غير معروف'}</div>
      </div>
      <span className={`badge ${si.badge}`}>{si.label}</span>
    </div>
  );
}
