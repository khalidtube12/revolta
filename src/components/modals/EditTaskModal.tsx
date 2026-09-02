import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useTasksStore } from '../../stores/tasksStore';
import { useMembersStore } from '../../stores/membersStore';
import { useAuthStore } from '../../stores/authStore';
import type { Task } from '../../types';

interface EditTaskModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const TASK_TYPES = [
  { value: 'short',     label: 'شورت' },
  { value: 'video',     label: 'مقطع' },
  { value: 'writing',   label: 'كتابة' },
  { value: 'x_content',      label: 'محتوى X' },
  { value: 'podcast',        label: 'بودكاست' },
  { value: 'event_coverage', label: 'تغطية حدث' },
];

export function EditTaskModal({ open, task, onClose, onSuccess }: EditTaskModalProps) {
  const { updateTask } = useTasksStore();
  const { members, loadMembers } = useMembersStore();
  const { profile, can } = useAuthStore();
  const [title, setTitle]             = useState('');
  const [desc, setDesc]               = useState('');
  const [deadline, setDeadline]       = useState('');
  const [priority, setPriority]       = useState('medium');
  const [type, setType]               = useState('short');
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [primaryMemberId, setPrimaryMemberId] = useState('');
  const [loading, setLoading]         = useState(false);

  const canManageTeam = !!profile?.isAdmin || can('addTaskOthers');
  const isTeamType = type === 'video' || type === 'podcast' || type === 'short' || type === 'event_coverage';

  useEffect(() => {
    if (open) loadMembers();
  }, [open, loadMembers]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDesc(task.desc || '');
      setDeadline(task.deadline || '');
      setPriority(task.priority || 'medium');
      setType(task.type || 'short');

      const existingTeam: string[] = task.teamMemberIds
        ? Array.isArray(task.teamMemberIds)
          ? task.teamMemberIds
          : Object.values(task.teamMemberIds)
        : [];
      const allIds = Array.from(new Set([task.memberId, ...existingTeam]));
      setTeamMemberIds(allIds);
      setPrimaryMemberId(task.memberId);
    }
  }, [task]);

  const toggleMember = (id: string) => {
    setTeamMemberIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (primaryMemberId === id && !next.includes(id)) {
        setPrimaryMemberId(next[0] ?? '');
      }
      return next;
    });
  };

  const canSave = !isTeamType || !canManageTeam || teamMemberIds.length > 0;

  const handleSave = async () => {
    if (!task) return;
    setLoading(true);
    try {
      const primary = primaryMemberId || teamMemberIds[0] || task.memberId;
      const rest = teamMemberIds.filter(x => x !== primary);

      await updateTask(task.id, {
        title: title.trim(),
        desc: desc.trim(),
        deadline,
        priority: priority as 'low' | 'medium' | 'high',
        type: type as Task['type'],
        ...(isTeamType && canManageTeam ? {
          memberId: primary,
          teamMemberIds: rest,
        } : {}),
      });
      onClose();
      onSuccess?.();
    } catch (e: unknown) {
      alert('خطأ: ' + (e instanceof Error ? e.message : e));
    }
    setLoading(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تعديل المهمة"
      footer={
        <>
          <button className="btn" disabled={loading || !canSave} onClick={handleSave}>
            {loading ? <div className="spinner" /> : 'حفظ'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        </>
      }
    >
      <div className="form-group">
        <label>عنوان المهمة</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className="form-group">
        <label>التفاصيل</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} />
      </div>
      <div className="form-group">
        <label>تاريخ النشر</label>
        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
      </div>
      <div className="form-group">
        <label>نوع المهمة</label>
        <select value={type} onChange={e => setType(e.target.value)}>
          {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>الأولوية</label>
        <select value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="low">منخفضة</option>
          <option value="medium">متوسطة</option>
          <option value="high">عالية</option>
        </select>
      </div>

      {isTeamType && canManageTeam && (
        <div className="form-group">
          <label>
            أعضاء التيم
            <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 11, marginRight: 6 }}>
              (عضو واحد على الأقل)
            </span>
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {members.map(m => {
              const selected = teamMemberIds.includes(m.id);
              const isPrimary = selected && primaryMemberId === m.id;
              return (
                <label
                  key={m.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    padding: '8px 10px',
                    background: isPrimary ? 'rgba(201,168,76,0.13)' : selected ? 'rgba(201,168,76,0.05)' : 'var(--dark)',
                    border: `1px solid ${isPrimary ? 'rgba(201,168,76,0.6)' : selected ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleMember(m.id)}
                    style={{ accentColor: 'var(--gold)', width: 15, height: 15, flexShrink: 0 }}
                  />
                  <div style={{
                    width: 28, height: 28,
                    background: m.color || 'var(--border2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {m.name.charAt(0)}
                  </div>
                  <span style={{ fontSize: 14 }}>{m.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginRight: 'auto' }}>{m.jobRole}</span>
                  {selected && (
                    <button
                      type="button"
                      onClick={e => { e.preventDefault(); setPrimaryMemberId(m.id); }}
                      style={{
                        fontSize: 11, padding: '2px 8px', border: 'none', cursor: 'pointer',
                        background: isPrimary ? 'var(--gold)' : 'var(--border2)',
                        color: isPrimary ? '#000' : 'var(--muted)',
                        fontWeight: isPrimary ? 700 : 400,
                        transition: 'all 0.15s', flexShrink: 0,
                      }}
                    >
                      {isPrimary ? '★ المسؤول' : '☆ مسؤول'}
                    </button>
                  )}
                </label>
              );
            })}
          </div>
          {teamMemberIds.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>
              ⚠ يجب اختيار عضو واحد على الأقل
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
