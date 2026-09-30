import type { ReactNode } from 'react';
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

type GroupColor = 'owner' | 'team' | 'producer' | 'meetings' | 'ideas';

// ─── Item + card building blocks ───────────────────────────────────────────────

function StatusPill({ earned }: { earned: boolean }) {
  return earned ? (
    <span className="mpd-pill mpd-pill-done">مكتملة</span>
  ) : (
    <span className="mpd-pill mpd-pill-pending">قيد التنفيذ</span>
  );
}

interface DetailItemProps {
  title: string;
  role: string;
  pts: number;
  earned: boolean;
  sub?: string;
  extra?: string;
}

function DetailItem({ title, role, pts, earned, sub, extra }: DetailItemProps) {
  return (
    <div className={`mpd-item${earned ? '' : ' mpd-item-muted'}`}>
      <div className="mpd-item-main">
        <p className="mpd-item-title">{title}</p>
        <p className="mpd-item-role">{role}{sub ? ` · ${sub}` : ''}</p>
      </div>
      <div className="mpd-item-meta">
        <span className="mpd-item-pts">+{pts} نقطة{extra ? ` ${extra}` : ''}</span>
        <StatusPill earned={earned} />
      </div>
    </div>
  );
}

interface DetailCardProps {
  label: string;
  note: string;
  color: GroupColor;
  totalLabel: string;
  wide?: boolean;
  children: ReactNode;
}

function DetailCard({ label, note, color, totalLabel, wide, children }: DetailCardProps) {
  return (
    <div className={`mpd-card mpd-card-${color}${wide ? ' mpd-card-wide' : ''}`}>
      <div className="mpd-card-hdr">
        <p className="mpd-card-label">{label}</p>
        <span className="mpd-card-total">{totalLabel}</span>
      </div>
      <p className="mpd-card-note">{note}</p>
      <div className="mpd-card-items">{children}</div>
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
  memberName?: string;
  monthLabel?: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MemberPointsDetail({ userId, tasks, meetings, ideas, month, memberName, monthLabel }: Props) {
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

  return (
    <div className="mpd-wrap">
      <div className="mpd-heading">
        <span className="mpd-heading-bar" />
        تفاصيل نقاط {memberName ?? 'العضو'}{monthLabel ? ` — ${monthLabel}` : ''}
      </div>

      {!hasAny ? (
        <p className="mpd-empty">لا توجد بيانات لهذا الشهر</p>
      ) : (
        <div className="mpd-grid">
          {ownedTasks.length > 0 && (
            <DetailCard label="🟡 مهام المالك" note="مهام يملكها العضو" color="owner" totalLabel={`${earnedOwned} نقطة محتسبة`}>
              {ownedTasks.map(t => {
                const earned = isEarned(t);
                const pts = t.points ?? POINTS_BY_TYPE[t.type ?? ''] ?? 0;
                const baseType = TYPE_AR[t.type ?? ''] ?? t.type ?? '';
                const status = t.status || (t.done ? 'done' : 'pending');
                return (
                  <DetailItem
                    key={t.id}
                    title={t.title}
                    role={`مالك · ${t.isBonus ? `${baseType} (بونص)` : baseType}`}
                    pts={pts}
                    earned={earned}
                    sub={STATUS_AR[status] ?? status}
                    extra={(t.bonusPoints ?? 0) > 0 ? `(+${t.bonusPoints} مكافأة)` : undefined}
                  />
                );
              })}
            </DetailCard>
          )}

          {producerTasks.length > 0 && (
            <DetailCard label="🟢 إنتاج ممنتج" note="نقاط مونتاج مقطع / شورت" color="producer" totalLabel={`+${earnedProducer} نقطة محتسبة`}>
              {producerTasks.map(t => {
                const earned = isEarned(t);
                const status = t.status || (t.done ? 'done' : 'pending');
                return (
                  <DetailItem
                    key={t.id}
                    title={t.title}
                    role="ممنتج"
                    pts={getProducerBonus(t)}
                    earned={earned}
                    sub={STATUS_AR[status] ?? status}
                  />
                );
              })}
            </DetailCard>
          )}

          {teamTasks.length > 0 && (
            <DetailCard label="🔵 مشاركة في فريق" note="مهام شارك فيها مع غيره" color="team" totalLabel={`${earnedTeam} نقطة محتسبة`}>
              {teamTasks.map(t => {
                const earned = isEarned(t);
                const pts = t.points ?? POINTS_BY_TYPE[t.type ?? ''] ?? 0;
                const baseType = TYPE_AR[t.type ?? ''] ?? t.type ?? '';
                const status = t.status || (t.done ? 'done' : 'pending');
                return (
                  <DetailItem
                    key={t.id}
                    title={t.title}
                    role={`شريك تيم · ${baseType}`}
                    pts={pts}
                    earned={earned}
                    sub={STATUS_AR[status] ?? status}
                  />
                );
              })}
            </DetailCard>
          )}

          {myMeetings.length > 0 && (
            <DetailCard label="🟣 حضور الاجتماعات" note="100 نقطة لكل اجتماع محضور" color="meetings" totalLabel={`${earnedMeetings} نقطة`}>
              {myMeetings.map(m => (
                <DetailItem key={m.id} title={m.title} role="حضور" pts={MEETING_PTS} earned sub={m.date} />
              ))}
            </DetailCard>
          )}

          {myIdeaCredits.length > 0 && (
            <DetailCard
              label="🟠 أفكار"
              note="50 نقطة لكل فكرة نُفّذت واعتُمدت"
              color="ideas"
              totalLabel={`${earnedIdeas} نقطة`}
              wide
            >
              {myIdeaCredits.map(({ task, idea }) => (
                <DetailItem
                  key={task.id}
                  title={task.title}
                  role="مقترح الفكرة"
                  pts={IDEA_PTS}
                  earned
                  sub={TYPE_AR[idea.type] ?? idea.type}
                />
              ))}
            </DetailCard>
          )}
        </div>
      )}
    </div>
  );
}
