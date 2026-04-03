import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useMembersStore } from '../../stores/membersStore';
import { useTasksStore } from '../../stores/tasksStore';
import { Card } from '../../components/ui/Card';
import { MemberRow } from '../../components/ui/MemberRow';
import { EmptyState } from '../../components/ui/EmptyState';
import { MemberModal } from '../../components/modals/MemberModal';
import { Spinner } from '../../components/ui/Spinner';

export function MembersPage() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { members, loadMembers } = useMembersStore();
  const isAdmin = !!profile?.isAdmin;
  const { tasks, loadAllTasks } = useTasksStore();
  const [loading, setLoading] = useState(true);
  const [memberModal, setMemberModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadMembers(), loadAllTasks()]);
    setLoading(false);
  }, [loadMembers, loadAllTasks]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;

  return (
    <>
      <div className="page-hdr">
        <div className="page-hdr-text">
          <h1>الأعضاء</h1>
          <p>{members.length} عضو</p>
        </div>
        {isAdmin && <button className="btn" onClick={() => setMemberModal(true)}>+ عضو جديد</button>}
      </div>
      <Card>
        {members.length
          ? members.map(m => <MemberRow key={m.id} member={m} tasks={tasks} onClick={() => navigate('/members/' + m.id)} />)
          : <EmptyState icon="👥" message="لا يوجد أعضاء. أضف أول عضو!" />
        }
      </Card>
      {isAdmin && <MemberModal open={memberModal} onClose={() => setMemberModal(false)} onSuccess={load} />}
    </>
  );
}
