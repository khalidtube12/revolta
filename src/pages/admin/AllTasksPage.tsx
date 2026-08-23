import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useMembersStore } from '../../stores/membersStore';
import { useTasksStore } from '../../stores/tasksStore';
import { useIdeasStore } from '../../stores/ideasStore';
import { EmptyState } from '../../components/ui/EmptyState';
import './AllTasksPage.css';
import { TaskModal } from '../../components/modals/TaskModal';
import { ImportModal } from '../../components/modals/ImportModal';
import { DriveModal } from '../../components/modals/DriveModal';
import { EditTaskModal } from '../../components/modals/EditTaskModal';
import { TwitterModal } from '../../components/modals/TwitterModal';
import { Spinner } from '../../components/ui/Spinner';
import { getStatus } from '../../utils/status';
import { isTitleLate } from '../../utils/date';
import { getTaskMonth } from '../../utils/date';
import { exportTasksXLSX } from '../../utils/csv';
import { STATUS_MAP, PRIORITY_MAP } from '../../types';
import type { Task, TaskStatus } from '../../types';
import { getDefaultPoints } from '../../services/points.service';

export function AllTasksPage() {
  const { profile, firebaseUser, can } = useAuthStore();
  const { members, loadMembers } = useMembersStore();
  const { tasks, loadAllTasks, updateTask, deleteTask, filterMonth, filterPriority, setFilterMonth, setFilterPriority } = useTasksStore();
  const { ideas, loadIdeas } = useIdeasStore();
  const isAdmin = !!profile?.isAdmin;
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [driveModal, setDriveModal] = useState<{ taskId: string; status: TaskStatus; taskTitle: string } | null>(null);
  const [editModal, setEditModal] = useState<Task | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleVal, setEditingTitleVal] = useState('');
  const [bonusModal, setBonusModal] = useState<Task | null>(null);
  const [bonusVal, setBonusVal] = useState('');
  const [bonusNote, setBonusNote] = useState('');
  const [twitterModal, setTwitterModal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'core' | 'bonus'>('core');

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadMembers(), loadAllTasks(), loadIdeas()]);
    setLoading(false);
  }, [loadMembers, loadAllTasks, loadIdeas]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;

  const now = new Date();
  const thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const prevMonth = now.getMonth() === 0
    ? (now.getFullYear() - 1) + '-12'
    : now.getFullYear() + '-' + String(now.getMonth()).padStart(2, '0');

  const monthOpts: { v: string; l: string }[] = [
    { v: '', l: 'كل الأشهر' },
    { v: 'current', l: 'هذا الشهر' },
    { v: 'prev', l: 'الشهر الماضي' },
  ];

  const monthsInTasks = [...new Set(tasks.map(t => getTaskMonth(t.deadline, t.createdAt)))].filter(Boolean).sort().reverse();
  monthsInTasks.forEach(m => {
    if (m !== thisMonth && m !== prevMonth) {
      monthOpts.push({ v: m, l: new Date(m + '-01').toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' }) });
    }
  });

  const coreTasks = tasks.filter(t => !t.isBonus);
  const bonusTasks = tasks.filter(t => t.isBonus === true);

  let filtered = activeTab === 'core' ? coreTasks : bonusTasks;
  if (filterMonth) {
    const m = filterMonth === 'current' ? thisMonth : filterMonth === 'prev' ? prevMonth : filterMonth;
    filtered = filtered.filter(t => getTaskMonth(t.deadline, t.createdAt) === m);
  }
  if (filterPriority) {
    filtered = filtered.filter(t => (t.priority || 'medium') === filterPriority);
  }
  if (filterType) {
    filtered = filtered.filter(t => (t.type || '') === filterType);
  }
  if (filterStatus) {
    filtered = filtered.filter(t => getStatus(t) === filterStatus);
  }
  const sorted = [...filtered].sort((a, b) =>
    sortOrder === 'desc' ? (b.createdAt || 0) - (a.createdAt || 0) : (a.createdAt || 0) - (b.createdAt || 0)
  );

  const completeTask = (taskId: string) => {
    const t = tasks.find(t => t.id === taskId);
    if (t?.type === 'writing') {
      updateTask(taskId, { status: 'done', done: true }).then(load);
    } else if (t?.type === 'x_content') {
      setTwitterModal(taskId);
    } else {
      setDriveModal({ taskId, status: 'done', taskTitle: t?.title || '' });
    }
  };

  const handleTwitterSubmit = async (twitterUrl: string) => {
    if (!twitterModal) return;
    await updateTask(twitterModal, { status: 'published', done: true, ...(twitterUrl ? { twitterUrl } : {}) });
    setTwitterModal(null);
    load();
  };

  const handleToggle = (taskId: string, wasResolved: boolean) => {
    if (wasResolved) {
      if (!isAdmin && !can('setTaskIncomplete')) return;
      updateTask(taskId, { done: false, status: 'pending', driveLink: undefined }).then(load);
    } else {
      if (!isAdmin && !can('setTaskComplete')) return;
      completeTask(taskId);
    }
  };

  const handleChangeStatus = (taskId: string, status: TaskStatus) => {
    const t = tasks.find(t => t.id === taskId);
    // مهام الكتابة: حالتان فقط — معلقة / تم النشر
    if (t?.type === 'writing') {
      if (status === 'published' || status === 'pending') {
        if (!isAdmin && !can('changeTaskStatus') && !can('setTaskComplete') && !can('setTaskIncomplete')) return;
        updateTask(taskId, { status, done: status === 'published' }).then(load);
        return;
      }
    }
    if (status === 'done') {
      if (!isAdmin && !can('setTaskComplete') && !can('changeTaskStatus')) return;
      completeTask(taskId);
      return;
    }
    if (!isAdmin) {
      if (can('changeTaskStatus')) {
        // allowed — fall through
      } else if (status === 'pending' || status === 'cancelled') {
        if (!can('setTaskIncomplete')) return;
      } else {
        return;
      }
    }
    const isDone = status !== 'pending' && status !== 'cancelled';
    updateTask(taskId, { status, done: isDone }).then(load);
  };

  const handleDriveSubmit = async (link: string, title: string) => {
    if (!driveModal) return;
    await updateTask(driveModal.taskId, { status: driveModal.status, done: true, driveLink: link, ...(title ? { title } : {}) });
    setDriveModal(null);
    load();
  };

  const handleSaveTitle = async (taskId: string) => {
    const val = editingTitleVal.trim();
    if (val) await updateTask(taskId, { title: val, titleSetAt: Date.now() });
    setEditingTitleId(null);
    load();
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('حذف المهمة؟')) return;
    await deleteTask(taskId);
    load();
  };

  const handleApproveBonus = async (taskId: string) => {
    await updateTask(taskId, { pointsApproved: true, pointsApprovedBy: firebaseUser?.uid ?? '', pointsApprovedAt: Date.now() });
    load();
  };

  const handleSaveBonus = async () => {
    if (!bonusModal) return;
    const amount = parseInt(bonusVal, 10);
    if (isNaN(amount) || amount < 0) { alert('أدخل رقماً صحيحاً'); return; }
    await updateTask(bonusModal.id, { bonusPoints: amount, ...(bonusNote.trim() ? { bonusNote: bonusNote.trim() } : {}) });
    setBonusModal(null);
    setBonusVal('');
    setBonusNote('');
    load();
  };

  const TASK_TYPE_LABELS: Record<string, string> = { short: 'شورت', video: 'مقطع', writing: 'كتابة', x_content: 'محتوى X', podcast: 'بودكاست', design: 'تصميم' };

  const handleExport = () => {
    if (!sorted.length) { alert('لا توجد مهام للتصدير'); return; }
    const rows = sorted.map(t => {
      const m = members.find(u => u.id === t.memberId);
      const st = getStatus(t);
      const si = STATUS_MAP[st] || STATUS_MAP.pending;
      return {
        member:   m?.name || 'غير معروف',
        task:     t.title,
        details:  t.desc || '',
        deadline: t.deadline || '',
        priority: PRIORITY_MAP[t.priority || 'medium'],
        status:   si.label,
        type:     t.type ? TASK_TYPE_LABELS[t.type] || t.type : '',
      };
    });
    exportTasksXLSX('Revolta_Tasks_' + new Date().toISOString().slice(0, 10) + '.xlsx', rows).catch(() => {});
  };

  return (
    <>
      <div className="page-hdr">
        <div className="page-hdr-text">
          <h1>جميع المهام</h1>
          <p>{filtered.length} من {activeTab === 'core' ? coreTasks.length : bonusTasks.length} مهمة</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(isAdmin || can('exportTasks')) && <button className="btn" onClick={handleExport}>📥 تصدير Excel</button>}
          {(isAdmin || can('importTasks')) && <button className="btn" onClick={() => setImportModal(true)}>📤 استيراد Excel</button>}
          {activeTab === 'core' && (isAdmin || can('addTaskOthers')) && <button className="btn" onClick={() => setTaskModal(true)}>+ مهمة جديدة</button>}
        </div>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'core' ? 'active' : ''}`} onClick={() => setActiveTab('core')}>
          أساسية <span className="tab-badge">{coreTasks.length}</span>
        </button>
        <button className={`tab-btn ${activeTab === 'bonus' ? 'active' : ''}`} onClick={() => setActiveTab('bonus')}>
          بونص <span className="tab-badge">{bonusTasks.length}</span>
        </button>
      </div>

      <div className="filter-bar">
        <label>الشهر</label>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          {monthOpts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
<label>نوع المهمة</label>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">كل الأنواع</option>
          <option value="short">شورت</option>
          <option value="video">مقطع</option>
          <option value="writing">كتابة</option>
          <option value="x_content">محتوى X</option>
          <option value="podcast">بودكاست</option>
          <option value="design">تصميم</option>
        </select>
        <label>الحالة</label>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          <option value="pending">معلقة</option>
          <option value="ready">جاهز للنشر</option>
          <option value="done">مكتملة</option>
          <option value="published">تم النشر</option>
          <option value="cancelled">ملغية</option>
        </select>
        <label>الترتيب</label>
        <select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'desc' | 'asc')}>
          <option value="desc">الأحدث أولاً</option>
          <option value="asc">الأقدم أولاً</option>
        </select>
      </div>

      {sorted.length === 0
        ? <EmptyState icon={activeTab === 'bonus' ? '⭐' : '📋'} message={activeTab === 'bonus' ? 'لا توجد مهام بونص بعد' : 'لا توجد مهام تطابق الفلتر'} />
        : (() => {
            const STATUS_META: Record<string, { icon: string; label: string; color: string; bgColor: string }> = {
              pending:   { icon: '⏳', label: 'معلقة',      color: 'var(--muted)',  bgColor: 'transparent' },
              ready:     { icon: '🟡', label: 'جاهز للنشر', color: 'var(--gold)',   bgColor: 'rgba(201,168,76,0.05)' },
              done:      { icon: '✅', label: 'مكتملة',     color: 'var(--green)',  bgColor: 'rgba(58,158,101,0.05)' },
              published: { icon: '📢', label: 'تم النشر',   color: '#5cb85c',       bgColor: 'rgba(92,184,92,0.05)' },
              cancelled: { icon: '🚫', label: 'ملغية',      color: '#e05555',       bgColor: 'rgba(224,85,85,0.05)' },
            };
            const TYPE_LABEL: Record<string, string> = { short: 'شورت', video: 'مقطع', writing: 'كتابة', x_content: 'محتوى X', podcast: 'بودكاست', design: 'تصميم' };
            const TYPE_BADGE: Record<string, string> = { short: 'badge-gold', video: 'badge-green', writing: 'badge-gray', x_content: 'badge-red', podcast: 'badge-gold', design: 'badge-gold' };
            const PRIORITY_COLOR: Record<string, string> = { low: 'var(--muted)', medium: 'var(--gold)', high: '#e05555' };
            const PRIORITY_LABEL: Record<string, string> = { low: '↓ منخفضة', medium: '— متوسطة', high: '↑ عالية' };

            const canEdit        = isAdmin || can('editTask');
            const canDelete      = isAdmin || can('deleteTask');
            const canChangeStatus= isAdmin || can('changeTaskStatus');
            const canSetIncomplete = isAdmin || can('setTaskIncomplete');
            const canSetComplete = isAdmin || can('setTaskComplete');
            const myUid = firebaseUser?.uid;

            return (
              <div className="mag-list">
                {sorted.map(t => {
                  const st = getStatus(t);
                  const sm = STATUS_META[st] || STATUS_META.pending;
                  const member = members.find(u => u.id === t.memberId);
                  const isLate = !t.done && t.deadline && new Date(t.deadline) < new Date();
                  const isFinal = st === 'done' || st === 'published';
                  const cardOpacity = st === 'cancelled' ? 0.4 : isFinal ? 0.65 : 1;

                  const showSelect = canChangeStatus
                    || (!isFinal && canSetComplete)
                    || (isFinal && canSetIncomplete);

                  const isMyTask = t.memberId === myUid;
                  const canEditTitle = isMyTask && !canEdit && !isFinal;

                  return (
                    <div className="mag-card" key={t.id} style={{ opacity: cardOpacity }}>
                      {/* TOP */}
                      <div className="mag-top">
                        {t.type && (
                          <div className={`mag-type-col mag-type-${t.type}`}>
                            <span className="mag-type-txt">{TYPE_LABEL[t.type]}</span>
                          </div>
                        )}
                        <div className="mag-content">
                          {editingTitleId === t.id ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                              <input
                                autoFocus
                                value={editingTitleVal}
                                onChange={e => setEditingTitleVal(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(t.id); if (e.key === 'Escape') setEditingTitleId(null); }}
                                onBlur={() => handleSaveTitle(t.id)}
                                style={{ flex: 1, background: '#111', border: '1px solid var(--gold)', color: 'var(--text)', padding: '5px 10px', fontFamily: 'Cairo, sans-serif', fontSize: 14, borderRadius: 0 }}
                              />
                            </div>
                          ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <div className={`mag-title${st === 'published' || st === 'cancelled' ? ' done' : ''}`}>
                              {t.title || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>بدون عنوان</span>}
                            </div>
                            {isTitleLate(t) && (
                              <span style={{ fontSize: 10, color: '#fff', background: 'var(--red)', padding: '2px 8px', fontFamily: 'Cairo, sans-serif', flexShrink: 0 }}>
                                ⚠ تأخير في كتابة العنوان
                              </span>
                            )}
                            {canEditTitle && (
                              <button onClick={() => { setEditingTitleId(t.id); setEditingTitleVal(t.title || ''); }}
                                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, padding: '0 4px', lineHeight: 1 }}
                                title="تعديل العنوان">✎</button>
                            )}
                          </div>
                          )}
                          <div className="mag-member-row">
                            {member && (
                              <>
                                <div className="mag-avatar" style={{ background: member.color || 'var(--border)' }}>
                                  {member.photoURL
                                    ? <img src={member.photoURL} alt={member.name} className="mag-avatar-img" />
                                    : member.name.charAt(0)
                                  }
                                </div>
                                <span className="mag-member-name">{member.name}</span>
                              </>
                            )}
                            {t.teamMemberIds && t.teamMemberIds.length > 0 && (
                              <div className="mag-team-avatars">
                                {t.teamMemberIds.map((tid, i) => {
                                  const tm = members.find(u => u.id === tid);
                                  if (!tm) return null;
                                  return (
                                    <div
                                      key={tid}
                                      className="mag-avatar mag-team-av"
                                      title={tm.name}
                                      style={{ background: tm.color || 'var(--border)', zIndex: t.teamMemberIds!.length - i }}
                                    >
                                      {tm.photoURL
                                        ? <img src={tm.photoURL} alt={tm.name} className="mag-avatar-img" />
                                        : tm.name.charAt(0)
                                      }
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mag-status-col" style={{ background: sm.bgColor }}>
                          <div className="mag-status-icon">{sm.icon}</div>
                          <div className="mag-status-txt" style={{ color: sm.color }}>{sm.label}</div>
                        </div>
                      </div>

                      {/* FOOTER */}
                      <div className="mag-footer">
                        <span style={{ fontSize: 10, color: PRIORITY_COLOR[t.priority || 'medium'] }}>
                          {PRIORITY_LABEL[t.priority || 'medium']}
                        </span>
                        {t.deadline && (
                          <span className={`mag-date${isLate ? ' late' : ''}`}>
                            📅 {isLate ? 'متأخرة' : t.deadline}
                          </span>
                        )}
                        {t.driveLink && (
                          <a href={t.driveLink} target="_blank" rel="noopener noreferrer"
                            className="mag-drive" onClick={e => e.stopPropagation()}>
                            📁 Drive
                          </a>
                        )}
                        {(() => {
                          const base = t.points ?? getDefaultPoints(t.type);
                          const bonus = t.bonusPoints ?? 0;
                          const total = base + bonus;
                          if (total === 0) return null;
                          const earned = t.done || t.status === 'published';
                          if (t.isBonus) {
                            if (earned && t.pointsApproved) {
                              return (
                                <span style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'Oswald, sans-serif' }}>
                                  ⭐ {total} نقطة ✓
                                </span>
                              );
                            }
                            if (earned && !t.pointsApproved) {
                              return (
                                <span style={{ fontSize: 11, color: '#e09a3a', fontFamily: 'Cairo, sans-serif' }}>
                                  ⏳ بانتظار الموافقة ({total} نقطة)
                                </span>
                              );
                            }
                            return (
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Oswald, sans-serif' }}>
                                {total} نقطة متوقعة
                              </span>
                            );
                          }
                          return (
                            <span title={bonus > 0 ? `${base} أساسية + ${bonus} مكافأة` : undefined}
                              style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'Oswald, sans-serif', letterSpacing: 0.5 }}>
                              ⭐ {total} نقطة{bonus > 0 && <span style={{ color: 'var(--green)', fontSize: 10 }}> +{bonus}</span>}
                            </span>
                          );
                        })()}
                        <div className="mag-actions">
                          {showSelect && (
                            <select
                              className="mag-select"
                              value={st === 'done' && t.type === 'writing' ? 'published' : st}
                              onChange={e => handleChangeStatus(t.id, e.target.value as TaskStatus)}
                            >
                              {t.type === 'writing' ? (
                                <>
                                  <option value="pending">معلقة</option>
                                  <option value="published">تم النشر</option>
                                </>
                              ) : (
                                <>
                                  <option value="pending">معلقة</option>
                                  {(isAdmin || canSetComplete || canChangeStatus) && <option value="done">مكتملة</option>}
                                  {(isAdmin || canChangeStatus) && <option value="ready">جاهز للنشر</option>}
                                  {(isAdmin || canChangeStatus) && <option value="published">تم النشر</option>}
                                  {(isAdmin || canChangeStatus) && <option value="cancelled">ملغية</option>}
                                </>
                              )}
                            </select>
                          )}
                          {t.isBonus && (t.done || t.status === 'published') && !t.pointsApproved && (isAdmin || can('addTaskOthers')) && (
                            <button
                              className="btn btn-xs"
                              style={{ background: 'rgba(58,158,101,0.15)', color: 'var(--green)', border: '1px solid rgba(58,158,101,0.4)' }}
                              onClick={() => handleApproveBonus(t.id)}
                            >
                              ✅ موافقة على النقاط
                            </button>
                          )}
                          {!t.isBonus && isAdmin && (
                            <button className="btn btn-xs btn-ghost" title="إضافة نقاط مكافأة"
                              onClick={() => { setBonusModal(t); setBonusVal(String(t.bonusPoints ?? 0)); setBonusNote(t.bonusNote ?? ''); }}>
                              ⭐ مكافأة
                            </button>
                          )}
                          {canEdit && (
                            <button className="btn btn-xs btn-ghost" onClick={() => setEditModal(t)}>تعديل</button>
                          )}
                          {canDelete && (
                            <button className="btn btn-xs btn-danger" onClick={() => handleDelete(t.id)}>حذف</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
      }

      <TaskModal open={taskModal} onClose={() => setTaskModal(false)} onSuccess={load} />
      <ImportModal open={importModal} onClose={() => setImportModal(false)} onSuccess={load} />
      <DriveModal open={!!driveModal} onClose={() => setDriveModal(null)} onSubmit={handleDriveSubmit} taskTitle={driveModal?.taskTitle ?? ''} />
      <EditTaskModal open={!!editModal} task={editModal} onClose={() => setEditModal(null)} onSuccess={load} />
      <TwitterModal
        open={!!twitterModal}
        onClose={() => setTwitterModal(null)}
        onSubmit={handleTwitterSubmit}
        onSkip={() => handleTwitterSubmit('')}
      />

      {bonusModal && (
        <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) setBonusModal(null); }}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-title">⭐ نقاط مكافأة</div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, margin: '0 0 16px' }}>
              {bonusModal.title || 'مهمة'} — النقاط الأساسية: {bonusModal.points ?? getDefaultPoints(bonusModal.type)}
            </p>
            {bonusModal.twitterUrl && (
              <div style={{ marginBottom: 16 }}>
                <a
                  href={bonusModal.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, textDecoration: 'none' }}
                >
                  🔗 فتح التغريدة
                </a>
              </div>
            )}
            <div className="form-group">
              <label>نقاط المكافأة</label>
              <input
                type="number" min="0" value={bonusVal}
                onChange={e => setBonusVal(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>السبب (اختياري)</label>
              <input
                type="text" value={bonusNote} placeholder="مثال: تغريدة 20K+"
                onChange={e => setBonusNote(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={handleSaveBonus}>حفظ</button>
              <button className="btn btn-ghost" onClick={() => setBonusModal(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
