import { useEffect, useState } from 'react';
import { fetchAllTasks } from '../../services/tasks.service';
import { useMembersStore } from '../../stores/membersStore';
import { Card } from './Card';
import type { Task } from '../../types';
import { getStatus } from '../../utils/status';

const TYPE_LABEL: Record<string, string> = {
  short: 'شورت', video: 'مقطع', writing: 'كتابة', x_content: 'محتوى X', podcast: 'بودكاست', event_coverage: 'تغطية حدث',
};
const TYPE_BADGE: Record<string, string> = {
  short: 'badge-gold', video: 'badge-green', writing: 'badge-gray', x_content: 'badge-red', podcast: 'badge-gold', event_coverage: 'badge-blue',
};

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function TodayContent() {
  const { members, loadMembers } = useMembersStore();
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const today = todayStr();
    Promise.all([fetchAllTasks(), loadMembers()])
      .then(([all]) => {
        setTodayTasks(all.filter(t =>
          t.deadline === today && getStatus(t) !== 'cancelled'
        ));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [loadMembers]);

  if (!ready || todayTasks.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <Card title="📅 محتوى اليوم">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {todayTasks.map(t => {
            const member = members.find(m => m.id === t.memberId);
            const isDone = t.done;
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: isDone ? 'rgba(58,158,101,0.07)' : 'var(--dark)',
                  border: `1px solid ${isDone ? 'rgba(58,158,101,0.3)' : 'var(--border)'}`,
                }}
              >
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: isDone ? 'var(--green)' : 'var(--gold)',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600,
                    color: isDone ? 'var(--muted)' : 'var(--text)',
                    textDecoration: isDone ? 'line-through' : undefined,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {t.title || '—'}
                  </div>
                  {member && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{member.name}</div>}
                </div>
                {t.type && (
                  <span className={`badge ${TYPE_BADGE[t.type] || 'badge-gray'}`} style={{ flexShrink: 0 }}>
                    {TYPE_LABEL[t.type] || t.type}
                  </span>
                )}
                {t.driveLink && (
                  <a href={t.driveLink} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: 'var(--gold)', flexShrink: 0, textDecoration: 'none' }}
                    onClick={e => e.stopPropagation()}>
                    📁 Drive
                  </a>
                )}
                {isDone && <span className="badge badge-green" style={{ flexShrink: 0 }}>✓</span>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
