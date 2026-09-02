import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMembersStore } from '../../stores/membersStore';
import { useTasksStore } from '../../stores/tasksStore';
import { StatBox } from '../../components/ui/StatBox';
import { Card } from '../../components/ui/Card';
import { MemberRow } from '../../components/ui/MemberRow';
import { TaskMini } from '../../components/ui/TaskMini';
import { EmptyState } from '../../components/ui/EmptyState';
import { TaskModal } from '../../components/modals/TaskModal';
import { DriveModal } from '../../components/modals/DriveModal';
import { EditTaskModal } from '../../components/modals/EditTaskModal';
import { Spinner } from '../../components/ui/Spinner';
import { getStatus } from '../../utils/status';
import { useAuthStore } from '../../stores/authStore';
import { useIdeasStore } from '../../stores/ideasStore';
import type { Task, TaskStatus } from '../../types';
import { IOSInstallBanner } from '../../components/ui/IOSInstallBanner';
import { TodayContent } from '../../components/ui/TodayContent';
import './AdminDashboard.css';
import '../member/MyTasksPage.css';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { profile, firebaseUser } = useAuthStore();
  const { members, loadMembers } = useMembersStore();
  const { tasks, loadAllTasks, updateTask, deleteTask } = useTasksStore();
  const { ideas, loadIdeas } = useIdeasStore();
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState(false);
  const [driveModal, setDriveModal] = useState<{ taskId: string; status: TaskStatus; taskTitle: string } | null>(null);
  const [editModal, setEditModal] = useState<Task | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadMembers(), loadAllTasks(), loadIdeas()]);
    setLoading(false);
  }, [loadMembers, loadAllTasks, loadIdeas]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;

  const cancelled = tasks.filter(t => getStatus(t) === 'cancelled').length;
  const active = tasks.filter(t => getStatus(t) !== 'cancelled');
  const done = active.filter(t => t.done).length;
  const pending = active.length - done;
  const over = active.filter(t => !t.done && t.deadline && new Date(t.deadline) < new Date()).length;
  const recent = [...tasks].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);

  const myTasks = tasks.filter(t => {
    if (t.memberId === firebaseUser?.uid) return true;
    const teamIds: string[] = Array.isArray(t.teamMemberIds) ? t.teamMemberIds : Object.values(t.teamMemberIds || {});
    return teamIds.includes(firebaseUser?.uid ?? '');
  });

  const STATUS_META: Record<string, { icon: string; label: string; color: string; bgColor: string }> = {
    pending:   { icon: '⏳', label: 'معلقة',      color: 'var(--muted)',  bgColor: 'transparent' },
    ready:     { icon: '🟡', label: 'جاهز للنشر', color: 'var(--gold)',   bgColor: 'rgba(201,168,76,0.05)' },
    done:      { icon: '✅', label: 'مكتملة',     color: 'var(--green)',  bgColor: 'rgba(58,158,101,0.05)' },
    published: { icon: '📢', label: 'تم النشر',   color: '#5cb85c',       bgColor: 'rgba(92,184,92,0.05)' },
    cancelled: { icon: '🚫', label: 'ملغية',      color: '#e05555',       bgColor: 'rgba(224,85,85,0.05)' },
  };
  const TYPE_LABEL: Record<string, string> = { short: 'شورت', video: 'مقطع', writing: 'كتابة', x_content: 'محتوى X', podcast: 'بودكاست', event_coverage: 'تغطية حدث' };
  const PRIORITY_COLOR: Record<string, string> = { low: 'var(--muted)', medium: 'var(--gold)', high: '#e05555' };
  const PRIORITY_LABEL: Record<string, string> = { low: '↓ منخفضة', medium: '— متوسطة', high: '↑ عالية' };

  const completeTask = (taskId: string) => {
    const t = tasks.find(t => t.id === taskId);
    if (t?.type === 'writing' || t?.type === 'x_content' || t?.type === 'design') {
      updateTask(taskId, { status: 'done', done: true }).then(load);
    } else {
      setDriveModal({ taskId, status: 'done', taskTitle: t?.title || '' });
    }
  };

  const handleToggle = (taskId: string, wasResolved: boolean) => {
    if (wasResolved) {
      updateTask(taskId, { done: false, status: 'pending', driveLink: undefined }).then(load);
    } else {
      completeTask(taskId);
    }
  };

  const handleChangeStatus = (taskId: string, status: TaskStatus) => {
    if (status === 'done') {
      completeTask(taskId);
      return;
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

  return (
    <>
      <IOSInstallBanner />
      <div className="home-hero">
        <span className="hero-avatar" style={{ background: profile?.photoURL ? undefined : (profile?.color || 'var(--red)') }}>
          {profile?.photoURL ? <img src={profile.photoURL} alt="" /> : profile?.name?.charAt(0) || '?'}
        </span>
        <div className="hero-text">
          <h2>مرحبا، {profile?.name}</h2>
          <p>إليك نظرة سريعة على أداء فريق ريفولتا</p>
        </div>
      </div>

      <TodayContent />

      <div className="stats-grid">
        <StatBox value={members.length} label="الأعضاء" color="var(--gold)" onClick={() => navigate('/members')} />
        <StatBox value={tasks.length} label="إجمالي المهام" color="var(--text)" onClick={() => navigate('/tasks')} />
        <StatBox value={done} label="المهام المكتملة" green onClick={() => navigate('/tasks')} />
        <StatBox value={pending} label="المهام المعلقة" color="var(--gold)" onClick={() => navigate('/tasks')} />
        <StatBox value={over} label="المهام المتأخرة" color="var(--orange)" onClick={() => navigate('/tasks')} />
        <StatBox value={cancelled} label="المهام الملغية" color="var(--red)" onClick={() => navigate('/tasks')} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text)' }}>مهامي</h3>
          <button className="btn btn-ghost btn-xs" onClick={() => navigate('/my-tasks')}>عرض الكل</button>
        </div>
        {myTasks.length === 0
          ? <EmptyState icon="✅" message="لا توجد مهام مسندة لك" />
          : (
            <div className="mag-list">
              {myTasks.slice(0, 5).map(t => {
                const st = getStatus(t);
                const sm = STATUS_META[st] || STATUS_META.pending;
                const isLate = !t.done && t.deadline && new Date(t.deadline) < new Date();
                const isFinal = st === 'done' || st === 'published';
                const cardOpacity = st === 'cancelled' ? 0.4 : isFinal ? 0.65 : 1;
                return (
                  <div className="mag-card" key={t.id} style={{ opacity: cardOpacity }}>
                    <div className="mag-top">
                      {t.type && (
                        <div className={`mag-type-col mag-type-${t.type}`}>
                          <span className="mag-type-txt">{TYPE_LABEL[t.type]}</span>
                        </div>
                      )}
                      <div className="mag-content">
                        <div className={`mag-title${st === 'published' || st === 'cancelled' ? ' done' : ''}`}>
                          {t.title || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>بدون عنوان</span>}
                        </div>
                      </div>
                      <div className="mag-status-col" style={{ background: sm.bgColor }}>
                        <div className="mag-status-icon">{sm.icon}</div>
                        <div className="mag-status-txt" style={{ color: sm.color }}>{sm.label}</div>
                      </div>
                    </div>
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
                              <option value="done">مكتملة</option>
                              <option value="ready">جاهز للنشر</option>
                              <option value="published">تم النشر</option>
                              <option value="cancelled">ملغية</option>
                            </>
                          )}
                        </select>
                        <button className="btn btn-xs btn-ghost" onClick={() => setEditModal(t)}>تعديل</button>
                        <button className="btn btn-xs btn-ghost" style={{ color: 'var(--red)' }} onClick={() => handleDelete(t.id)}>حذف</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </div>

      <div className="two-col">
        <Card title="الأعضاء" action={<button className="btn btn-ghost btn-xs" onClick={() => navigate('/members')}>عرض الكل</button>}>
          {members.slice(0, 4).map(m => (
            <MemberRow key={m.id} member={m} tasks={tasks} onClick={() => navigate('/members/' + m.id)} />
          ))}
          {!members.length && <EmptyState icon="👥" message="لا يوجد أعضاء" />}
        </Card>
        <Card title="آخر المهام" action={<button className="btn btn-ghost btn-xs" onClick={() => navigate('/tasks')}>عرض الكل</button>}>
          {recent.length ? recent.map(t => <TaskMini key={t.id} task={t} members={members} />) : <EmptyState icon="📋" message="لا توجد مهام" />}
        </Card>
      </div>

      <TaskModal open={taskModal} onClose={() => setTaskModal(false)} onSuccess={load} />
      <DriveModal open={!!driveModal} onClose={() => setDriveModal(null)} onSubmit={handleDriveSubmit} taskTitle={driveModal?.taskTitle ?? ''} />
      <EditTaskModal open={!!editModal} task={editModal} onClose={() => setEditModal(null)} onSuccess={load} />
    </>
  );
}
