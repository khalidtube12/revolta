import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useMembersStore } from '../../stores/membersStore';
import { useTasksStore } from '../../stores/tasksStore';
import { useIdeasStore } from '../../stores/ideasStore';
import { Spinner } from '../../components/ui/Spinner';
import {
  buildLeaderboard,
  loadMonthPrizes,
  saveMonthPrizes,
  type LeaderboardEntry,
  type MonthPrizes,
} from '../../services/points.service';
import { loadAllMeetings } from '../../services/meetings.service';
import type { Meeting } from '../../types';
import './LeaderboardPage.css';

const TYPE_LABELS: Record<string, string> = {
  x_content: 'X',
  short: 'شورت',
  video: 'مقطع',
  writing: 'كتابة',
  design: 'تصميم',
  podcast: 'بودكاست',
  event_coverage: 'تغطية',
};

function getMonthLabel(month: string): string {
  return new Date(month + '-01').toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
}

const POINTS_START_MONTH = '2026-09';

function buildMonthOptions(): { v: string; l: string }[] {
  const opts: { v: string; l: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const v = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (v < POINTS_START_MONTH) break;
    opts.push({ v, l: getMonthLabel(v) });
  }
  if (opts.length === 0 || !opts.find(o => o.v === POINTS_START_MONTH)) {
    opts.push({ v: POINTS_START_MONTH, l: getMonthLabel(POINTS_START_MONTH) });
  }
  return opts;
}

export function LeaderboardPage() {
  const { profile } = useAuthStore();
  const { members, loadMembers } = useMembersStore();
  const { tasks, loadAllTasks } = useTasksStore();
  const { ideas, loadIdeas } = useIdeasStore();
  const isAdmin = !!profile?.isAdmin;

  const now = new Date();
  const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const defaultMonth = currentMonth >= POINTS_START_MONTH ? currentMonth : POINTS_START_MONTH;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [prizes, setPrizes] = useState<MonthPrizes>({});
  const [editingPrizes, setEditingPrizes] = useState(false);
  const [prizeFirst, setPrizeFirst] = useState('');
  const [prizeSecond, setPrizeSecond] = useState('');
  const [prizeThird, setPrizeThird] = useState('');
  const [savingPrizes, setSavingPrizes] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const monthOptions = buildMonthOptions();

  const load = useCallback(async () => {
    setLoading(true);
    const [,, mtgs] = await Promise.all([loadMembers(), loadAllTasks(), loadAllMeetings(), loadIdeas()]);
    setMeetings(mtgs);
    setLoading(false);
  }, [loadMembers, loadAllTasks, loadIdeas]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!loading) {
      setEntries(buildLeaderboard(tasks, members, selectedMonth, meetings, ideas));
    }
  }, [loading, tasks, members, selectedMonth, meetings, ideas]);

  useEffect(() => {
    loadMonthPrizes(selectedMonth).then(p => {
      setPrizes(p);
      setPrizeFirst(p.first ?? '');
      setPrizeSecond(p.second ?? '');
      setPrizeThird(p.third ?? '');
    });
  }, [selectedMonth]);

  const handleSavePrizes = async () => {
    setSavingPrizes(true);
    const updated: MonthPrizes = {
      ...(prizeFirst.trim() ? { first: prizeFirst.trim() } : {}),
      ...(prizeSecond.trim() ? { second: prizeSecond.trim() } : {}),
      ...(prizeThird.trim() ? { third: prizeThird.trim() } : {}),
    };
    await saveMonthPrizes(selectedMonth, updated);
    setPrizes(updated);
    setEditingPrizes(false);
    setSavingPrizes(false);
  };

  if (loading) return <Spinner />;

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const hasPrizes = prizes.first || prizes.second || prizes.third;

  const typeKeys: (keyof typeof TYPE_LABELS)[] = ['x_content', 'short', 'video', 'writing', 'design', 'podcast', 'event_coverage'];

  return (
    <>
      <div className="page-hdr">
        <div className="page-hdr-text">
          <h1>الترتيب الشهري</h1>
          <p>{entries.length} عضو · {getMonthLabel(selectedMonth)}</p>
        </div>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          style={{ fontFamily: 'Cairo, sans-serif', background: 'var(--dark)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px 14px', fontSize: 14 }}
        >
          {monthOptions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </div>

      {/* Podium */}
      {top3.length > 0 && (
        <div className="lb-podium-wrap">
          {/* 2nd */}
          {top3[1] && (
            <div className="lb-podium lb-podium-2">
              <div className="lb-pod-avatar" style={{ background: top3[1].user.color || 'var(--border)' }}>
                {top3[1].user.photoURL
                  ? <img src={top3[1].user.photoURL} alt={top3[1].user.name} />
                  : top3[1].user.name.charAt(0)}
              </div>
              <div className="lb-pod-name">{top3[1].user.name}</div>
              <div className="lb-pod-points">{top3[1].breakdown.total}</div>
              <div className="lb-pod-rank lb-rank-2">2</div>
              <div className="lb-pod-base" style={{ height: 80 }} />
            </div>
          )}
          {/* 1st */}
          <div className="lb-podium lb-podium-1">
            <div className="lb-pod-crown">👑</div>
            <div className="lb-pod-avatar lb-pod-avatar-1" style={{ background: top3[0].user.color || 'var(--border)' }}>
              {top3[0].user.photoURL
                ? <img src={top3[0].user.photoURL} alt={top3[0].user.name} />
                : top3[0].user.name.charAt(0)}
            </div>
            <div className="lb-pod-name">{top3[0].user.name}</div>
            <div className="lb-pod-points lb-pod-points-1">{top3[0].breakdown.total}</div>
            <div className="lb-pod-rank lb-rank-1">1</div>
            <div className="lb-pod-base lb-pod-base-1" style={{ height: 120 }} />
          </div>
          {/* 3rd */}
          {top3[2] && (
            <div className="lb-podium lb-podium-3">
              <div className="lb-pod-avatar" style={{ background: top3[2].user.color || 'var(--border)' }}>
                {top3[2].user.photoURL
                  ? <img src={top3[2].user.photoURL} alt={top3[2].user.name} />
                  : top3[2].user.name.charAt(0)}
              </div>
              <div className="lb-pod-name">{top3[2].user.name}</div>
              <div className="lb-pod-points">{top3[2].breakdown.total}</div>
              <div className="lb-pod-rank lb-rank-3">3</div>
              <div className="lb-pod-base" style={{ height: 60 }} />
            </div>
          )}
        </div>
      )}

      {/* Prizes */}
      {(hasPrizes || isAdmin) && (
        <div className="lb-prizes-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'Oswald, sans-serif', color: 'var(--gold)', margin: 0, fontSize: 16, textTransform: 'uppercase' }}>
              🏆 جوائز الشهر
            </h3>
            {isAdmin && !editingPrizes && (
              <button className="btn btn-xs btn-ghost" onClick={() => setEditingPrizes(true)}>تعديل الجوائز</button>
            )}
          </div>

          {editingPrizes ? (
            <div>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12 }}>🥇 المركز الأول</label>
                <input type="text" value={prizeFirst} onChange={e => setPrizeFirst(e.target.value)} placeholder="اكتب الجائزة..." />
              </div>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12 }}>🥈 المركز الثاني</label>
                <input type="text" value={prizeSecond} onChange={e => setPrizeSecond(e.target.value)} placeholder="اكتب الجائزة..." />
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12 }}>🥉 المركز الثالث</label>
                <input type="text" value={prizeThird} onChange={e => setPrizeThird(e.target.value)} placeholder="اكتب الجائزة..." />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" disabled={savingPrizes} onClick={handleSavePrizes}>
                  {savingPrizes ? <div className="spinner" /> : 'حفظ'}
                </button>
                <button className="btn btn-ghost" onClick={() => setEditingPrizes(false)}>إلغاء</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {prizes.first && <div className="lb-prize-row"><span>🥇</span><span>{prizes.first}</span></div>}
              {prizes.second && <div className="lb-prize-row"><span>🥈</span><span>{prizes.second}</span></div>}
              {prizes.third && <div className="lb-prize-row"><span>🥉</span><span>{prizes.third}</span></div>}
              {!hasPrizes && isAdmin && (
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>لم تُحدَّد جوائز لهذا الشهر بعد</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Full Table */}
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)', fontSize: 14 }}>
          لا توجد بيانات لهذا الشهر
        </div>
      ) : (
        <div className="lb-table-wrap">
          <table className="lb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>العضو</th>
                {typeKeys.map(k => <th key={k}>{TYPE_LABELS[k]}</th>)}
                <th>مكافأة</th>
                <th>حضور</th>
                <th>أفكار</th>
                <th>المجموع</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.user.id} className={e.rank <= 3 ? `lb-row-top lb-row-${e.rank}` : ''}>
                  <td className="lb-rank-cell">
                    {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, background: e.user.color || 'var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden',
                      }}>
                        {e.user.photoURL
                          ? <img src={e.user.photoURL} alt={e.user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : e.user.name.charAt(0)}
                      </div>
                      <span style={{ fontSize: 13 }}>{e.user.name}</span>
                    </div>
                  </td>
                  <td>{e.breakdown.x_content || '—'}</td>
                  <td>{e.breakdown.short || '—'}</td>
                  <td>{e.breakdown.video || '—'}</td>
                  <td>{e.breakdown.writing || '—'}</td>
                  <td>{e.breakdown.design || '—'}</td>
                  <td>{e.breakdown.podcast || '—'}</td>
                  <td>{e.breakdown.event_coverage || '—'}</td>
                  <td>{e.breakdown.bonus || '—'}</td>
                  <td>{e.breakdown.meetings || '—'}</td>
                  <td>{e.breakdown.ideas || '—'}</td>
                  <td className="lb-total-cell">{e.breakdown.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Remaining members below top3 — already in table */}
      {rest.length === 0 && entries.length > 0 && null}
    </>
  );
}
