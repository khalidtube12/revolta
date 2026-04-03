import { useEffect, useState, useCallback } from 'react';
import { fetchPendingUsers } from '../../services/users.service';
import { useMembersStore } from '../../stores/membersStore';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { timeAgo } from '../../utils/date';
import type { User } from '../../types';

export function ApprovalsPage() {
  const { approveUser, rejectUser, loadPendingCount } = useMembersStore();
  const [pending, setPending] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const users = await fetchPendingUsers();
    setPending(users);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;

  const handleApprove = async (uid: string) => {
    await approveUser(uid);
    await loadPendingCount();
    load();
  };

  const handleReject = async (uid: string) => {
    if (!confirm('رفض وحذف هذا الطلب؟')) return;
    await rejectUser(uid);
    await loadPendingCount();
    load();
  };

  return (
    <>
      <div className="page-hdr">
        <div className="page-hdr-text">
          <h1>طلبات التسجيل</h1>
          <p>{pending.length} طلب معلق</p>
        </div>
      </div>
      <Card>
        {pending.length
          ? pending.map(u => (
              <div key={u.id} className="task-row">
                <div className="task-body">
                  <div className="task-title-txt">{u.name}</div>
                  <div className="task-meta">
                    <span className="badge badge-gold">{u.jobRole || 'عضو'}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{u.email}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(u.createdAt)}</span>
                  </div>
                </div>
                <div className="task-actions">
                  <button className="btn btn-xs" style={{ background: 'var(--green)' }} onClick={() => handleApprove(u.id)}>قبول</button>
                  <button className="btn btn-xs btn-danger" onClick={() => handleReject(u.id)}>رفض</button>
                </div>
              </div>
            ))
          : <EmptyState icon="📩" message="لا توجد طلبات تسجيل معلقة" />
        }
      </Card>
    </>
  );
}
