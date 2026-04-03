import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useTasksStore } from '../../stores/tasksStore';
import { useIdeasStore } from '../../stores/ideasStore';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { StatBox } from '../../components/ui/StatBox';
import { Card } from '../../components/ui/Card';
import { TaskRowV2 as TaskRow } from '../../components/ui/TaskRowV2';
import { EmptyState } from '../../components/ui/EmptyState';
import { DriveModal } from '../../components/modals/DriveModal';
import { Spinner } from '../../components/ui/Spinner';
import { getStatus } from '../../utils/status';
import type { TaskStatus } from '../../types';
import { IOSInstallBanner } from '../../components/ui/IOSInstallBanner';
import { TodayContent } from '../../components/ui/TodayContent';

export function MemberHome() {
  const navigate = useNavigate();
  const { profile, firebaseUser } = useAuthStore();
  const { tasks, loadUserTasks, updateTask } = useTasksStore();
  const { ideas, loadIdeas } = useIdeasStore();
  const [loading, setLoading] = useState(true);
  const [driveModal, setDriveModal] = useState<{ taskId: string; status: TaskStatus } | null>(null);

  const load = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    await Promise.all([loadUserTasks(firebaseUser.uid), loadIdeas()]);
    setLoading(false);
  }, [firebaseUser, loadUserTasks, loadIdeas]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;

  const active = tasks.filter(t => getStatus(t) !== 'cancelled');
  const cancelled = tasks.length - active.length;
  const done = active.filter(t => t.done).length;
  const pending = active.length - done;
  const pct = active.length ? Math.round(done / active.length * 100) : 0;
  const over = active.filter(t => !t.done && t.deadline && new Date(t.deadline) < new Date()).length;

  const handleToggle = (taskId: string, wasResolved: boolean) => {
    if (wasResolved) {
      updateTask(taskId, { done: false, status: 'pending', driveLink: undefined }).then(load);
    } else {
      setDriveModal({ taskId, status: 'done' });
    }
  };

  const handleDriveSubmit = async (link: string) => {
    if (!driveModal) return;
    await updateTask(driveModal.taskId, { status: driveModal.status, done: true, driveLink: link });
    setDriveModal(null);
    load();
  };

  return (
    <>
      <IOSInstallBanner />
      <div className="detail-hdr" style={{ marginBottom: 32 }}>
        <ProgressRing percentage={pct} />
        <div>
          <h1 style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 900, fontSize: 28, letterSpacing: 1 }}>
            أهلاً، {profile?.name}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>لديك {pending} مهمة معلقة</p>
        </div>
      </div>

      <TodayContent />

      <div className="stats-grid">
        <StatBox value={tasks.length} label="مهامي" onClick={() => navigate('/my-tasks')} />
        <StatBox value={done} label="مكتملة" green onClick={() => navigate('/my-tasks')} />
        <StatBox value={pending} label="معلقة" onClick={() => navigate('/my-tasks')} />
        <StatBox value={over} label="متأخرة" color="var(--orange)" onClick={() => navigate('/my-tasks')} />
        {cancelled > 0 && <StatBox value={cancelled} label="ملغية" color="var(--red)" onClick={() => navigate('/my-tasks')} />}
      </div>

      <Card title="المهام المعلقة" action={<button className="btn btn-sm" onClick={() => navigate('/my-tasks')}>عرض الكل</button>}>
        {active.filter(t => !t.done).slice(0, 5).map(t => (
          <TaskRow key={t.id} task={t} ideas={ideas} onToggle={handleToggle} />
        ))}
        {!active.filter(t => !t.done).length && <EmptyState icon="✅" message="أحسنت! لا توجد مهام معلقة" />}
      </Card>

      <DriveModal open={!!driveModal} onClose={() => setDriveModal(null)} onSubmit={handleDriveSubmit} />
    </>
  );
}
