import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useAuthStore } from '../../stores/authStore';
import { useTasksStore } from '../../stores/tasksStore';
import { useMembersStore } from '../../stores/membersStore';
import { getDefaultPoints } from '../../services/points.service';


interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  preMemberId?: string | null;
  onSuccess?: () => void;
  forceBonus?: boolean;
}

export function TaskModal({ open, onClose, preMemberId, onSuccess, forceBonus }: TaskModalProps) {
  const { profile, firebaseUser, can } = useAuthStore();
  const canAddOthers = !forceBonus && (!!profile?.isAdmin || can('addTaskOthers'));
  const canManageTeam = !!profile?.isAdmin || can('addTaskOthers');
  const { addTask } = useTasksStore();
  const { members, loadMembers } = useMembersStore();
  const [memberId, setMemberId] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [deadline, setDeadline] = useState('');
  const [type, setType] = useState('short');
  const [priority, setPriority] = useState('medium');
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [primaryMemberId, setPrimaryMemberId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadMembers();
      setTitle('');
      setDesc('');
      setDeadline('');
      setType('short');
      setPriority('medium');
      setTeamMemberIds([]);
    }
  }, [open, loadMembers]);

  useEffect(() => {
    if (preMemberId) setMemberId(preMemberId);
    else if (members.length) setMemberId(members[0].id);
  }, [preMemberId, members]);

  useEffect(() => {
    setTeamMemberIds([]);
    setPrimaryMemberId('');
  }, [type]);

  const toggleTeamMember = (id: string) => {
    setTeamMemberIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      // if primary was deselected, reset to first remaining
      setPrimaryMemberId(p => {
        if (p === id) return next[0] ?? '';
        if (!p && next.length > 0) return next[0];
        return p;
      });
      return next;
    });
  };

  const isVideo = type === 'video';
  const isPodcast = type === 'podcast';
  const isShort = type === 'short';
  const isEventCoverage = type === 'event_coverage';
  const isTeamType = isVideo || isPodcast || isShort || isEventCoverage;
  const TASK_TYPES: { value: string; label: string }[] = [
    { value: 'short',          label: 'شورت' },
    { value: 'video',          label: 'مقطع' },
    { value: 'writing',        label: 'كتابة' },
    { value: 'x_content',      label: 'محتوى X' },
    { value: 'podcast',        label: 'بودكاست' },
    { value: 'design',         label: 'تصميم' },
    { value: 'event_coverage', label: 'تغطية حدث' },
  ];

  const canSubmit = isTeamType && canManageTeam ? teamMemberIds.length > 0 : true;

  const handleSave = async () => {
    setLoading(true);
    try {
      const deadlineFormatted = deadline ? new Date(deadline).toLocaleDateString('ar') : '';
      const notifyBody = 'تم إسناد مهمة جديدة إليك' + (deadline ? ' — تاريخ النشر: ' + deadlineFormatted : '');
      const notifyTitle = '📋 مهمة جديدة: ' + (title.trim() || '—');

      const taskType = type as 'short' | 'video' | 'writing' | 'x_content' | 'podcast' | 'design' | 'event_coverage';
      const autoPoints = getDefaultPoints(taskType);

      const isBonus = forceBonus || !canAddOthers;

      if (isTeamType && canManageTeam) {
        if (teamMemberIds.length === 0) { alert('يرجى اختيار عضو واحد على الأقل'); setLoading(false); return; }
        const primary = primaryMemberId || teamMemberIds[0];
        const rest = teamMemberIds.filter(x => x !== primary);
        await addTask(
          {
            memberId: primary,
            title: title.trim(),
            desc: desc.trim(),
            deadline,
            priority: priority as 'low' | 'medium' | 'high',
            type: taskType,
            done: false,
            createdAt: Date.now(),
            points: autoPoints,
            ...(rest.length > 0 ? { teamMemberIds: rest } : {}),
            ...(isBonus ? { isBonus: true, pointsApproved: false } : { isBonus: false }),
          },
          notifyTitle,
          notifyBody,
          rest,
        );
      } else {
        const targetMember = canAddOthers ? memberId : (firebaseUser?.uid ?? '');
        if (!targetMember) { setLoading(false); return; }
        await addTask(
          {
            memberId: targetMember,
            title: title.trim(),
            desc: desc.trim(),
            deadline,
            priority: priority as 'low' | 'medium' | 'high',
            type: taskType,
            done: false,
            createdAt: Date.now(),
            points: autoPoints,
            ...(isBonus ? { isBonus: true, pointsApproved: false } : { isBonus: false }),
          },
          notifyTitle,
          notifyBody,
        );
      }

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
      title={forceBonus ? 'مهمة بونص' : 'مهمة جديدة'}
      footer={
        <>
          <button className="btn" disabled={loading || !canSubmit} onClick={handleSave}>
            {loading ? <div className="spinner" /> : 'حفظ المهمة'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        </>
      }
    >
      {/* تسند لـ — فقط للأنواع غير الفريق */}
      {canAddOthers && !isTeamType && (
        <div className="form-group">
          <label>تسند لـ</label>
          <select value={memberId} onChange={e => setMemberId(e.target.value)}>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      )}

      <div className="form-group">
        <label>عنوان المهمة</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="اختياري" />
      </div>
      <div className="form-group">
        <label>التفاصيل</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="وصف المهمة..." />
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

      {/* أعضاء التيم — للشورت والمقطع والبودكاست */}
      {isTeamType && canManageTeam && (
        <div className="form-group">
          <label>
            أعضاء التيم
            <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 11, marginRight: 6 }}>
              (اختر عضو واحد على الأقل)
            </span>
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {members.map(m => {
              const selected = teamMemberIds.includes(m.id);
              const isPrimary = selected && (primaryMemberId === m.id || (!primaryMemberId && teamMemberIds[0] === m.id));
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
                  onChange={() => toggleTeamMember(m.id)}
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
            );})}
          </div>
          {teamMemberIds.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 6 }}>
              ✓ {teamMemberIds.length} عضو مختار
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
