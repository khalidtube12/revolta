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
import { Spinner } from '../../components/ui/Spinner';
import { getStatus } from '../../utils/status';
import { getTaskMonth } from '../../utils/date';
import { exportTasksXLSX } from '../../utils/csv';
import { STATUS_MAP, PRIORITY_MAP } from '../../types';
import type { Task, TaskStatus } from '../../types';

export function AllTasksPage() {
  const { profile, can } = useAuthStore();
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

  let filtered = tasks;
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
    if (t?.type === 'writing' || t?.type === 'x_content') {
      updateTask(taskId, { status: 'done', done: true }).then(load);
    } else {
      setDriveModal({ taskId, status: 'done', taskTitle: t?.title || '' });
    }
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

  const handleDelete = async (taskId: string) => {
    if (!confirm('حذف المهمة؟')) return;
    await deleteTask(taskId);
    load();
  };

  const TASK_TYPE_LABELS: Record<string, string> = { short: 'شورت', video: 'مقطع', writing: 'كتابة', x_content: 'محتوى X', podcast: 'بودكاست' };

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
          <p>{filtered.length} من {tasks.length} مهمة</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(isAdmin || can('exportTasks')) && <button className="btn" onClick={handleExport}>📥 تصدير Excel</button>}
          {(isAdmin || can('importTasks')) && <button className="btn" onClick={() => setImportModal(true)}>📤 استيراد Excel</button>}
          {(isAdmin || can('addTaskOthers')) && <button className="btn" onClick={() => setTaskModal(true)}>+ مهمة جديدة</button>}
        </div>
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
        ? <EmptyState icon="📋" message="لا توجد مهام تطابق الفلتر" />
        : (() => {
            const STATUS_META: Record<string, { icon: string; label: string; color: string; bgColor: string }> = {
              pending:   { icon: '⏳', label: 'معلقة',      color: 'var(--muted)',  bgColor: 'transparent' },
              ready:     { icon: '🟡', label: 'جاهز للنشر', color: 'var(--gold)',   bgColor: 'rgba(201,168,76,0.05)' },
              done:      { icon: '✅', label: 'مكتملة',     color: 'var(--green)',  bgColor: 'rgba(58,158,101,0.05)' },
              published: { icon: '📢', label: 'تم النشر',   color: '#5cb85c',       bgColor: 'rgba(92,184,92,0.05)' },
              cancelled: { icon: '🚫', label: 'ملغية',      color: '#e05555',       bgColor: 'rgba(224,85,85,0.05)' },
            };
            const TYPE_LABEL: Record<string, string> = { short: 'شورت', video: 'مقطع', writing: 'كتابة', x_content: 'محتوى X', podcast: 'بودكاست' };
            const TYPE_BADGE: Record<string, string> = { short: 'badge-gold', video: 'badge-green', writing: 'badge-gray', x_content: 'badge-red', podcast: 'badge-gold' };
            const PRIORITY_COLOR: Record<string, string> = { low: 'var(--muted)', medium: 'var(--gold)', high: '#e05555' };
            const PRIORITY_LABEL: Record<string, string> = { low: '↓ منخفضة', medium: '— متوسطة', high: '↑ عالية' };

            const canEdit        = isAdmin || can('editTask');
            const canDelete      = isAdmin || can('deleteTask');
            const canChangeStatus= isAdmin || can('changeTaskStatus');
            const canSetIncomplete = isAdmin || can('setTaskIncomplete');
            const canSetComplete = isAdmin || can('setTaskComplete');

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
                          <div className={`mag-title${isFinal || st === 'cancelled' ? ' done' : ''}`}>
                            {t.title || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>بدون عنوان</span>}
                          </div>
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
                        <div className="mag-actions">
                          {showSelect && (
                            <select
                              className="mag-select"
                              value={st}
                              onChange={e => handleChangeStatus(t.id, e.target.value as TaskStatus)}
                            >
                              <option value="pending">معلقة</option>
                              {(isAdmin || canSetComplete || canChangeStatus) && <option value="done">مكتملة</option>}
                              {(isAdmin || canChangeStatus) && <option value="ready">جاهز للنشر</option>}
                              {(isAdmin || canChangeStatus) && <option value="published">تم النشر</option>}
                              {(isAdmin || canChangeStatus) && <option value="cancelled">ملغية</option>}
                            </select>
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
    </>
  );
}
