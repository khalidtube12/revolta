import { dbGet, dbSet } from './db.service';
import type { Task, User, Meeting, Idea } from '../types';
import { MEETING_POINTS } from './meetings.service';

export const POINTS_BY_TYPE: Record<string, number> = {
  x_content:      200,
  short:          400,
  video:          600,
  writing:        200,
  design:         200,
  podcast:        200,
  event_coverage: 200,
};

export function getDefaultPoints(type: string | undefined): number {
  if (!type) return 0;
  return POINTS_BY_TYPE[type] ?? 0;
}

function getTaskYearMonth(task: Task): string {
  if (task.deadline) return task.deadline.substring(0, 7);
  const d = new Date(task.createdAt);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function isEarned(task: Task): boolean {
  const completed = task.status === 'published' || task.status === 'done' || task.done === true;
  if (task.isBonus) return completed && task.pointsApproved === true;
  return completed;
}

export interface MemberMonthlyBreakdown {
  x_content: number;
  short: number;
  video: number;
  writing: number;
  design: number;
  podcast: number;
  event_coverage: number;
  bonus: number;
  meetings: number;
  ideas: number;
  total: number;
}

const POINTS_START_MONTH = '2026-09';

export function calculateMemberMonthlyPoints(
  userId: string,
  tasks: Task[],
  month: string,
  meetings?: Meeting[],
  ideas?: Idea[],
): MemberMonthlyBreakdown {
  const breakdown: MemberMonthlyBreakdown = {
    x_content: 0, short: 0, video: 0, writing: 0, design: 0, podcast: 0, event_coverage: 0, bonus: 0, meetings: 0, ideas: 0, total: 0,
  };

  if (month < POINTS_START_MONTH) return breakdown;

  for (const t of tasks) {
    if (!isEarned(t)) continue;
    if (getTaskYearMonth(t) !== month) continue;

    const base = t.points ?? getDefaultPoints(t.type);
    const bonusAmt = t.bonusPoints ?? 0;

    // عضو رئيسي (memberId)
    if (t.memberId === userId) {
      const typeKey = (t.type ?? '') as keyof MemberMonthlyBreakdown;
      if (typeKey in breakdown && typeKey !== 'bonus' && typeKey !== 'meetings' && typeKey !== 'total') {
        (breakdown[typeKey] as number) += base;
      }
      breakdown.bonus += bonusAmt;
      breakdown.total += base + bonusAmt;
    }

    // عضو تيم في شورت/مقطع/بودكاست (teamMemberIds) — يأخذ نفس النقاط كاملة
    if ((t.type === 'video' || t.type === 'podcast' || t.type === 'short' || t.type === 'event_coverage') && t.teamMemberIds?.includes(userId)) {
      const typeKey = t.type as keyof MemberMonthlyBreakdown;
      (breakdown[typeKey] as number) += base;
      breakdown.total += base;
    }

    // منتج الشورت +100 / المقطع أو البودكاست +200
    if ((t.type === 'video' || t.type === 'podcast' || t.type === 'short' || t.type === 'event_coverage') && t.producerId === userId) {
      const producerBonus = (t.type === 'short' || t.type === 'event_coverage') ? 100 : 200;
      breakdown.bonus += producerBonus;
      breakdown.total += producerBonus;
    }
  }

  if (meetings) {
    for (const m of meetings) {
      if (!m.attendees?.[userId]) continue;
      const meetingMonth = m.date.substring(0, 7);
      if (meetingMonth !== month) continue;
      breakdown.meetings += MEETING_POINTS;
      breakdown.total += MEETING_POINTS;
    }
  }

  if (ideas) {
    for (const idea of ideas) {
      if (idea.createdBy !== userId) continue;
      const ideaMonth = new Date(idea.createdAt).toISOString().substring(0, 7);
      if (ideaMonth !== month) continue;
      breakdown.ideas += 200;
      breakdown.total += 200;
    }
    for (const t of tasks) {
      if (!isEarned(t) || !t.linkedIdeaId) continue;
      const idea = ideas.find(i => i.id === t.linkedIdeaId);
      if (!idea || idea.createdBy !== userId) continue;
      // نسب بونص التنفيذ لشهر إنشاء الفكرة (لا موعد المهمة)
      const ideaMonth = new Date(idea.createdAt).toISOString().substring(0, 7);
      const creditMonth = ideaMonth < POINTS_START_MONTH ? POINTS_START_MONTH : ideaMonth;
      if (creditMonth !== month) continue;
      breakdown.ideas += 50;
      breakdown.total += 50;
    }
  }

  return breakdown;
}

export interface LeaderboardEntry {
  user: User;
  breakdown: MemberMonthlyBreakdown;
  rank: number;
}

export function buildLeaderboard(
  tasks: Task[],
  users: User[],
  month: string,
  meetings?: Meeting[],
  ideas?: Idea[],
): LeaderboardEntry[] {
  const entries = users.map(user => ({
    user,
    breakdown: calculateMemberMonthlyPoints(user.id, tasks, month, meetings, ideas),
    rank: 0,
  }));

  entries.sort((a, b) => b.breakdown.total - a.breakdown.total);

  let rank = 1;
  entries.forEach((e, i) => {
    if (i > 0 && e.breakdown.total === entries[i - 1].breakdown.total) {
      e.rank = entries[i - 1].rank;
    } else {
      e.rank = rank;
    }
    rank++;
  });

  return entries;
}

export interface MonthPrizes {
  first?: string;
  second?: string;
  third?: string;
}

export async function loadMonthPrizes(month: string): Promise<MonthPrizes> {
  const data = await dbGet<MonthPrizes>(`prizes/${month}`);
  return data ?? {};
}

export async function saveMonthPrizes(month: string, prizes: MonthPrizes): Promise<void> {
  await dbSet(`prizes/${month}`, prizes);
}
