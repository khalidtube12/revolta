import { useState } from 'react';
import type { Task, User } from '../../types';
import { getStatus } from '../../utils/status';
import { getDefaultPoints } from '../../services/points.service';
import './TaskGridView.css';

interface Props {
  tasks: Task[];
  members: User[];
}

const TYPE_SHORT: Record<string, string> = {
  short: 'ش', video: 'م', writing: 'ك',
  x_content: 'X', podcast: 'ب', design: 'ص', event_coverage: 'غ',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'var(--muted)',
  ready: 'var(--gold)',
  done: 'var(--green2, #3a9e65)',
  published: '#4ade80',
  cancelled: 'var(--red)',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'معلقة', ready: 'جاهز للنشر', done: 'مكتملة', published: 'تم النشر', cancelled: 'ملغية',
};

const TYPE_LABEL: Record<string, string> = {
  short: 'شورت', video: 'مقطع', writing: 'كتابة',
  x_content: 'محتوى X', podcast: 'بودكاست', design: 'تصميم', event_coverage: 'تغطية حدث',
};

const WEEKDAYS_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

function getMonthLabel(ym: string): string {
  return new Date(ym + '-01').toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

export function TaskGridView({ tasks, members }: Props) {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(
    now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  );
  const [search, setSearch] = useState('');
  const [filterMember, setFilterMember] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ memberId: string; day: number } | null>(null);

  const year = +viewMonth.split('-')[0];
  const month = +viewMonth.split('-')[1];
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const todayStr = now.toISOString().substring(0, 10);

  const weekdayAr = (day: number) => WEEKDAYS_AR[new Date(year, month - 1, day).getDay()];
  const isFriday = (day: number) => new Date(year, month - 1, day).getDay() === 5;
  const isToday = (day: number) => `${viewMonth}-${String(day).padStart(2, '0')}` === todayStr;

  // Filter tasks for this month + search/member/status filters
  const filteredTasks = tasks.filter(t => {
    if (!t.deadline?.startsWith(viewMonth)) return false;
    if (filterMember && t.memberId !== filterMember) return false;
    if (filterStatus && getStatus(t) !== filterStatus) return false;
    if (search) {
      const memberName = members.find(m => m.id === t.memberId)?.name ?? '';
      if (!t.title.includes(search) && !memberName.includes(search)) return false;
    }
    return true;
  });

  // Build grid: memberId → day → tasks[]
  const gridData: Record<string, Record<number, Task[]>> = {};
  for (const t of filteredTasks) {
    const day = +t.deadline!.split('-')[2];
    if (!gridData[t.memberId]) gridData[t.memberId] = {};
    if (!gridData[t.memberId][day]) gridData[t.memberId][day] = [];
    gridData[t.memberId][day].push(t);
  }

  // Visible members: if filtering by member show only them, else show members with tasks
  const memberIdsWithTasks = new Set(filteredTasks.map(t => t.memberId));
  const visibleMembers = members.filter(m =>
    filterMember ? m.id === filterMember : memberIdsWithTasks.has(m.id)
  );

  // Stats (based on all tasks in month before member/status/search filter)
  const monthTasks = tasks.filter(t => t.deadline?.startsWith(viewMonth));
  const tasksThisMonth = monthTasks.length;
  const filledDays = new Set(monthTasks.map(t => t.deadline)).size;
  const emptyDays = daysInMonth - filledDays;
  const totalPoints = monthTasks.reduce((s, t) => s + (t.points ?? getDefaultPoints(t.type)), 0);

  const memberMonthTasks = (mid: string) =>
    tasks.filter(t => t.deadline?.startsWith(viewMonth) && t.memberId === mid).length;
  const memberMonthPoints = (mid: string) =>
    tasks
      .filter(t => t.deadline?.startsWith(viewMonth) && t.memberId === mid)
      .reduce((s, t) => s + (t.points ?? getDefaultPoints(t.type)), 0);

  const dayTotal = (day: number) => {
    let count = 0;
    for (const mid of Object.keys(gridData)) {
      count += gridData[mid][day]?.length ?? 0;
    }
    return count;
  };

  const selectedDayTasks =
    selectedCell
      ? (gridData[selectedCell.memberId]?.[selectedCell.day] ?? [])
      : [];

  const selectedMember = selectedCell
    ? members.find(m => m.id === selectedCell.memberId)
    : null;

  const formatDay = (day: number) => {
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleCellClick = (memberId: string, day: number) => {
    if (selectedCell?.memberId === memberId && selectedCell?.day === day) {
      setSelectedCell(null);
    } else {
      setSelectedCell({ memberId, day });
    }
  };

  return (
    <div className="tgv-wrap">
      {/* Toolbar */}
      <div className="tgv-toolbar">
        <div className="tgv-month-nav">
          <button className="tgv-month-btn" onClick={() => { setViewMonth(shiftMonth(viewMonth, -1)); setSelectedCell(null); }}>›</button>
          <span className="tgv-month-label">{getMonthLabel(viewMonth)}</span>
          <button className="tgv-month-btn" onClick={() => { setViewMonth(shiftMonth(viewMonth, 1)); setSelectedCell(null); }}>‹</button>
        </div>

        <div className="tgv-search">
          <span className="tgv-search-icon">⌕</span>
          <input
            type="text"
            placeholder="ابحث بعنوان المهمة أو اسم العضو…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select value={filterMember} onChange={e => { setFilterMember(e.target.value); setSelectedCell(null); }}>
          <option value="">كل الأعضاء</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setSelectedCell(null); }}>
          <option value="">كل الحالات</option>
          <option value="pending">معلقة</option>
          <option value="ready">جاهز للنشر</option>
          <option value="done">مكتملة</option>
          <option value="published">تم النشر</option>
          <option value="cancelled">ملغية</option>
        </select>
      </div>

      {/* Stats */}
      <div className="tgv-stats">
        <div className="tgv-stat">
          <span className="tgv-stat-val">{tasksThisMonth}</span>
          <span className="tgv-stat-lbl">مهام الشهر</span>
        </div>
        <div className="tgv-stat">
          <span className="tgv-stat-val">{filledDays}</span>
          <span className="tgv-stat-lbl">أيام ممتلئة</span>
        </div>
        <div className="tgv-stat">
          <span className="tgv-stat-val">{emptyDays}</span>
          <span className="tgv-stat-lbl">أيام فاضية</span>
        </div>
        <div className="tgv-stat">
          <span className="tgv-stat-val">{totalPoints}</span>
          <span className="tgv-stat-lbl">مجموع النقاط</span>
        </div>
      </div>

      {/* Grid Table */}
      {visibleMembers.length === 0 ? (
        <div className="tgv-empty">لا توجد مهام في هذا الشهر</div>
      ) : (
        <div className="tgv-table-wrap">
          <table className="tgv-table">
            <thead>
              <tr>
                <th className="tgv-member-th">العضو \ اليوم</th>
                {days.map(d => (
                  <th
                    key={d}
                    className={[
                      isToday(d) ? 'tgv-today-th' : '',
                      isFriday(d) ? 'tgv-friday-th' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <div className="tgv-day-num">{d}</div>
                    <div className="tgv-weekday">{weekdayAr(d)}</div>
                  </th>
                ))}
                <th className="tgv-month-th">الشهر</th>
              </tr>
            </thead>
            <tbody>
              {visibleMembers.map(m => (
                <tr key={m.id}>
                  <td className="tgv-member-cell">
                    <div
                      className="tgv-avatar"
                      style={{ background: m.color || 'var(--border2)' }}
                    >
                      {m.photoURL
                        ? <img src={m.photoURL} alt={m.name} />
                        : m.name.charAt(0)}
                    </div>
                    <span className="tgv-member-name">{m.name}</span>
                  </td>
                  {days.map(d => {
                    const dayTasks = gridData[m.id]?.[d] ?? [];
                    const isSelected = selectedCell?.memberId === m.id && selectedCell?.day === d;
                    return (
                      <td
                        key={d}
                        className={[
                          'tgv-day-cell',
                          dayTasks.length > 0 ? 'tgv-has-tasks' : '',
                          isSelected ? 'tgv-selected' : '',
                          isFriday(d) ? 'tgv-friday-col' : '',
                          isToday(d) ? 'tgv-today-col' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => handleCellClick(m.id, d)}
                      >
                        {dayTasks.slice(0, 6).map(t => {
                          const st = getStatus(t);
                          const col = STATUS_COLOR[st] || 'var(--muted)';
                          return (
                            <span
                              key={t.id}
                              className="tgv-badge"
                              style={{ borderColor: col, color: col }}
                              title={`${t.title} — ${STATUS_LABEL[st] ?? st} — ${t.points ?? getDefaultPoints(t.type)} نقطة`}
                            >
                              {TYPE_SHORT[t.type ?? ''] ?? '؟'}
                            </span>
                          );
                        })}
                        {dayTasks.length > 6 && (
                          <span className="tgv-badge-more">+{dayTasks.length - 6}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="tgv-month-summary">
                    <div>{memberMonthTasks(m.id)}</div>
                    <div className="tgv-month-pts">{memberMonthPoints(m.id)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="tgv-footer-label">مجموع اليوم</td>
                {days.map(d => (
                  <td key={d} style={{ color: dayTotal(d) > 0 ? 'var(--text)' : undefined }}>
                    {dayTotal(d) || '·'}
                  </td>
                ))}
                <td className="tgv-footer-month">{tasksThisMonth}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Detail Panel */}
      {selectedCell && (
        <div className="tgv-detail">
          <div className="tgv-detail-header">
            <span className="tgv-detail-title">
              {selectedMember?.name} — {formatDay(selectedCell.day)}
            </span>
            <button className="tgv-detail-close" onClick={() => setSelectedCell(null)}>
              ✕ إغلاق
            </button>
          </div>
          {selectedDayTasks.length === 0 ? (
            <div className="tgv-detail-empty">يوم فاضٍ — لا مهام مسجلة لهذا العضو في هذا اليوم.</div>
          ) : (
            <div className="tgv-detail-grid">
              {selectedDayTasks.map(t => {
                const st = getStatus(t);
                const col = STATUS_COLOR[st] || 'var(--muted)';
                const pts = t.points ?? getDefaultPoints(t.type);
                return (
                  <div key={t.id} className="tgv-task-card">
                    <div className="tgv-task-card-top">
                      <span
                        className="tgv-task-card-status"
                        style={{ color: col, borderColor: col, border: `1px solid`, padding: '2px 7px' }}
                      >
                        {STATUS_LABEL[st] ?? st}
                      </span>
                      {pts > 0 && <span className="tgv-task-card-pts">{pts} نقطة</span>}
                    </div>
                    <div className="tgv-task-card-title">{t.title}</div>
                    <div className="tgv-task-card-meta">
                      {t.type && <span>{TYPE_LABEL[t.type] || t.type}</span>}
                      {t.priority && (
                        <span>{t.priority === 'high' ? 'عالية' : t.priority === 'medium' ? 'متوسطة' : 'منخفضة'}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
