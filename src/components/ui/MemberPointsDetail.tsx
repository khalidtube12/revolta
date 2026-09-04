import type { Task } from '../../types';

function getTaskMonth(t: Task): string {
  if (t.deadline) return t.deadline.substring(0, 7);
  return new Date(t.createdAt).toISOString().substring(0, 7);
}

function getTeamIds(t: Task): string[] {
  return Array.isArray(t.teamMemberIds)
    ? t.teamMemberIds
    : Object.values(t.teamMemberIds || {});
}

function isEarned(t: Task): boolean {
  const done = t.status === 'published' || t.status === 'done' || t.done === true;
  if (t.isBonus) return done && t.pointsApproved === true;
  return done;
}

function getProducerBonus(t: Task): number {
  const teamIds = getTeamIds(t);
  const isMulti = teamIds.length > 0 || t.producerId !== t.memberId;
  if (!isMulti) return 0;
  return t.type === 'short' ? 400 : t.type === 'video' ? 500 : 0;
}

const POINTS_BY_TYPE: Record<string, number> = {
  x_content: 200, short: 400, video: 600,
  writing: 200, design: 200, podcast: 200, event_coverage: 200,
};

const TYPE_AR: Record<string, string> = {
  short: 'شورت', video: 'مقطع', writing: 'كتابة',
  x_content: 'محتوى X', podcast: 'بودكاست',
  design: 'تصميم', event_coverage: 'تغطية',
};

const STATUS_AR: Record<string, string> = {
  pending: 'قيد التنفيذ', ready: 'جاهز',
  done: 'تمت', published: 'منشور', cancelled: 'ملغي',
};

interface TaskRowProps {
  task: Task;
  role: 'owner' | 'team' | 'producer';
  pts: number;
}

function TaskRow({ task, role, pts }: TaskRowProps) {
  const earned = isEarned(task);
  const status = task.status || (task.done ? 'done' : 'pending');
  const roleAr = role === 'owner' ? 'مالك' : role === 'team' ? 'شريك تيم' : 'ممنتج';
  return (
    <div className="mpd-task-row">
      <span className="mpd-type">{TYPE_AR[task.type ?? ''] ?? task.type}</span>
      <span className="mpd-title">{task.title}</span>
      <span className={`mpd-role mpd-role-${role}`}>{roleAr}</span>
      <span className="mpd-pts" style={{ color: earned ? 'var(--gold)' : 'var(--muted)' }}>
        {role === 'producer' ? '+' : ''}{pts} نقطة
      </span>
      <span className="mpd-status" style={{ color: earned ? 'var(--green2)' : 'var(--muted)' }}>
        {STATUS_AR[status] ?? status}
        {!earned && ' — لم تُحتسب'}
      </span>
    </div>
  );
}

interface Props {
  userId: string;
  tasks: Task[];
  month: string;
}

export function MemberPointsDetail({ userId, tasks, month }: Props) {
  const monthTasks = tasks.filter(t => getTaskMonth(t) === month);

  const ownedTasks = monthTasks.filter(t => t.memberId === userId);

  const teamTasks = monthTasks.filter(t =>
    t.memberId !== userId && getTeamIds(t).includes(userId)
  );

  const producerTasks = monthTasks.filter(t =>
    t.producerId === userId && getProducerBonus(t) > 0
  );

  const earnedOwned    = ownedTasks.filter(isEarned).reduce((s, t) => s + (t.points ?? POINTS_BY_TYPE[t.type ?? ''] ?? 0), 0);
  const earnedTeam     = teamTasks.filter(isEarned).reduce((s, t) => s + (t.points ?? POINTS_BY_TYPE[t.type ?? ''] ?? 0), 0);
  const earnedProducer = producerTasks.filter(isEarned).reduce((s, t) => s + getProducerBonus(t), 0);

  const hasAny = ownedTasks.length + teamTasks.length + producerTasks.length > 0;

  if (!hasAny) return <div className="mpd-empty">لا توجد مهام لهذا الشهر</div>;

  return (
    <div className="mpd-wrap">
      {ownedTasks.length > 0 && (
        <div className="mpd-group">
          <div className="mpd-group-label mpd-label-owner">
            مهام المالك
            <span className="mpd-group-total">{earnedOwned} نقطة محتسبة</span>
          </div>
          {ownedTasks.map(t => (
            <TaskRow key={t.id} task={t} role="owner"
              pts={t.points ?? POINTS_BY_TYPE[t.type ?? ''] ?? 0} />
          ))}
        </div>
      )}

      {teamTasks.length > 0 && (
        <div className="mpd-group">
          <div className="mpd-group-label mpd-label-team">
            مشاركة في تيم
            <span className="mpd-group-total">{earnedTeam} نقطة محتسبة</span>
          </div>
          {teamTasks.map(t => (
            <TaskRow key={t.id} task={t} role="team"
              pts={t.points ?? POINTS_BY_TYPE[t.type ?? ''] ?? 0} />
          ))}
        </div>
      )}

      {producerTasks.length > 0 && (
        <div className="mpd-group">
          <div className="mpd-group-label mpd-label-producer">
            إنتاج (ممنتج)
            <span className="mpd-group-total">+{earnedProducer} نقطة محتسبة</span>
          </div>
          {producerTasks.map(t => (
            <TaskRow key={t.id} task={t} role="producer" pts={getProducerBonus(t)} />
          ))}
        </div>
      )}
    </div>
  );
}
