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
import { TaskRowV2 as TaskRow } from '../../components/ui/TaskRowV2';
import { Spinner } from '../../components/ui/Spinner';
import { getStatus } from '../../utils/status';
import { useAuthStore } from '../../stores/authStore';
import { useIdeasStore } from '../../stores/ideasStore';
import type { Task, TaskStatus } from '../../types';
import { IOSInstallBanner } from '../../components/ui/IOSInstallBanner';
import { TodayContent } from '../../components/ui/TodayContent';
import './AdminDashboard.css';

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

      <Card title="مهامي" action={<button className="btn btn-ghost btn-xs" onClick={() => navigate('/my-tasks')}>عرض الكل</button>}>
        {myTasks.length
          ? myTasks.slice(0, 5).map(t => (
              <TaskRow key={t.id} task={t} members={members} isAdmin ideas={ideas}
                readOnly={t.memberId !== firebaseUser?.uid && !!(Array.isArray(t.teamMemberIds) ? t.teamMemberIds : Object.values(t.teamMemberIds || {})).includes(firebaseUser?.uid ?? '')}
                onToggle={handleToggle}
                onChangeStatus={handleChangeStatus}
                onDelete={handleDelete}
                onEdit={setEditModal}
              />
            ))
          : <EmptyState icon="✅" message="لا توجد مهام مسندة لك" />
        }
      </Card>

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
