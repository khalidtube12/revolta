import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useTasksStore } from '../../stores/tasksStore';
import { useMembersStore } from '../../stores/membersStore';
import { useIdeasStore } from '../../stores/ideasStore';
import { EmptyState } from '../../components/ui/EmptyState';
import { TaskModal } from '../../components/modals/TaskModal';
import { DriveModal } from '../../components/modals/DriveModal';
import { EditTaskModal } from '../../components/modals/EditTaskModal';
import { TwitterModal } from '../../components/modals/TwitterModal';
import { VideoCompleteModal } from '../../components/modals/VideoCompleteModal';
import { Spinner } from '../../components/ui/Spinner';
import { getStatus } from '../../utils/status';
import type { Task, TaskStatus, Meeting } from '../../types';
import { getDefaultPoints, calculateMemberMonthlyPoints } from '../../services/points.service';
import { loadAllMeetings } from '../../services/meetings.service';
import './MyTasksPage.css';

export function MyTasksPage() {
  const { firebaseUser, can } = useAuthStore();
  const { tasks, loadUserTasks, updateTask } = useTasksStore();
  const { members, loadMembers } = useMembersStore();
  const { ideas, loadIdeas } = useIdeasStore();
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState(false);
  const [driveModal, setDriveModal] = useState<{ taskId: string; status: TaskStatus; taskTitle: string } | null>(null);
  const [editModal, setEditModal] = useState<Task | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleVal, setEditingTitleVal] = useState('');
  const [twitterModal, setTwitterModal] = useState<string | null>(null);
  const [videoModal, setVideoModal] = useState<{ id: string; type: 'video' | 'podcast' | 'short' | 'event_coverage' } | null>(null);
  const [activeTab, setActiveTab] = useState<'core' | 'bonus'>('core');
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const load = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    const [,, , mtgs] = await Promise.all([loadUserTasks(firebaseUser.uid), loadMembers(), loadIdeas(), loadAllMeetings()]);
    setMeetings(mtgs);
    setLoading(false);
  }, [firebaseUser, loadUserTasks, loadMembers, loadIdeas]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;

  const coreTasks = tasks.filter(t => !t.isBonus);
  const bonusTasks = tasks.filter(t => t.isBonus === true);
  const activeTasks = activeTab === 'core' ? coreTasks : bonusTasks;

  const sorted = [...activeTasks.filter(t => !t.done), ...activeTasks.filter(t => t.done)];
  const pendingCount = activeTasks.filter(t => !t.done).length;
  const doneCount = activeTasks.filter(t => t.done).length;

  const now = new Date();
  const thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const monthlyBreakdown = firebaseUser
    ? calculateMemberMonthlyPoints(firebaseUser.uid, tasks, thisMonth, meetings, ideas)
    : null;

  const completeTask = (taskId: string) => {
    const t = tasks.find(t => t.id === taskId);
    if (t?.type === 'writing') {
      updateTask(taskId, { status: 'done', done: true }).then(load);
    } else if (t?.type === 'x_content') {
      setTwitterModal(taskId);
    } else if (t?.type === 'video' || t?.type === 'podcast' || t?.type === 'short' || t?.type === 'event_coverage') {
      setVideoModal({ id: taskId, type: t.type });
    } else {
      setDriveModal({ taskId, status: 'done', taskTitle: t?.title || '' });
    }
  };

  const handleVideoSubmit = async (driveLink: string, producerId: string) => {
    if (!videoModal) return;
    await updateTask(videoModal.id, {
      status: 'done', done: true,
      ...(producerId ? { producerId } : {}),
      ...(driveLink ? { driveLink } : {}),
    });
    setVideoModal(null);
    load();
  };

  const handleTwitterSubmit = async (twitterUrl: string) => {
    if (!twitterModal) return;
    await updateTask(twitterModal, { status: 'published', done: true, ...(twitterUrl ? { twitterUrl } : {}) });
    setTwitterModal(null);
    load();
  };

  const handleChangeStatus = (taskId: string, status: TaskStatus) => {
    const t = tasks.find(t => t.id === taskId);
    if (t?.type === 'writing' && t.memberId === firebaseUser?.uid) {
      if (status === 'published' || status === 'pending') {
        updateTask(taskId, { status, done: status === 'published' }).then(load).catch(console.error);
        return;
      }
    }
    const isOwnBonus = !!t?.isBonus && t?.memberId === firebaseUser?.uid;
    if (status === 'done') {
      if (!isOwnBonus && !can('setTaskComplete') && !can('changeTaskStatus')) return;
      completeTask(taskId);
      return;
    }
    if (isOwnBonus) {
      // العضو يتحكم في مهامه البونص بحرية
    } else if (can('changeTaskStatus')) {
      // allowed
    } else if (status === 'pending' || status === 'cancelled') {
      if (!can('setTaskIncomplete')) return;
    } else {
      return;
    }
    const isDone = status !== 'pending' && status !== 'cancelled';
    updateTask(taskId, { status, done: isDone }).then(load).catch(console.error);
  };

  const handleSaveTitle = async (taskId: string) => {
    const val = editingTitleVal.trim();
    if (val) await updateTask(taskId, { title: val });
    setEditingTitleId(null);
    load();
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
  const TYPE_LABEL: Record<string, string> = { short: 'شورت', video: 'مقطع', writing: 'كتابة', x_content: 'محتوى X', podcast: 'بودكاست', design: 'تصميم', event_coverage: 'تغطية حدث' };
  const PRIORITY_COLOR: Record<string, string> = { low: 'var(--muted)', medium: 'var(--gold)', high: '#e05555' };
  const PRIORITY_LABEL: Record<string, string> = { low: '↓ منخفضة', medium: '— متوسطة', high: '↑ عالية' };

  const renderTaskCard = (t: Task) => {
    const st = getStatus(t);
    const sm = STATUS_META[st] || STATUS_META.pending;
    const isLate = !t.done && t.deadline && new Date(t.deadline) < new Date();
    const isFinal = st === 'done' || st === 'published';
    const cardOpacity = st === 'cancelled' ? 0.4 : isFinal ? 0.65 : 1;
    const isReadOnly = t.memberId !== firebaseUser?.uid && !can('addTaskOthers');

    const canSetComplete  = can('setTaskComplete') || can('changeTaskStatus');
    const canSetIncomplete = can('setTaskIncomplete');
    const canChangeStatus = can('changeTaskStatus');
    const isWritingOwner = t.type === 'writing' && t.memberId === firebaseUser?.uid;
    const isOwnBonusTask = !!t.isBonus && !isReadOnly;
    const showSelect = !isReadOnly && (isOwnBonusTask || isWritingOwner || canChangeStatus || (!isFinal && canSetComplete) || (isFinal && canSetIncomplete));
    const isMyTask = t.memberId === firebaseUser?.uid;
    const canEditTitle = isMyTask && !isFinal;
    const base = t.points ?? getDefaultPoints(t.type);
    const bonus = t.bonusPoints ?? 0;
    const total = base + bonus;
    const earned = t.done || t.status === 'published';

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
                {canEditTitle && (
                  <button onClick={() => { setEditingTitleId(t.id); setEditingTitleVal(t.title || ''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, padding: '0 4px', lineHeight: 1 }}
                    title="تعديل العنوان">✎</button>
                )}
              </div>
            )}
            {t.teamMemberIds && t.teamMemberIds.length > 0 && (
              <div className="mag-member-row">
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>التيم:</span>
                <div className="mag-team-avatars">
                  {t.teamMemberIds.map((tid, i) => {
                    const tm = members.find(u => u.id === tid);
                    if (!tm) return null;
                    return (
                      <div key={tid} className="mag-avatar mag-team-av" title={tm.name}
                        style={{ background: tm.color || 'var(--border)', zIndex: t.teamMemberIds!.length - i }}>
                        {tm.photoURL
                          ? <img src={tm.photoURL} alt={tm.name} className="mag-avatar-img" />
                          : tm.name.charAt(0)}
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
          {total > 0 && (() => {
            if (t.isBonus) {
              if (earned && t.pointsApproved) {
                return (
                  <span style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'Oswald, sans-serif' }}>
                    ⭐ {total} نقطة{bonus > 0 && <span style={{ color: 'var(--green)', fontSize: 10 }}> +{bonus}</span>}
                  </span>
                );
              }
              if (earned && !t.pointsApproved) {
                return (
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Cairo, sans-serif' }}>
                    ⏳ بانتظار موافقة الأدمن ({total} نقطة)
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
              <span style={{ fontSize: 11, color: earned ? 'var(--gold)' : 'var(--muted)', fontFamily: 'Oswald, sans-serif' }}
                title={bonus > 0 ? `${base} أساسية + ${bonus} مكافأة` : undefined}>
                ⭐ {total} نقطة{bonus > 0 && <span style={{ color: 'var(--green)', fontSize: 10 }}> +{bonus}</span>}
                {!earned && <span style={{ fontSize: 10 }}> (معلقة)</span>}
              </span>
            );
          })()}
          <div className="mag-actions">
            {isReadOnly
              ? <span className="badge badge-gray">للاطلاع فقط</span>
              : showSelect && (
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
                      {(isOwnBonusTask || canSetComplete) && <option value="done">مكتملة</option>}
                      {canChangeStatus && <option value="ready">جاهز للنشر</option>}
                      {canChangeStatus && <option value="published">تم النشر</option>}
                      {canChangeStatus && <option value="cancelled">ملغية</option>}
                    </>
                  )}
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
  };

  return (
    <>
      <div className="page-hdr">
        <div className="page-hdr-text">
          <h1>مهامي</h1>
          <p>{pendingCount} معلقة · {doneCount} مكتملة</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {monthlyBreakdown && monthlyBreakdown.total > 0 && (
            <div style={{ textAlign: 'center', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', padding: '8px 18px' }}>
              <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, color: 'var(--gold)', lineHeight: 1 }}>
                {monthlyBreakdown.total}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>نقاط هذا الشهر</div>
            </div>
          )}
          {activeTab === 'bonus' && can('addTaskSelf') && (
            <button className="btn" onClick={() => setTaskModal(true)}>+ مهمة بونص</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'core' ? 'active' : ''}`} onClick={() => setActiveTab('core')}>
          أساسية <span className="tab-badge">{coreTasks.length}</span>
        </button>
        <button className={`tab-btn ${activeTab === 'bonus' ? 'active' : ''}`} onClick={() => setActiveTab('bonus')}>
          بونص <span className="tab-badge">{bonusTasks.length}</span>
        </button>
      </div>

      {sorted.length === 0
        ? <EmptyState
            icon={activeTab === 'bonus' ? '⭐' : '✅'}
            message={activeTab === 'bonus' ? 'لا توجد مهام بونص بعد — أضف مهمة لتكسب نقاطاً إضافية' : 'لا توجد مهام أساسية مسندة لك بعد'}
          />
        : (
          <div className="mag-list">
            {sorted.map(t => renderTaskCard(t))}
          </div>
        )
      }

      <TaskModal open={taskModal} onClose={() => setTaskModal(false)} onSuccess={load} forceBonus={true} />
      <DriveModal open={!!driveModal} onClose={() => setDriveModal(null)} onSubmit={handleDriveSubmit} taskTitle={driveModal?.taskTitle ?? ''} />
      <EditTaskModal open={!!editModal} task={editModal} onClose={() => setEditModal(null)} onSuccess={load} />
      <TwitterModal
        open={!!twitterModal}
        onClose={() => setTwitterModal(null)}
        onSubmit={handleTwitterSubmit}
        onSkip={() => handleTwitterSubmit('')}
      />
      <VideoCompleteModal
        open={!!videoModal}
        onClose={() => setVideoModal(null)}
        onSubmit={handleVideoSubmit}
        taskType={videoModal?.type}
        members={members}
      />
    </>
  );
}
