import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useTasksStore } from '../../stores/tasksStore';
import { useMembersStore } from '../../stores/membersStore';
import { useIdeasStore } from '../../stores/ideasStore';
import { EmptyState } from '../../components/ui/EmptyState';
import { TaskModal } from '../../components/modals/TaskModal';
import { DriveModal } from '../../components/modals/DriveModal';
import { EditTaskModal } from '../../components/modals/EditTaskModal';
import { Spinner } from '../../components/ui/Spinner';
import { getStatus } from '../../utils/status';
import type { Task, TaskStatus } from '../../types';
import './MyTasksPage.css';

export function MyTasksPage() {
  const { firebaseUser, can } = useAuthStore();
  const { tasks, loadUserTasks, updateTask } = useTasksStore();
  const { members, loadMembers } = useMembersStore();
  const { ideas: _ideas, loadIdeas } = useIdeasStore();
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState(false);
  const [driveModal, setDriveModal] = useState<{ taskId: string; status: TaskStatus; taskTitle: string } | null>(null);
  const [editModal, setEditModal] = useState<Task | null>(null);

  const load = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    await Promise.all([loadUserTasks(firebaseUser.uid), loadMembers(), loadIdeas()]);
    setLoading(false);
  }, [firebaseUser, loadUserTasks, loadMembers, loadIdeas]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;

  const sorted = [...tasks.filter(t => !t.done), ...tasks.filter(t => t.done)];
  const pendingCount = tasks.filter(t => !t.done).length;
  const doneCount = tasks.filter(t => t.done).length;

  const completeTask = (taskId: string) => {
    const t = tasks.find(t => t.id === taskId);
    if (t?.type === 'writing' || t?.type === 'x_content') {
      updateTask(taskId, { status: 'done', done: true }).then(load);
    } else {
      setDriveModal({ taskId, status: 'done', taskTitle: t?.title || '' });
    }
  };

  const handleChangeStatus = (taskId: string, status: TaskStatus) => {
    if (status === 'done') {
      if (!can('setTaskComplete') && !can('changeTaskStatus')) return;
      completeTask(taskId);
      return;
    }
    if (can('changeTaskStatus')) {
      // allowed
    } else if (status === 'pending' || status === 'cancelled') {
      if (!can('setTaskIncomplete')) return;
    } else {
      return;
    }
    const isDone = status !== 'pending' && status !== 'cancelled';
    updateTask(taskId, { status, done: isDone }).then(load).catch(console.error);
  };

  const handleDriveSubmit = async (link: string, title: string) => {
    if (!driveModal) return;
    await updateTask(driveModal.taskId, { status: driveModal.status, done: true, driveLink: link, ...(title ? { title } : {}) });
    setDriveModal(null);
    load();
  };

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

  return (
    <>
      <div className="page-hdr">
        <div className="page-hdr-text">
          <h1>مهامي</h1>
          <p>{pendingCount} معلقة · {doneCount} مكتملة</p>
        </div>
        {can('addTaskSelf') && (
          <button className="btn" onClick={() => setTaskModal(true)}>+ مهمة جديدة</button>
        )}
      </div>

      {sorted.length === 0
        ? <EmptyState icon="✅" message="لا توجد مهام مسندة لك بعد" />
        : (
          <div className="mag-list">
            {sorted.map(t => {
              const st = getStatus(t);
              const sm = STATUS_META[st] || STATUS_META.pending;
              const isLate = !t.done && t.deadline && new Date(t.deadline) < new Date();
              const isFinal = st === 'done' || st === 'published';
              const cardOpacity = st === 'cancelled' ? 0.4 : isFinal ? 0.65 : 1;
              const isReadOnly = t.memberId !== firebaseUser?.uid;

              const canSetComplete  = can('setTaskComplete') || can('changeTaskStatus');
              const canSetIncomplete = can('setTaskIncomplete');
              const canChangeStatus = can('changeTaskStatus');
              const showSelect = !isReadOnly && (canChangeStatus || (!isFinal && canSetComplete) || (isFinal && canSetIncomplete));

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
                      {t.teamMemberIds && t.teamMemberIds.length > 0 && (
                        <div className="mag-member-row">
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>التيم:</span>
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
                        </div>
                      )}
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
                      {isReadOnly
                        ? <span className="badge badge-gray">للاطلاع فقط</span>
                        : showSelect && (
                          <select
                            className="mag-select"
                            value={st}
                            onChange={e => handleChangeStatus(t.id, e.target.value as TaskStatus)}
                          >
                            <option value="pending">معلقة</option>
                            {canSetComplete && <option value="done">مكتملة</option>}
                            {canChangeStatus && <option value="ready">جاهز للنشر</option>}
                            {canChangeStatus && <option value="published">تم النشر</option>}
                            {canChangeStatus && <option value="cancelled">ملغية</option>}
                          </select>
                        )
                      }
                      {!isReadOnly && can('editTask') && (
                        <button className="btn btn-xs btn-ghost" onClick={() => setEditModal(t)}>تعديل</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      <TaskModal open={taskModal} onClose={() => setTaskModal(false)} onSuccess={load} />
      <DriveModal open={!!driveModal} onClose={() => setDriveModal(null)} onSubmit={handleDriveSubmit} taskTitle={driveModal?.taskTitle ?? ''} />
      <EditTaskModal open={!!editModal} task={editModal} onClose={() => setEditModal(null)} onSuccess={load} />
    </>
  );
}
