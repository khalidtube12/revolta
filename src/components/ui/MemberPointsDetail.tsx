import type { Task, Meeting, Idea } from '../../types';

const POINTS_START_MONTH = '2026-09';
const MEETING_PTS = 100;
const IDEA_PTS = 50;

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

// ─── Task row ─────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  role: 'owner' | 'team' | 'producer';
  pts: number;
}

function TaskRow({ task, role, pts }: TaskRowProps) {
  const earned = isEarned(task);
  const status = task.status || (task.done ? 'done' : 'pending');
  const roleAr = role === 'owner' ? 'مالك' : role === 'team' ? 'شريك تيم' : 'ممنتج';
  const baseType = TYPE_AR[task.type ?? ''] ?? task.type ?? '';
  const label = task.isBonus ? `${baseType} (بونص)` : baseType;

  return (
    <div className="mpd-task-row">
      <span className="mpd-type">{label}</span>
      <span className="mpd-title">{task.title}</span>
      <span className={`mpd-role mpd-role-${role}`}>{roleAr}</span>
      <span className="mpd-pts" style={{ color: earned ? 'var(--gold)' : 'var(--muted)' }}>
        {role === 'producer' ? '+' : ''}{pts} نقطة
        {role === 'owner' && (task.bonusPoints ?? 0) > 0 && (
          <span className="mpd-bonus-extra"> +{task.bonusPoints} مكافأة</span>
        )}
      </span>
      <span className="mpd-status" style={{ color: earned ? 'var(--green2)' : 'var(--muted)' }}>
        {STATUS_AR[status] ?? status}
        {!earned && ' — لم تُحتسب'}
      </span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  userId: string;
  tasks: Task[];
  meetings: Meeting[];
  ideas: Idea[];
  month: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MemberPointsDetail({ userId, tasks, meetings, ideas, month }: Props) {
  const monthTasks = tasks.filter(t => getTaskMonth(t) === month);

  // مهام المالك
  const ownedTasks = monthTasks.filter(t => t.memberId === userId);

  // مشاركة في تيم (ليس مالكاً)
  const teamTasks = monthTasks.filter(t =>
    t.memberId !== userId && getTeamIds(t).includes(userId)
  );

  // إنتاج / مونتاج
  const producerTasks = monthTasks.filter(t =>
    t.producerId === userId && getProducerBonus(t) > 0
  );

  // حضور الاجتماعات
  const myMeetings = meetings.filter(m => {
    const mm = m.date.substring(0, 7);
    return mm === month && m.attendees?.[userId];
  });

  // أفكار — نقطة عندما تُسند فكرتك لشخص آخر ويُنجز مهمتها
  // نبحث في كل المهام لأن الشهر يُحدَّد من تاريخ الفكرة وليس deadline المهمة
  const myIdeaCredits: { task: Task; idea: Idea }[] = [];
  for (const t of tasks) {
    if (!isEarned(t) || !t.linkedIdeaId) continue;
    const idea = ideas.find(i => i.id === t.linkedIdeaId);
    if (!idea || idea.createdBy !== userId) continue;
    if (!idea.ownerId || idea.ownerId === userId) continue;
    const ideaMonthRaw = new Date(idea.createdAt).toISOString().substring(0, 7);
    const creditMonth = ideaMonthRaw < POINTS_START_MONTH ? POINTS_START_MONTH : ideaMonthRaw;
    if (creditMonth !== month) continue;
    myIdeaCredits.push({ task: t, idea });
  }

  // مجاميع
  const earnedOwned    = ownedTasks.filter(isEarned).reduce((s, t) => s + (t.points ?? POINTS_BY_TYPE[t.type ?? ''] ?? 0) + (t.bonusPoints ?? 0), 0);
  const earnedTeam     = teamTasks.filter(isEarned).reduce((s, t) => s + (t.points ?? POINTS_BY_TYPE[t.type ?? ''] ?? 0), 0);
  const earnedProducer = producerTasks.filter(isEarned).reduce((s, t) => s + getProducerBonus(t), 0);
  const earnedMeetings = myMeetings.length * MEETING_PTS;
  const earnedIdeas    = myIdeaCredits.length * IDEA_PTS;

  const hasAny = ownedTasks.length + teamTasks.length + producerTasks.length + myMeetings.length + myIdeaCredits.length > 0;

  if (!hasAny) return <div className="mpd-empty">لا توجد بيانات لهذا الشهر</div>;

  return (
    <div className="mpd-wrap">

      {/* مهام المالك */}
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

      {/* مشاركة في تيم */}
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

      {/* إنتاج */}
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

      {/* حضور الاجتماعات */}
      {myMeetings.length > 0 && (
        <div className="mpd-group">
          <div className="mpd-group-label mpd-label-meetings">
            حضور الاجتماعات
            <span className="mpd-group-total">{earnedMeetings} نقطة</span>
          </div>
          {myMeetings.map(m => (
            <div key={m.id} className="mpd-task-row">
              <span className="mpd-type">اجتماع</span>
              <span className="mpd-title">{m.title}</span>
              <span className="mpd-role mpd-role-meetings">حضور</span>
              <span className="mpd-pts" style={{ color: 'var(--gold)' }}>{MEETING_PTS} نقطة</span>
              <span className="mpd-status" style={{ color: 'var(--muted)' }}>{m.date}</span>
            </div>
          ))}
        </div>
      )}

      {/* أفكار */}
      {myIdeaCredits.length > 0 && (
        <div className="mpd-group">
          <div className="mpd-group-label mpd-label-ideas">
            أفكار (فكرتك أُسندت لغيرك)
            <span className="mpd-group-total">{earnedIdeas} نقطة</span>
          </div>
          {myIdeaCredits.map(({ task, idea }) => (
            <div key={task.id} className="mpd-task-row">
              <span className="mpd-type">{TYPE_AR[idea.type] ?? idea.type}</span>
              <span className="mpd-title">{task.title}</span>
              <span className="mpd-role mpd-role-ideas">مقترح الفكرة</span>
              <span className="mpd-pts" style={{ color: 'var(--gold)' }}>+{IDEA_PTS} نقطة</span>
              <span className="mpd-status" style={{ color: 'var(--green2)' }}>مكتملة</span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
