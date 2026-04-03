import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useMembersStore } from '../../stores/membersStore';
import { useTasksStore } from '../../stores/tasksStore';
import { useIdeasStore } from '../../stores/ideasStore';
import { updatePermissions } from '../../services/users.service';
import { Avatar } from '../../components/ui/Avatar';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { StatBox } from '../../components/ui/StatBox';
import { Card } from '../../components/ui/Card';
import { TaskRowV2 as TaskRow } from '../../components/ui/TaskRowV2';
import { EmptyState } from '../../components/ui/EmptyState';
import { TaskModal } from '../../components/modals/TaskModal';
import { DriveModal } from '../../components/modals/DriveModal';
import { EditTaskModal } from '../../components/modals/EditTaskModal';
import { Spinner } from '../../components/ui/Spinner';
import { getStatus } from '../../utils/status';
import type { Task, TaskStatus, UserPermissions } from '../../types';
import { DEFAULT_PERMISSIONS } from '../../types';

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile: currentProfile, can } = useAuthStore();
  const { members, loadMembers, changeRole, deleteMember } = useMembersStore();
  const { tasks, loadAllTasks, updateTask, deleteTask } = useTasksStore();
  const { ideas, loadIdeas } = useIdeasStore();
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState(false);
  const [driveModal, setDriveModal] = useState<{ taskId: string; status: TaskStatus; taskTitle: string } | null>(null);
  const [editModal, setEditModal] = useState<Task | null>(null);
  const [savingPerms, setSavingPerms] = useState(false);
  const isAdmin = !!currentProfile?.isAdmin;

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadMembers(), loadAllTasks(), loadIdeas()]);
    setLoading(false);
  }, [loadMembers, loadAllTasks, loadIdeas]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;

  const member = members.find(m => m.id === id);
  if (!member) return <EmptyState icon="❌" message="العضو غير موجود" />;

  const memberTasks = tasks.filter(t => {
    if (t.memberId === member.id) return true;
    const teamIds: string[] = Array.isArray(t.teamMemberIds)
      ? t.teamMemberIds
      : Object.values(t.teamMemberIds || {});
    return teamIds.includes(member.id);
  });
  const active = memberTasks.filter(t => getStatus(t) !== 'cancelled');
  const cancelled = memberTasks.length - active.length;
  const done = active.filter(t => t.done).length;
  const pending = active.length - done;
  const pct = active.length ? Math.round(done / active.length * 100) : 0;

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

  const handleDeleteMember = async () => {
    if (!confirm('حذف العضو وجميع مهامه؟')) return;
    await deleteMember(member.id);
    navigate('/members');
  };

  const handleTogglePerm = async (key: keyof UserPermissions) => {
    if (!isAdmin || member.isAdmin) return;
    setSavingPerms(true);
    const current = member.permissions ?? DEFAULT_PERMISSIONS;
    const updated = { ...current, [key]: !current[key] };
    await updatePermissions(member.id, updated);
    await load();
    setSavingPerms(false);
  };

  return (
    <>
      <button className="back-btn" onClick={() => navigate('/members')}>← رجوع</button>
      <div className="detail-hdr">
        <Avatar user={member} size={64} />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 900, fontSize: 26, letterSpacing: 1 }}>{member.name}</h2>
          <div style={{ color: 'var(--muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {(isAdmin || can('editMember')) ? (
              <select className="status-select" value={member.jobRole} onChange={e => changeRole(member.id, e.target.value).then(load).catch(console.error)} style={{ fontSize: 13 }}>
                {['صانع محتوى', 'كاتب', 'مصمم', 'ممنتج'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            ) : (
              <span>{member.jobRole}</span>
            )}
          </div>
        </div>
        <ProgressRing percentage={pct} />
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && <button className="btn btn-sm" onClick={() => setTaskModal(true)}>+ مهمة</button>}
          {(isAdmin || can('deleteMember')) && <button className="btn btn-sm btn-danger" onClick={handleDeleteMember}>حذف</button>}
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: `repeat(${cancelled ? 4 : 3}, 1fr)`, marginBottom: 24 }}>
        <StatBox value={memberTasks.length} label="إجمالي" />
        <StatBox value={done} label="مكتملة" green />
        <StatBox value={pending} label="معلقة" />
        {cancelled > 0 && <StatBox value={cancelled} label="ملغية" color="var(--red)" />}
      </div>

      <Card title={`مهام ${member.name}`}>
        {memberTasks.length
          ? memberTasks.map(t => (
              <TaskRow key={t.id} task={t} members={members} isAdmin={isAdmin} ideas={ideas}
                canDelete={can('deleteTask')}
                canEdit={can('editTask')}
                canSetIncomplete={can('setTaskIncomplete')}
                canChangeStatus={can('changeTaskStatus')}
                onToggle={handleToggle}
                onChangeStatus={handleChangeStatus}
                onDelete={(isAdmin || can('deleteTask')) ? handleDelete : undefined}
                onEdit={setEditModal} />
            ))
          : <EmptyState icon="📋" message="لا توجد مهام بعد" />
        }
      </Card>

      {isAdmin && !member.isAdmin && (
        <Card title="الصلاحيات">
          {savingPerms && <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>جاري الحفظ...</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {(Object.entries({
              viewMembers: 'عرض الأعضاء',
              viewAllTasks: 'عرض جميع المهام',
              addTaskSelf: 'إضافة مهمة لنفسه',
              addTaskOthers: 'إضافة مهمة للآخرين',
              deleteTask: 'حذف مهمة',
              editTask: 'تعديل مهمة',
              editMember: 'تعديل بيانات العضو',
              deleteMember: 'حذف عضو',
              setTaskComplete: 'تغيير الحالة → مكتملة',
              setTaskIncomplete: 'تغيير الحالة → غير مكتملة',
              changeTaskStatus: 'تغيير الحالة (جميع الحالات)',
              exportTasks: 'تصدير Excel',
              importTasks: 'استيراد Excel',
              managePolls: 'إدارة التصويتات',
            }) as [keyof UserPermissions, string][]).map(([key, label]) => {
              const perms = member.permissions ?? DEFAULT_PERMISSIONS;
              const active = perms[key] ?? DEFAULT_PERMISSIONS[key];
              return (
                <label key={key} style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  padding: '8px 10px',
                  background: active ? 'rgba(201,168,76,0.08)' : 'var(--dark)',
                  border: `1px solid ${active ? 'rgba(201,168,76,0.4)' : 'var(--border)'}`,
                  transition: 'all 0.15s',
                }}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => handleTogglePerm(key)}
                    style={{ accentColor: 'var(--gold)', width: 15, height: 15, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13 }}>{label}</span>
                </label>
              );
            })}
          </div>
        </Card>
      )}

      {isAdmin && <TaskModal open={taskModal} onClose={() => setTaskModal(false)} preMemberId={id} onSuccess={load} />}
      <DriveModal open={!!driveModal} onClose={() => setDriveModal(null)} onSubmit={handleDriveSubmit} taskTitle={driveModal?.taskTitle ?? ''} />
      <EditTaskModal open={!!editModal} task={editModal} onClose={() => setEditModal(null)} onSuccess={load} />
    </>
  );
}
