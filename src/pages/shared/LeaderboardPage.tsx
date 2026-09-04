import { useEffect, useState, useCallback, Fragment } from 'react';
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
import { MemberPointsDetail } from '../../components/ui/MemberPointsDetail';
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

const nf = new Intl.NumberFormat('en-US');

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

function PodiumAvatar({ entry, size, first }: { entry: LeaderboardEntry; size: number; first?: boolean }) {
  const { user } = entry;
  return (
    <div
      className={`lb-pod-avatar${first ? ' lb-pod-avatar-1' : ''}`}
      style={{ width: size, height: size, background: user.color || 'var(--lb-line)' }}
    >
      {user.photoURL
        ? <img src={user.photoURL} alt={user.name} />
        : <span className="lb-pod-avatar-fallback" style={{ fontSize: Math.max(11, Math.round(size * 0.42)) }}>{user.name.charAt(0)}</span>}
    </div>
  );
}

function PodiumSlot({ entry, place }: { entry: LeaderboardEntry; place: 1 | 2 | 3 }) {
  const first = place === 1;
  const total = entry.breakdown.total;
  return (
    <div className={`lb-podium-slot lb-podium-${place}`}>
      <div className="lb-pod-avatar-wrap">
        {first && <span className="lb-pod-crown shimmer-text">♛</span>}
        <PodiumAvatar entry={entry} size={first ? 112 : 84} first={first} />
        {first ? (
          <span className="lb-pod-medal-first">🥇 الأول</span>
        ) : (
          <span className={`lb-pod-medal-sm lb-pod-medal-${place}`}>
            {place === 2 ? '🥈 الثاني' : '🥉 الثالث'}
          </span>
        )}
      </div>
      <h3 className={`lb-pod-name${first ? ' lb-pod-name-1' : ''}`} title={entry.user.name}>
        {entry.user.name}
      </h3>
      <p className={first ? 'lb-pod-points-1 shimmer-text' : 'lb-pod-points'}>{nf.format(total)}</p>
      <p className="lb-pod-unit">نقطة</p>
      <div className={`lb-pod-base lb-pod-base-${place}`} />
    </div>
  );
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
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

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

  const openEditPrizes = () => {
    setPrizeFirst(prizes.first ?? '');
    setPrizeSecond(prizes.second ?? '');
    setPrizeThird(prizes.third ?? '');
    setEditingPrizes(true);
  };

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
  const hasPrizes = !!(prizes.first || prizes.second || prizes.third);

  const typeKeys: (keyof typeof TYPE_LABELS)[] = ['x_content', 'short', 'video', 'writing', 'design', 'podcast', 'event_coverage'];

  return (
    <div className="lb-page">
      <header className="lb-hdr">
        <div className="lb-hdr-text">
          <h1 className="lb-title">
            لوحة الترتيب <span className="shimmer-text">الشهرية</span>
          </h1>
        </div>

        <div className="lb-hdr-actions">
          <div className="lb-count-pill">
            <span className="lb-count-num">{entries.length}</span>
            <span className="lb-count-lbl">عضوًا</span>
          </div>
          <div className="lb-select-wrap">
            <select
              className="lb-select"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              {monthOptions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <span className="lb-select-arrow">▾</span>
          </div>
        </div>
      </header>

      {/* منصة الأوائل */}
      {top3.length > 0 && (
        <section className="lb-podium-section">
          <p className="lb-podium-eyebrow">منصة الأوائل — {getMonthLabel(selectedMonth)}</p>
          <div className="lb-podium-wrap">
            {top3[1] && <PodiumSlot entry={top3[1]} place={2} />}
            <PodiumSlot entry={top3[0]} place={1} />
            {top3[2] && <PodiumSlot entry={top3[2]} place={3} />}
          </div>
        </section>
      )}

      {/* جوائز الشهر */}
      <section className="lb-prizes-section">
        <div className="lb-prizes-hdr">
          <h2 className="lb-section-title">🏆 جوائز الشهر</h2>
          {isAdmin && (
            <button className="lb-btn-gold" onClick={openEditPrizes}>✎ تعديل الجوائز</button>
          )}
        </div>

        {!hasPrizes ? (
          <p className="lb-prizes-empty">لم تُحدَّد جوائز لهذا الشهر بعد</p>
        ) : (
          <div className="lb-prizes-grid">
            {prizes.first && (
              <div className="lb-prize-card">
                <p className="lb-prize-rank">🥇 المركز الأول</p>
                <p className="lb-prize-text">{prizes.first}</p>
              </div>
            )}
            {prizes.second && (
              <div className="lb-prize-card">
                <p className="lb-prize-rank">🥈 المركز الثاني</p>
                <p className="lb-prize-text">{prizes.second}</p>
              </div>
            )}
            {prizes.third && (
              <div className="lb-prize-card">
                <p className="lb-prize-rank">🥉 المركز الثالث</p>
                <p className="lb-prize-text">{prizes.third}</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* الترتيب الكامل */}
      <section className="lb-table-section">
        <div className="lb-table-hdr">
          <h2 className="lb-section-title">الترتيب الكامل</h2>
          <span className="lb-table-hint">انقر أي صف لعرض التفاصيل</span>
        </div>

        {entries.length === 0 ? (
          <div className="lb-empty">لا توجد بيانات لهذا الشهر</div>
        ) : (
          <div className="lb-table-wrap">
            <table className="lb-table">
              <thead>
                <tr>
                  <th className="lb-th-rank">#</th>
                  <th className="lb-th-member">العضو</th>
                  {typeKeys.map(k => <th key={k}>{TYPE_LABELS[k]}</th>)}
                  <th>مكافأة</th>
                  <th>حضور</th>
                  <th>أفكار</th>
                  <th className="lb-th-total">المجموع</th>
                  <th className="lb-th-expand" />
                </tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  const open = expandedMember === e.user.id;
                  return (
                    <Fragment key={e.user.id}>
                      <tr
                        className={`lb-row${e.rank === 1 ? ' lb-row-gold' : ''}`}
                        aria-expanded={open}
                        onClick={() => setExpandedMember(open ? null : e.user.id)}
                      >
                        <td className={`lb-rank-cell${e.rank <= 3 ? ` lb-rank-${e.rank}` : ''}`}>
                          {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank}
                        </td>
                        <td className="lb-member-cell">
                          <div className="lb-member-inline">
                            <div className="lb-row-avatar" style={{ background: e.user.color || 'var(--lb-line)' }}>
                              {e.user.photoURL
                                ? <img src={e.user.photoURL} alt={e.user.name} />
                                : e.user.name.charAt(0)}
                            </div>
                            <span className="lb-member-name">{e.user.name}</span>
                          </div>
                        </td>
                        {typeKeys.map(k => (
                          <td key={k}>{e.breakdown[k as keyof typeof e.breakdown] || <span className="lb-dash">—</span>}</td>
                        ))}
                        <td>{e.breakdown.bonus || <span className="lb-dash">—</span>}</td>
                        <td>{e.breakdown.meetings || <span className="lb-dash">—</span>}</td>
                        <td>{e.breakdown.ideas || <span className="lb-dash">—</span>}</td>
                        <td className={`lb-total-cell${e.rank === 1 ? ' lb-total-gold' : ''}`}>{nf.format(e.breakdown.total)}</td>
                        <td className="lb-expand-cell">
                          <span className={`lb-chevron${open ? ' lb-chevron-open' : ''}`}>▼</span>
                        </td>
                      </tr>
                      {open && (
                        <tr className="lb-detail-row">
                          <td colSpan={14}>
                            <MemberPointsDetail
                              userId={e.user.id}
                              tasks={tasks}
                              meetings={meetings}
                              ideas={ideas}
                              month={selectedMonth}
                              memberName={e.user.name}
                              monthLabel={getMonthLabel(selectedMonth)}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="lb-table-note">المهام غير المنتهية تظهر بحالة «قيد التنفيذ» وتُستبعد من المجموع.</p>
      </section>

      <footer className="lb-footer">
        <p>REVOLTA · الترتيب الشهري — {getMonthLabel(selectedMonth)}</p>
        <p>النقاط تُحتسب من {getMonthLabel(POINTS_START_MONTH)} فصاعدًا</p>
      </footer>

      {editingPrizes && (
        <div className="lb-overlay" onClick={() => setEditingPrizes(false)}>
          <div className="lb-modal" onClick={e => e.stopPropagation()}>
            <h3 className="lb-modal-title">تعديل جوائز الشهر</h3>
            <div className="lb-modal-body">
              <label className="lb-field">
                <span>🥇 المركز الأول</span>
                <input value={prizeFirst} onChange={e => setPrizeFirst(e.target.value)} placeholder="اكتب الجائزة" />
              </label>
              <label className="lb-field">
                <span>🥈 المركز الثاني</span>
                <input value={prizeSecond} onChange={e => setPrizeSecond(e.target.value)} placeholder="اكتب الجائزة" />
              </label>
              <label className="lb-field">
                <span>🥉 المركز الثالث</span>
                <input value={prizeThird} onChange={e => setPrizeThird(e.target.value)} placeholder="اكتب الجائزة" />
              </label>
            </div>
            <div className="lb-modal-footer">
              <button className="lb-btn-ghost" onClick={() => setEditingPrizes(false)}>إلغاء</button>
              <button className="lb-btn-gold" disabled={savingPrizes} onClick={handleSavePrizes}>
                {savingPrizes ? <div className="spinner" /> : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
