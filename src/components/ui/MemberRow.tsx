import { Avatar } from './Avatar';
import type { User, Task } from '../../types';
import { getStatus } from '../../utils/status';

interface MemberRowProps {
  member: User;
  tasks: Task[];
  onClick: () => void;
}

export function MemberRow({ member, tasks, onClick }: MemberRowProps) {
  const memberTasks = tasks.filter(t => t.memberId === member.id);
  const active = memberTasks.filter(t => getStatus(t) !== 'cancelled');
  const done = active.filter(t => t.done).length;
  const pct = active.length ? Math.round(done / active.length * 100) : 0;

  return (
    <div className="member-row" onClick={onClick}>
      <Avatar user={member} />
      <div className="member-info">
        <div className="member-name">{member.name}</div>
        <div className="member-sub">{member.jobRole}</div>
      </div>
      <div className="prog-wrap">
        <div className="prog-lbl">
          <span>{done}/{active.length}</span>
          <span>{pct}%</span>
        </div>
        <div className="prog-bar">
          <div className="prog-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
