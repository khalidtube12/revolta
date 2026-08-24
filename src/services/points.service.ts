import { dbGet, dbSet } from './db.service';
import type { Task, User, Meeting } from '../types';
import { MEETING_POINTS } from './meetings.service';

export const POINTS_BY_TYPE: Record<string, number> = {
  x_content: 200,
  short:     400,
  video:     600,
  writing:   200,
  design:    200,
  podcast:   200,
};

export function getDefaultPoints(type: string | undefined): number {
  if (!type) return 0;
  return POINTS_BY_TYPE[type] ?? 0;
}

function getTaskYearMonth(task: Task): string {
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
  bonus: number;
  meetings: number;
  total: number;
}

const POINTS_START_MONTH = '2026-09';

export function calculateMemberMonthlyPoints(
  userId: string,
  tasks: Task[],
  month: string,
  meetings?: Meeting[],
): MemberMonthlyBreakdown {
  const breakdown: MemberMonthlyBreakdown = {
    x_content: 0, short: 0, video: 0, writing: 0, design: 0, podcast: 0, bonus: 0, meetings: 0, total: 0,
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

    // عضو تيم في مقطع/بودكاست (teamMemberIds) — يأخذ نفس النقاط كاملة
    if ((t.type === 'video' || t.type === 'podcast') && t.teamMemberIds?.includes(userId)) {
      const typeKey = t.type as keyof MemberMonthlyBreakdown;
      (breakdown[typeKey] as number) += base;
      breakdown.total += base;
    }

    // منتج المقطع أو البودكاست — +200 نقطة إضافية
    if ((t.type === 'video' || t.type === 'podcast') && t.producerId === userId) {
      breakdown.bonus += 200;
      breakdown.total += 200;
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
): LeaderboardEntry[] {
  const entries = users.map(user => ({
    user,
    breakdown: calculateMemberMonthlyPoints(user.id, tasks, month, meetings),
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
