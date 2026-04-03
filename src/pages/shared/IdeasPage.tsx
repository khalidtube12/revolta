import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useMembersStore } from '../../stores/membersStore';
import { useTasksStore } from '../../stores/tasksStore';
import { useIdeasStore } from '../../stores/ideasStore';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { IdeaModal } from '../../components/modals/IdeaModal';
import { LinkTaskModal } from '../../components/modals/LinkTaskModal';
import { Spinner } from '../../components/ui/Spinner';
import { fetchAllTasks } from '../../services/tasks.service';
import type { Task } from '../../types';

export function IdeasPage() {
  const { profile, firebaseUser } = useAuthStore();
  const { members, loadMembers } = useMembersStore();
  const { tasks, loadAllTasks } = useTasksStore();
  const { ideas, loadIdeas, deleteIdea, claimIdea, unclaimIdea, assignIdea, linkIdeaToTask, markIdeasSeen, updateNewIdeasCount } = useIdeasStore();
  const [loading, setLoading] = useState(true);
  const [ideaModal, setIdeaModal] = useState(false);
  const [linkModal, setLinkModal] = useState<{ ideaId: string; userId: string; tasks: Task[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadMembers(), loadAllTasks(), loadIdeas()]);
    if (firebaseUser) {
      markIdeasSeen(firebaseUser.uid);
      updateNewIdeasCount(firebaseUser.uid);
    }
    setLoading(false);
  }, [loadMembers, loadAllTasks, loadIdeas, markIdeasSeen, updateNewIdeasCount, firebaseUser]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;

  const tryLinkIdea = async (ideaId: string, userId: string) => {
    const idea = ideas.find(i => i.id === ideaId);
    const allTasks = await fetchAllTasks();
    const pendingTasks = allTasks.filter(t => {
      if (t.memberId !== userId) return false;
      if (t.done === true) return false;
      const st = t.status || (t.done ? 'done' : 'pending');
      if (st !== 'pending') return false;
      if (idea?.type && t.type && t.type !== idea.type) return false;
      return true;
    });

    await assignIdea(ideaId, userId);

    if (pendingTasks.length === 0) {
      load();
    } else if (pendingTasks.length === 1) {
      await linkIdeaToTask(ideaId, pendingTasks[0].id);
      load();
    } else {
      setLinkModal({ ideaId, userId, tasks: pendingTasks });
    }
  };

  const handleLinkPick = async (taskId: string | null) => {
    if (taskId && linkModal) {
      await linkIdeaToTask(linkModal.ideaId, taskId);
    }
    setLinkModal(null);
    load();
  };

  const handleClaim = (ideaId: string) => {
    if (firebaseUser) tryLinkIdea(ideaId, firebaseUser.uid);
  };

  const handleUnclaim = async (ideaId: string) => {
    await unclaimIdea(ideaId);
    load();
  };

  const handleAssign = (ideaId: string, userId: string) => {
    if (!userId) return;
    tryLinkIdea(ideaId, userId);
  };

  const handleDeleteIdea = async (ideaId: string) => {
    if (!confirm('حذف الفكرة؟')) return;
    await deleteIdea(ideaId);
    load();
  };

  return (
    <>
      <div className="page-hdr">
        <div className="page-hdr-text">
          <h1>أفكار المقاطع</h1>
          <p>{ideas.length} فكرة</p>
        </div>
        <button className="btn" onClick={() => setIdeaModal(true)}>+ فكرة جديدة</button>
      </div>

      <Card>
        {ideas.length ? ideas.map(idea => {
          const owner = members.find(m => m.id === idea.ownerId);
          const creator = members.find(m => m.id === idea.createdBy);
          const linkedTask = idea.linkedTaskId ? tasks.find(t => t.id === idea.linkedTaskId) : null;
          const typeLabel = idea.type === 'short' ? 'شورت' : 'مقطع';

          return (
            <div key={idea.id} className="task-row">
              <div className="task-body">
                <div className="task-title-txt">{idea.text}</div>
                <div className="task-meta">
                  <span className={`badge ${idea.type === 'short' ? 'badge-gold' : 'badge-green'}`}>{typeLabel}</span>
                  {owner
                    ? <span className="badge badge-gray">{owner.name}</span>
                    : <span style={{ color: 'var(--muted)', fontSize: 12 }}>بدون صاحب</span>
                  }
                  {creator && <span style={{ fontSize: 11, color: 'var(--muted)' }}>بواسطة {creator.name}</span>}
                  {linkedTask && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>📋 {linkedTask.title}</span>}
                </div>
              </div>
              <div className="task-actions">
                {profile?.isAdmin && !idea.ownerId && (
                  <select className="status-select" defaultValue="" onChange={e => handleAssign(idea.id, e.target.value)}>
                    <option value="">إسناد لـ...</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                )}
                {!idea.ownerId && (
                  <button className="btn btn-xs" onClick={() => handleClaim(idea.id)}>إسناده لي</button>
                )}
                {idea.ownerId === firebaseUser?.uid && (
                  <button className="btn btn-xs btn-ghost" onClick={() => handleUnclaim(idea.id)}>عدم الإسناد</button>
                )}
                {idea.ownerId && idea.ownerId !== firebaseUser?.uid && profile?.isAdmin && (
                  <button className="btn btn-xs btn-ghost" onClick={() => handleUnclaim(idea.id)}>عدم الإسناد</button>
                )}
                {(profile?.isAdmin || idea.createdBy === firebaseUser?.uid) && (
                  <button className="btn btn-xs btn-danger" onClick={() => handleDeleteIdea(idea.id)}>حذف</button>
                )}
              </div>
            </div>
          );
        }) : <EmptyState icon="💡" message="لا توجد أفكار بعد. أضف أول فكرة!" />}
      </Card>

      <IdeaModal open={ideaModal} onClose={() => setIdeaModal(false)} onSuccess={load} />
      {linkModal && (
        <LinkTaskModal open={!!linkModal} onClose={() => setLinkModal(null)} tasks={linkModal.tasks} onPick={handleLinkPick} />
      )}
    </>
  );
}
